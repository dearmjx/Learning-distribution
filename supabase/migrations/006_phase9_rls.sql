-- Phase 9: authenticated, class-scoped RLS.
-- All authorization decisions use auth.uid() -> learning_profiles -> memberships.
-- Request-body student/class/teacher IDs are never authorization inputs.

CREATE OR REPLACE FUNCTION learning_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM learning_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION learning_external_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT external_id FROM learning_profiles WHERE id = learning_profile_id();
$$;

CREATE OR REPLACE FUNCTION learning_profile_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM learning_profiles WHERE id = learning_profile_id();
$$;

CREATE OR REPLACE FUNCTION active_class_member(p_class_id TEXT, p_role TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM memberships m
        WHERE m.profile_id = learning_profile_id()
          AND m.class_id = p_class_id
          AND m.status = 'active'
          AND (p_role IS NULL OR m.role = p_role)
          AND (m.starts_at <= NOW())
          AND (m.ends_at IS NULL OR m.ends_at > NOW())
    );
$$;

CREATE OR REPLACE FUNCTION active_activity_assignment(p_class_id TEXT, p_activity_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT active_class_member(p_class_id)
       AND EXISTS (
           SELECT 1 FROM activity_assignments a
           WHERE a.class_id = p_class_id
             AND a.activity_id = p_activity_id
             AND a.enabled = TRUE
       );
$$;

CREATE OR REPLACE FUNCTION can_access_submission(p_submission_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = p_submission_id
          AND (
              (s.profile_id = learning_profile_id() AND active_class_member(s.class_id, 'student'))
              OR active_class_member(s.class_id, 'teacher')
          )
    );
$$;

-- Remove the broad prototype policies before installing class-scoped policies.
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Students can read own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON submissions;
DROP POLICY IF EXISTS "Service role full access on submissions" ON submissions;
DROP POLICY IF EXISTS "Students can read own revisions" ON revisions;
DROP POLICY IF EXISTS "Students can insert own revisions" ON revisions;
DROP POLICY IF EXISTS "Service role full access on revisions" ON revisions;
DROP POLICY IF EXISTS "Students can read own learning events" ON learning_events;
DROP POLICY IF EXISTS "Students and system can insert learning events" ON learning_events;
DROP POLICY IF EXISTS "Service role full access on learning events" ON learning_events;
DROP POLICY IF EXISTS "Anyone can read synthetic peer drafts" ON synthetic_peer_drafts;
DROP POLICY IF EXISTS "Service role full access on synthetic drafts" ON synthetic_peer_drafts;
DROP POLICY IF EXISTS "Reviewers can read reviews they wrote" ON peer_reviews;
DROP POLICY IF EXISTS "Students can insert peer reviews" ON peer_reviews;
DROP POLICY IF EXISTS "Service role full access on peer reviews" ON peer_reviews;
DROP POLICY IF EXISTS "Students can read own reflections" ON reflections;
DROP POLICY IF EXISTS "Students can insert/update own reflections" ON reflections;
DROP POLICY IF EXISTS "Students can update own reflections" ON reflections;
DROP POLICY IF EXISTS "Service role full access on reflections" ON reflections;
DROP POLICY IF EXISTS "Teachers can manage teacher reviews" ON teacher_reviews;
DROP POLICY IF EXISTS "Students can view teacher reviews for own submissions" ON teacher_reviews;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_peer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_identity_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY schools_member_select ON schools FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.school_id = schools.id AND active_class_member((SELECT id FROM classes WHERE course_id = c.id LIMIT 1)))
);
CREATE POLICY courses_member_select ON courses FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.course_id = courses.id AND active_class_member(c.id))
);
CREATE POLICY classes_member_select ON classes FOR SELECT USING (active_class_member(id));
CREATE POLICY profiles_self_select ON learning_profiles FOR SELECT USING (id = learning_profile_id());
CREATE POLICY memberships_scoped_select ON memberships FOR SELECT USING (
    profile_id = learning_profile_id() OR active_class_member(class_id, 'teacher')
);
CREATE POLICY activities_assigned_select ON activities FOR SELECT USING (
    EXISTS (SELECT 1 FROM activity_assignments aa WHERE aa.activity_id = activities.id AND active_class_member(aa.class_id) AND aa.enabled)
);
CREATE POLICY assignments_member_select ON activity_assignments FOR SELECT USING (active_class_member(class_id));

