-- Phase 11 (LOS-004): Durable teacher PAOR observation notes with teacher/class-scoped RLS.
-- Ensures each teacher can only read and write their own observation notes within an
-- actively assigned class.

CREATE TABLE IF NOT EXISTS teacher_observation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    teacher_profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    cycle SMALLINT NOT NULL CHECK (cycle IN (1, 2)),
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    phase TEXT NOT NULL CHECK (phase IN ('plan', 'act', 'observe', 'reflect')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_observation_notes_profile_class_idx
    ON teacher_observation_notes(teacher_profile_id, class_id, cycle, activity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS teacher_observation_notes_teacher_class_idx
    ON teacher_observation_notes(teacher_id, class_id, cycle, activity_id, created_at DESC);

ALTER TABLE teacher_observation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_observation_notes_teacher_scoped ON teacher_observation_notes;

CREATE POLICY teacher_observation_notes_teacher_scoped ON teacher_observation_notes
    FOR ALL
    USING (
        teacher_profile_id = learning_profile_id()
        AND teacher_id = learning_external_id()
        AND active_class_member(class_id, 'teacher')
    )
    WITH CHECK (
        teacher_profile_id = learning_profile_id()
        AND teacher_id = learning_external_id()
        AND active_class_member(class_id, 'teacher')
    );
