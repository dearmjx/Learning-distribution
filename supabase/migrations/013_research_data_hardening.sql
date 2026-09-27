-- LOS-015: Research-data hardening before the live E2E / pilot.
--   A8  Students cannot rewrite submissions (incl. the frozen Draft 1) or forge events.
--   B1  Consent is guardian/admin-managed and readable by the class teacher for export filtering.
--   D6  Drop legacy SECURITY DEFINER helpers from 002 that lack a fixed search_path.

-- ---------------------------------------------------------------------------
-- A8. Submissions: no direct UPDATE from clients; workflow changes via RPC only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS submissions_scoped_update ON submissions;
REVOKE UPDATE ON submissions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION set_submission_workflow_state(p_submission_id UUID, p_workflow_state TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_row submissions%ROWTYPE;
BEGIN
    IF p_workflow_state NOT IN (
        'draft', 'submitted', 'ai_feedback_received', 'revising', 'peer_review',
        'revision', 'reflection', 'teacher_review', 'completed'
    ) THEN
        RAISE EXCEPTION 'invalid workflow state %', p_workflow_state USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_row FROM submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'submission not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        (v_row.profile_id = learning_profile_id() AND active_class_member(v_row.class_id, 'student'))
        OR active_class_member(v_row.class_id, 'teacher')
    ) THEN
        RAISE EXCEPTION 'not allowed to change this submission' USING ERRCODE = '42501';
    END IF;

    -- Only the workflow column changes; content and baseline fields are untouched.
    UPDATE submissions SET workflow_state = p_workflow_state, updated_at = NOW() WHERE id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION set_submission_workflow_state(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_submission_workflow_state(UUID, TEXT) TO authenticated;

-- Defence in depth (also against service-role mistakes): research content of a
-- submission is immutable once written. Only workflow_state/updated_at may change.
CREATE OR REPLACE FUNCTION prevent_submission_content_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.activity_id IS DISTINCT FROM OLD.activity_id
       OR NEW.draft1_frozen IS DISTINCT FROM OLD.draft1_frozen
       OR NEW.draft1_frozen_at IS DISTINCT FROM OLD.draft1_frozen_at
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
       OR NEW.response_time_seconds IS DISTINCT FROM OLD.response_time_seconds
       OR NEW.hint_cost IS DISTINCT FROM OLD.hint_cost
       OR NEW.feedback_decisions IS DISTINCT FROM OLD.feedback_decisions THEN
        RAISE EXCEPTION 'submission research content is immutable; create a new version instead' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_content_immutable ON submissions;
CREATE TRIGGER submissions_content_immutable
    BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION prevent_submission_content_change();

-- ---------------------------------------------------------------------------
-- A8. Learning events: students may insert only student-originated event types
-- about themselves; teachers only teacher event types about themselves.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS events_scoped_insert ON learning_events;
CREATE POLICY events_scoped_insert ON learning_events FOR INSERT WITH CHECK (
    (
        profile_id = learning_profile_id()
        AND student_id = learning_external_id()
        AND active_class_member(class_id, 'student')
        AND event_type IN (
            'activity_selected', 'context_viewed', 'student_submitted', 'draft_1_frozen',
            'ai_feedback_received', 'hint_requested', 'student_revised', 'peer_review_assigned',
            'peer_review_submitted', 'feedback_evaluated', 'reflection_completed',
            'learning_phase_changed', 'authorship_indicator_created'
        )
    )
    OR (
        active_class_member(class_id, 'teacher')
        AND (
            (event_type = 'teacher_observation_recorded' AND student_id = learning_external_id())
            OR event_type IN ('teacher_reviewed', 'learning_phase_changed')
        )
    )
);

-- ---------------------------------------------------------------------------
-- B1. Consent: students cannot grant/alter their own consent (minors need a
-- guardian under PDPA). Rows are written by an admin/service role only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS consent_self_insert ON consent_records;
DROP POLICY IF EXISTS consent_self_update ON consent_records;
REVOKE INSERT, UPDATE, DELETE ON consent_records FROM anon, authenticated;

-- Teacher-callable: external student IDs in a class with CURRENT granted consent.
CREATE OR REPLACE FUNCTION consented_student_ids(p_class_id TEXT, p_purpose TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT active_class_member(p_class_id, 'teacher') THEN
        RAISE EXCEPTION 'only a teacher of this class can read consent status' USING ERRCODE = '42501';
    END IF;
    RETURN COALESCE((
        SELECT ARRAY_AGG(DISTINCT lp.external_id)
        FROM memberships m
        JOIN learning_profiles lp ON lp.id = m.profile_id
        WHERE m.class_id = p_class_id
          AND m.role = 'student'
          AND m.status = 'active'
          AND EXISTS (
              SELECT 1 FROM consent_records c
              WHERE c.profile_id = m.profile_id
                AND c.purpose = p_purpose
                AND c.status = 'granted'
                AND (c.expires_at IS NULL OR c.expires_at > NOW())
                AND c.withdrawn_at IS NULL
                -- the latest record for this purpose decides
                AND c.granted_at = (
                    SELECT MAX(c2.granted_at) FROM consent_records c2
                    WHERE c2.profile_id = c.profile_id AND c2.purpose = c.purpose
                )
          )
    ), ARRAY[]::TEXT[]);
END;
$$;

REVOKE ALL ON FUNCTION consented_student_ids(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consented_student_ids(TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- D6. Legacy helpers from 002 (superseded by 006, no fixed search_path).
-- Pinned rather than dropped/revoked, so any surviving legacy policy keeps working.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regprocedure('is_teacher()') IS NOT NULL THEN
        ALTER FUNCTION is_teacher() SET search_path = public, pg_temp;
    END IF;
    IF to_regprocedure('current_student_id()') IS NOT NULL THEN
        ALTER FUNCTION current_student_id() SET search_path = public, pg_temp;
    END IF;
END $$;
