-- Migration 001: Initial Core Schema for Learning OS
-- Enables UUID generation and creates core 7-phase ADI tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (Students, Teachers, Researchers)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is linked
    student_id VARCHAR(128) NOT NULL, -- School student ID or anonymous identifier
    email VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'researcher', 'system', 'admin')),
    school_id VARCHAR(128) NOT NULL DEFAULT 'school-demo-01',
    course_id VARCHAR(128) NOT NULL DEFAULT 'bio-m4-ecosystem',
    class_id VARCHAR(128) NOT NULL DEFAULT 'class-m4-1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_class_school ON profiles(school_id, class_id);

-- 2. Submissions Table (CER Student Submissions)
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(128) NOT NULL,
    activity_id VARCHAR(128) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    content JSONB NOT NULL, -- { claim: text, evidence: text, reasoning: text }
    investigation_data JSONB, -- { question, variables, procedure, observations, dataTable, notes }
    hint_depth VARCHAR(32) NOT NULL DEFAULT 'none' CHECK (hint_depth IN ('none', 'shallow', 'concept', 'deep')),
    hint_cost INT NOT NULL DEFAULT 0,
    response_time_seconds INT NOT NULL DEFAULT 0,
    workflow_state VARCHAR(64) NOT NULL DEFAULT 'submitted',
    previous_draft_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_student_act ON submissions(student_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_state ON submissions(workflow_state);

-- 3. Revisions Table (Historical Snapshots of CER Drafts)
CREATE TABLE IF NOT EXISTS revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    student_id VARCHAR(128) NOT NULL,
    activity_id VARCHAR(128) NOT NULL,
    version INT NOT NULL,
    content JSONB NOT NULL,
    investigation_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisions_submission ON revisions(submission_id);

-- 4. Learning Events Table (Append-Only Event Store & Timeline)
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_version INT NOT NULL DEFAULT 1,
    student_id VARCHAR(128) NOT NULL,
    activity_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    context JSONB NOT NULL DEFAULT '{}'::JSONB,
    actor JSONB NOT NULL DEFAULT '{"type":"student"}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_student_act ON learning_events(student_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON learning_events(created_at);

-- 5. Synthetic Peer Drafts (Fallback pool for peer review)
CREATE TABLE IF NOT EXISTS synthetic_peer_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(128) NOT NULL,
    anonymous_author_alias VARCHAR(128) NOT NULL,
    content JSONB NOT NULL,
    investigation_data JSONB,
    misconception_tag VARCHAR(128),
    is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synthetic_drafts_act ON synthetic_peer_drafts(activity_id);

-- 6. Peer Reviews Table (Phase 5 Peer Evaluations)
CREATE TABLE IF NOT EXISTS peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR(128) NOT NULL,
    peer_review_submission_id VARCHAR(128),
    reviewer_student_id VARCHAR(128) NOT NULL,
    author_student_id VARCHAR(128) NOT NULL,
    activity_id VARCHAR(128) NOT NULL,
    scores JSONB NOT NULL DEFAULT '{"claim":3,"evidence":3,"reasoning":3}'::JSONB,
    strengths TEXT NOT NULL DEFAULT '',
    suggestions TEXT NOT NULL DEFAULT '',
    feedback TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_student_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_author ON peer_reviews(author_student_id, activity_id);

-- 7. Reflections Table (Phase 7 Meta-Cognitive Reflections)
CREATE TABLE IF NOT EXISTS reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(128) NOT NULL,
    activity_id VARCHAR(128) NOT NULL,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    conceptual_learning TEXT NOT NULL,
    inquiry_process_reflection TEXT NOT NULL,
    peer_review_experience TEXT,
    confidence_score INT NOT NULL CHECK (confidence_score BETWEEN 1 AND 5),
    key_takeaway TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_activity_reflection UNIQUE (student_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_reflections_student_act ON reflections(student_id, activity_id);

-- 8. Teacher Reviews Table (Final Educator Evaluation & Scoring)
CREATE TABLE IF NOT EXISTS teacher_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    teacher_id VARCHAR(128) NOT NULL,
    scores JSONB NOT NULL, -- { claim, evidence, reasoning, holistic }
    feedback TEXT NOT NULL DEFAULT '',
    final_score NUMERIC(5,2) NOT NULL,
    authorship_review_decision VARCHAR(64) DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_reviews_submission ON teacher_reviews(submission_id);
