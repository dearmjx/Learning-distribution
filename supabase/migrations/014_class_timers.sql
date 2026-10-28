-- Teacher-controlled class countdown. One row per class; students read it, only teachers of
-- that class write it. The app computes time left from ends_at (running) or remaining_seconds
-- (paused/stopped) using the server clock, so every device shows the same countdown.

CREATE TABLE IF NOT EXISTS class_timers (
    class_id TEXT PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 80),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 0 AND 14400),
    ends_at TIMESTAMPTZ,
    remaining_seconds INTEGER NOT NULL CHECK (remaining_seconds BETWEEN 0 AND 14400),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT NOT NULL
);

ALTER TABLE class_timers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_timers_member_select ON class_timers;
DROP POLICY IF EXISTS class_timers_teacher_insert ON class_timers;
DROP POLICY IF EXISTS class_timers_teacher_update ON class_timers;

CREATE POLICY class_timers_member_select ON class_timers
    FOR SELECT
    USING (active_class_member(class_id));

CREATE POLICY class_timers_teacher_insert ON class_timers
    FOR INSERT
    WITH CHECK (
        active_class_member(class_id, 'teacher')
        AND updated_by = learning_external_id()
    );

CREATE POLICY class_timers_teacher_update ON class_timers
    FOR UPDATE
    USING (active_class_member(class_id, 'teacher'))
    WITH CHECK (
        active_class_member(class_id, 'teacher')
        AND updated_by = learning_external_id()
    );
