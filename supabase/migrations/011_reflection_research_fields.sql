-- LOS-014 (A6): Persist the Phase 7 self-evaluation exactly as the student gave it.
-- Previously confidence_score was forced to 3 and the self-ratings lived only in
-- event payloads. Missing values must stay NULL (never imputed).

ALTER TABLE reflections
    ALTER COLUMN confidence_score DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS analytical_thinking_score SMALLINT CHECK (analytical_thinking_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS ai_literacy_score SMALLINT CHECK (ai_literacy_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS reflection_text TEXT,
    ADD COLUMN IF NOT EXISTS key_learnings JSONB,
    ADD COLUMN IF NOT EXISTS confidence_rating TEXT CHECK (confidence_rating IN ('low', 'medium', 'high'));
