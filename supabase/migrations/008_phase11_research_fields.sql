-- Phase 11 (LOS-003): Persist CAR research fields in Supabase.
-- Adds PAOR cycle, Draft-1 freeze metadata, and student feedback decisions to
-- submissions and revisions, and separates CER rubric_scores from 4-dimension
-- synthetic_scores plus cycle on teacher_reviews (D-012).
-- Class-scoped RLS policies from migrations 006/007 remain in effect on all tables.

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS chapter_id TEXT,
    ADD COLUMN IF NOT EXISTS cycle SMALLINT CHECK (cycle IN (1, 2));

UPDATE activities SET chapter_id = 'food-web', cycle = 1 WHERE id = 'ecosystem-food-web-01' AND cycle IS NULL;
UPDATE activities SET chapter_id = 'energy-flow', cycle = 2 WHERE id = 'ecosystem-energy-flow-01' AND cycle IS NULL;

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS cycle SMALLINT CHECK (cycle IN (1, 2)),
    ADD COLUMN IF NOT EXISTS draft1_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS draft1_frozen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS feedback_decisions JSONB;

ALTER TABLE revisions
    ADD COLUMN IF NOT EXISTS cycle SMALLINT CHECK (cycle IN (1, 2)),
    ADD COLUMN IF NOT EXISTS draft1_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS draft1_frozen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS feedback_decisions JSONB;

ALTER TABLE teacher_reviews
    ALTER COLUMN scores SET DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS rubric_scores JSONB,
    ADD COLUMN IF NOT EXISTS synthetic_scores JSONB,
    ADD COLUMN IF NOT EXISTS cycle SMALLINT CHECK (cycle IN (1, 2));

ALTER TABLE learning_events
    ADD COLUMN IF NOT EXISTS cycle SMALLINT CHECK (cycle IN (1, 2));

CREATE INDEX IF NOT EXISTS submissions_class_cycle_idx ON submissions(class_id, cycle);
CREATE INDEX IF NOT EXISTS revisions_submission_cycle_idx ON revisions(submission_id, cycle);
CREATE INDEX IF NOT EXISTS teacher_reviews_class_cycle_idx ON teacher_reviews(class_id, cycle);
