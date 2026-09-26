-- Phase 11 (LOS-005): Allow teachers to read learning_profiles of active members
-- in classes where the teacher holds an active teacher membership, so
-- /api/teacher/roster can build the class roster from real memberships under RLS.

CREATE OR REPLACE FUNCTION teacher_can_view_class_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM memberships m
        WHERE m.profile_id = p_profile_id
          AND m.status = 'active'
          AND (m.starts_at <= NOW())
          AND (m.ends_at IS NULL OR m.ends_at > NOW())
          AND active_class_member(m.class_id, 'teacher')
    );
$$;

DROP POLICY IF EXISTS profiles_teacher_class_select ON learning_profiles;

CREATE POLICY profiles_teacher_class_select ON learning_profiles
    FOR SELECT
    USING (teacher_can_view_class_profile(id));