CREATE POLICY submissions_scoped_select ON submissions FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student'))
    OR active_class_member(class_id, 'teacher')
);
CREATE POLICY submissions_scoped_insert ON submissions FOR INSERT WITH CHECK (
    profile_id = learning_profile_id()
    AND student_id = learning_external_id()
    AND active_class_member(class_id, 'student')
    AND active_activity_assignment(class_id, activity_id)
);
CREATE POLICY submissions_scoped_update ON submissions FOR UPDATE
USING ((profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher'))
WITH CHECK ((profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher'));

CREATE POLICY revisions_scoped_select ON revisions FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student'))
    OR active_class_member(class_id, 'teacher')
);
CREATE POLICY revisions_scoped_insert ON revisions FOR INSERT WITH CHECK (
    profile_id = learning_profile_id()
    AND student_id = learning_external_id()
    AND active_class_member(class_id, 'student')
    AND can_access_submission(submission_id)
);

CREATE POLICY ai_sessions_scoped_select ON ai_sessions FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
CREATE POLICY ai_sessions_scoped_insert ON ai_sessions FOR INSERT WITH CHECK (
    profile_id = learning_profile_id() AND student_id = learning_external_id() AND active_class_member(class_id, 'student')
);
CREATE POLICY ai_interactions_scoped_select ON ai_interactions FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
CREATE POLICY ai_interactions_scoped_insert ON ai_interactions FOR INSERT WITH CHECK (
    profile_id = learning_profile_id() AND student_id = learning_external_id() AND active_class_member(class_id, 'student')
);

CREATE POLICY hints_scoped_select ON hints FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
CREATE POLICY hints_scoped_insert ON hints FOR INSERT WITH CHECK (
    profile_id = learning_profile_id() AND student_id = learning_external_id() AND active_activity_assignment(class_id, activity_id)
);

CREATE POLICY synthetic_assigned_select ON synthetic_peer_drafts FOR SELECT USING (
    EXISTS (SELECT 1 FROM activity_assignments aa WHERE aa.activity_id = synthetic_peer_drafts.activity_id AND active_class_member(aa.class_id) AND aa.enabled)
);

CREATE POLICY peer_reviews_reviewer_select ON peer_reviews FOR SELECT USING (
    (reviewer_profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
-- Authenticated clients cannot insert peer reviews directly. The RPC below
-- derives reviewer and author identity from auth.uid() and the assignment.
CREATE POLICY peer_reviews_teacher_select ON peer_reviews FOR SELECT USING (active_class_member(class_id, 'teacher'));

CREATE POLICY reflections_scoped_select ON reflections FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
CREATE POLICY reflections_scoped_insert ON reflections FOR INSERT WITH CHECK (
    profile_id = learning_profile_id() AND student_id = learning_external_id() AND active_activity_assignment(class_id, activity_id)
);
CREATE POLICY reflections_scoped_update ON reflections FOR UPDATE
USING (profile_id = learning_profile_id() AND active_class_member(class_id, 'student'))
WITH CHECK (profile_id = learning_profile_id() AND student_id = learning_external_id());

CREATE POLICY teacher_reviews_teacher_write ON teacher_reviews FOR ALL
USING (teacher_profile_id = learning_profile_id() AND active_class_member(class_id, 'teacher'))
WITH CHECK (teacher_profile_id = learning_profile_id() AND active_class_member(class_id, 'teacher'));
CREATE POLICY teacher_reviews_student_select ON teacher_reviews FOR SELECT USING (
    can_access_submission(submission_id) AND EXISTS (
        SELECT 1 FROM submissions s WHERE s.id = teacher_reviews.submission_id AND s.profile_id = learning_profile_id()
    )
);

CREATE POLICY events_scoped_select ON learning_events FOR SELECT USING (
    (profile_id = learning_profile_id() AND active_class_member(class_id, 'student')) OR active_class_member(class_id, 'teacher')
);
CREATE POLICY events_scoped_insert ON learning_events FOR INSERT WITH CHECK (
    (
        profile_id = learning_profile_id()
        AND student_id = learning_external_id()
        AND active_class_member(class_id, 'student')
    )
    OR active_class_member(class_id, 'teacher')
);
-- No UPDATE or DELETE policy is created: learning events are append-only.

CREATE POLICY consent_self_select ON consent_records FOR SELECT USING (profile_id = learning_profile_id());
CREATE POLICY consent_self_insert ON consent_records FOR INSERT WITH CHECK (profile_id = learning_profile_id());
CREATE POLICY consent_self_update ON consent_records FOR UPDATE USING (profile_id = learning_profile_id()) WITH CHECK (profile_id = learning_profile_id());

CREATE POLICY research_identity_researcher_select ON research_identity_mapping FOR SELECT USING (
    profile_id = learning_profile_id() AND learning_profile_role() = 'researcher'
);

REVOKE INSERT, UPDATE, DELETE ON peer_reviews FROM anon, authenticated;
REVOKE UPDATE, DELETE ON learning_events FROM anon, authenticated;
REVOKE ALL ON research_identity_mapping FROM anon, authenticated;
GRANT SELECT ON research_identity_mapping TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE learning_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE submissions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
END $$;
