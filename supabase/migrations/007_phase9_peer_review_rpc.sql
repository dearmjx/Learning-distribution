-- Phase 9: peer-review assignment and submission RPCs.
-- Reviewer identity is derived from auth.uid(); caller-supplied reviewer and
-- author IDs are not accepted as authorization inputs.

DROP FUNCTION IF EXISTS get_assigned_peer_review_draft(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_assigned_peer_review_draft(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_assigned_peer_review_draft(p_activity_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := learning_profile_id();
    v_class_id TEXT;
    v_reviewed_ids TEXT[];
    v_real_sub RECORD;
    v_synthetic RECORD;
    v_alias_index INTEGER;
BEGIN
    IF v_profile_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.profile_id = v_profile_id AND m.role = 'student' AND m.status = 'active'
    ) THEN
        RAISE EXCEPTION 'peer review requires an active student membership';
    END IF;

    SELECT aa.class_id INTO v_class_id
    FROM activity_assignments aa
    JOIN memberships m ON m.class_id = aa.class_id
    WHERE aa.activity_id = p_activity_id
      AND aa.enabled = TRUE
      AND aa.peer_review_enabled = TRUE
      AND m.profile_id = v_profile_id
      AND m.role = 'student'
      AND m.status = 'active'
    ORDER BY aa.assigned_at ASC
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'activity is not peer-review enabled for this class';
    END IF;

    SELECT ARRAY_AGG(COALESCE(peer_review_submission_id, submission_id))
    INTO v_reviewed_ids
    FROM peer_reviews
    WHERE reviewer_profile_id = v_profile_id
      AND class_id = v_class_id
      AND activity_id = p_activity_id;
    v_reviewed_ids := COALESCE(v_reviewed_ids, ARRAY[]::TEXT[]);

    SELECT s.id, s.activity_id, s.content, s.investigation_data, s.submitted_at
    INTO v_real_sub
    FROM submissions s
    WHERE s.class_id = v_class_id
      AND s.activity_id = p_activity_id
      AND s.profile_id IS NOT NULL
      AND s.profile_id <> v_profile_id
      AND s.workflow_state <> 'draft'
      AND NOT (s.id::TEXT = ANY(v_reviewed_ids))
    ORDER BY s.submitted_at ASC
    LIMIT 1;

    IF v_real_sub.id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_alias_index
        FROM submissions s
        WHERE s.class_id = v_class_id AND s.activity_id = p_activity_id AND s.id <= v_real_sub.id;
        RETURN jsonb_build_object(
            'id', 'real-peer-draft-' || v_real_sub.id::TEXT,
            'submissionId', v_real_sub.id::TEXT,
            'authorStudentId', 'anonymous-classmate',
            'activityId', v_real_sub.activity_id,
            'anonymousAuthorAlias', 'เพื่อนร่วมชั้นนิรนาม #' || GREATEST(COALESCE(v_alias_index, 1), 1)::TEXT,
            'content', v_real_sub.content,
            'investigationData', v_real_sub.investigation_data,
            'submittedAt', v_real_sub.submitted_at,
            'isSynthetic', FALSE
        );
    END IF;

    SELECT syn.id, syn.activity_id, syn.anonymous_author_alias, syn.content, syn.investigation_data, syn.misconception_tag, syn.created_at
    INTO v_synthetic
    FROM synthetic_peer_drafts syn
    WHERE syn.activity_id = p_activity_id
      AND NOT (syn.id::TEXT = ANY(v_reviewed_ids))
    ORDER BY syn.created_at ASC
    LIMIT 1;

    IF v_synthetic.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_synthetic.id::TEXT,
            'submissionId', v_synthetic.id::TEXT,
            'authorStudentId', 'synthetic-peer',
            'activityId', v_synthetic.activity_id,
            'anonymousAuthorAlias', v_synthetic.anonymous_author_alias,
            'content', v_synthetic.content,
            'investigationData', v_synthetic.investigation_data,
            'misconceptionTag', v_synthetic.misconception_tag,
            'submittedAt', v_synthetic.created_at,
            'isSynthetic', TRUE
        );
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION submit_peer_review(
    p_submission_id TEXT,
    p_peer_review_submission_id TEXT,
    p_activity_id TEXT,
    p_scores JSONB,
    p_strengths TEXT,
    p_suggestions TEXT,
    p_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_reviewer_profile UUID := learning_profile_id();
    v_reviewer_external TEXT := learning_external_id();
    v_class_id TEXT;
    v_author_profile UUID;
    v_author_external TEXT;
    v_review_id UUID;
    v_is_real BOOLEAN := FALSE;
BEGIN
    IF v_reviewer_profile IS NULL OR NOT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.profile_id = v_reviewer_profile AND m.role = 'student' AND m.status = 'active'
    ) THEN
        RAISE EXCEPTION 'peer review requires an active student membership';
    END IF;

    SELECT aa.class_id INTO v_class_id
    FROM activity_assignments aa
    JOIN memberships m ON m.class_id = aa.class_id
    WHERE aa.activity_id = p_activity_id
      AND aa.enabled = TRUE
      AND aa.peer_review_enabled = TRUE
      AND m.profile_id = v_reviewer_profile
      AND m.role = 'student'
      AND m.status = 'active'
    LIMIT 1;
    IF v_class_id IS NULL THEN RAISE EXCEPTION 'activity is not peer-review enabled for this class'; END IF;

    BEGIN
        SELECT s.profile_id, lp.external_id INTO v_author_profile, v_author_external
        FROM submissions s
        JOIN learning_profiles lp ON lp.id = s.profile_id
        WHERE s.id::TEXT = p_submission_id
          AND s.class_id = v_class_id
          AND s.activity_id = p_activity_id
          AND s.profile_id <> v_reviewer_profile
          AND s.workflow_state <> 'draft';
        v_is_real := v_author_profile IS NOT NULL;
    EXCEPTION WHEN invalid_text_representation THEN
        v_is_real := FALSE;
    END;

    IF NOT v_is_real THEN
        IF NOT EXISTS (
            SELECT 1 FROM synthetic_peer_drafts syn
            WHERE syn.id::TEXT = p_peer_review_submission_id AND syn.activity_id = p_activity_id
        ) THEN
            RAISE EXCEPTION 'assigned peer draft is not valid for this activity';
        END IF;
        v_author_external := 'synthetic-peer';
    END IF;

    IF EXISTS (
        SELECT 1 FROM peer_reviews pr
        WHERE pr.reviewer_profile_id = v_reviewer_profile
          AND pr.class_id = v_class_id
          AND pr.activity_id = p_activity_id
          AND pr.submission_id = p_submission_id
    ) THEN
        SELECT pr.id INTO v_review_id
        FROM peer_reviews pr
        WHERE pr.reviewer_profile_id = v_reviewer_profile AND pr.submission_id = p_submission_id;
    ELSE
        INSERT INTO peer_reviews (
            submission_id, peer_review_submission_id, reviewer_student_id, author_student_id,
            reviewer_profile_id, author_profile_id, class_id, activity_id,
            scores, strengths, suggestions, feedback
        ) VALUES (
            p_submission_id, p_peer_review_submission_id, v_reviewer_external, COALESCE(v_author_external, 'synthetic-peer'),
            v_reviewer_profile, v_author_profile, v_class_id, p_activity_id,
            p_scores, p_strengths, p_suggestions, p_feedback
        ) RETURNING id INTO v_review_id;
    END IF;

    RETURN jsonb_build_object(
        'id', v_review_id::TEXT,
        'submissionId', p_submission_id,
        'peerReviewSubmissionId', p_peer_review_submission_id,
        'reviewerStudentId', v_reviewer_external,
        'authorStudentId', 'anonymous-classmate',
        'activityId', p_activity_id,
        'scores', p_scores,
        'strengths', p_strengths,
        'suggestions', p_suggestions,
        'feedback', p_feedback,
        'createdAt', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION get_assigned_peer_review_draft(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_assigned_peer_review_draft(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION submit_peer_review(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_peer_review(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;
