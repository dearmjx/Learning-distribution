-- Migration 002: Row Level Security (RLS) Policies & Realtime Setup
-- Enforces cross-student isolation, teacher oversight, append-only event integrity, and realtime streaming.

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_peer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_reviews ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is a teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE auth_user_id = auth.uid()
        AND role IN ('teacher', 'researcher', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get student_id of current auth user
CREATE OR REPLACE FUNCTION current_student_id()
RETURNS VARCHAR AS $$
DECLARE
    v_student_id VARCHAR;
BEGIN
    SELECT student_id INTO v_student_id FROM profiles
    WHERE auth_user_id = auth.uid();
    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles Policies
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id OR is_teacher());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Service role full access on profiles" ON profiles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 3. Submissions Policies
CREATE POLICY "Students can read own submissions" ON submissions
    FOR SELECT USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can insert own submissions" ON submissions
    FOR INSERT WITH CHECK (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can update own submissions" ON submissions
    FOR UPDATE USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Service role full access on submissions" ON submissions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 4. Revisions Policies
CREATE POLICY "Students can read own revisions" ON revisions
    FOR SELECT USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can insert own revisions" ON revisions
    FOR INSERT WITH CHECK (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Service role full access on revisions" ON revisions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 5. Learning Events Policies (Append-Only: strictly SELECT & INSERT)
CREATE POLICY "Students can read own learning events" ON learning_events
    FOR SELECT USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students and system can insert learning events" ON learning_events
    FOR INSERT WITH CHECK (student_id = current_student_id() OR is_teacher());

-- Prohibit UPDATE and DELETE on learning_events for client roles (strictly append-only)
CREATE POLICY "Service role full access on learning events" ON learning_events
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 6. Synthetic Peer Drafts Policies
CREATE POLICY "Anyone can read synthetic peer drafts" ON synthetic_peer_drafts
    FOR SELECT USING (true);

CREATE POLICY "Service role full access on synthetic drafts" ON synthetic_peer_drafts
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 7. Peer Reviews Policies
CREATE POLICY "Reviewers can read reviews they wrote" ON peer_reviews
    FOR SELECT USING (reviewer_student_id = current_student_id() OR author_student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can insert peer reviews" ON peer_reviews
    FOR INSERT WITH CHECK (reviewer_student_id = current_student_id() OR is_teacher());

CREATE POLICY "Service role full access on peer reviews" ON peer_reviews
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 8. Reflections Policies
CREATE POLICY "Students can read own reflections" ON reflections
    FOR SELECT USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can insert/update own reflections" ON reflections
    FOR INSERT WITH CHECK (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Students can update own reflections" ON reflections
    FOR UPDATE USING (student_id = current_student_id() OR is_teacher());

CREATE POLICY "Service role full access on reflections" ON reflections
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 9. Teacher Reviews Policies
CREATE POLICY "Teachers can manage teacher reviews" ON teacher_reviews
    FOR ALL USING (is_teacher() OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Students can view teacher reviews for own submissions" ON teacher_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.id = teacher_reviews.submission_id
            AND s.student_id = current_student_id()
        )
    );

-- 10. Enable Supabase Realtime for Learning Events & Submissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE learning_events;
        ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if publication doesn't exist in local mock environments
END $$;
