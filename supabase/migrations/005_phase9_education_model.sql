-- Phase 9: education-only durable model.
-- This migration extends the prototype tables with canonical class/profile scope
-- and adds the first-activity support tables. It contains synthetic course
-- metadata only; no auth credentials or student data are included.

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'th' CHECK (language IN ('th', 'en')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'researcher')),
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    UNIQUE (profile_id, class_id, role)
);

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    unit TEXT NOT NULL,
    title TEXT NOT NULL,
    adi_phase TEXT NOT NULL,
    prompt TEXT NOT NULL,
    context TEXT NOT NULL,
    rubric_dimensions JSONB NOT NULL DEFAULT '["claim", "evidence", "reasoning"]'::JSONB,
    peer_review_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_assignments (
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    peer_review_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, activity_id)
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE revisions ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE revisions ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE revisions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS reviewer_profile_id UUID;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS author_profile_id UUID;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE teacher_reviews ADD COLUMN IF NOT EXISTS teacher_profile_id UUID;
ALTER TABLE teacher_reviews ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE learning_events SET occurred_at = created_at WHERE occurred_at IS NULL;
ALTER TABLE learning_events ALTER COLUMN occurred_at SET DEFAULT NOW();
ALTER TABLE learning_events ALTER COLUMN occurred_at SET NOT NULL;
ALTER TABLE learning_events ALTER COLUMN correlation_id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE learning_events ALTER COLUMN correlation_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_profile_fk') THEN
        ALTER TABLE submissions ADD CONSTRAINT submissions_profile_fk FOREIGN KEY (profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_class_fk') THEN
        ALTER TABLE submissions ADD CONSTRAINT submissions_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revisions_profile_fk') THEN
        ALTER TABLE revisions ADD CONSTRAINT revisions_profile_fk FOREIGN KEY (profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revisions_class_fk') THEN
        ALTER TABLE revisions ADD CONSTRAINT revisions_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'peer_reviews_reviewer_profile_fk') THEN
        ALTER TABLE peer_reviews ADD CONSTRAINT peer_reviews_reviewer_profile_fk FOREIGN KEY (reviewer_profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'peer_reviews_author_profile_fk') THEN
        ALTER TABLE peer_reviews ADD CONSTRAINT peer_reviews_author_profile_fk FOREIGN KEY (author_profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'peer_reviews_class_fk') THEN
        ALTER TABLE peer_reviews ADD CONSTRAINT peer_reviews_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reflections_profile_fk') THEN
        ALTER TABLE reflections ADD CONSTRAINT reflections_profile_fk FOREIGN KEY (profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reflections_class_fk') THEN
        ALTER TABLE reflections ADD CONSTRAINT reflections_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_reviews_profile_fk') THEN
        ALTER TABLE teacher_reviews ADD CONSTRAINT teacher_reviews_profile_fk FOREIGN KEY (teacher_profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_reviews_class_fk') THEN
        ALTER TABLE teacher_reviews ADD CONSTRAINT teacher_reviews_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_profile_fk') THEN
        ALTER TABLE learning_events ADD CONSTRAINT events_profile_fk FOREIGN KEY (profile_id) REFERENCES learning_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_class_fk') THEN
        ALTER TABLE learning_events ADD CONSTRAINT events_class_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    profile_id UUID REFERENCES learning_profiles(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES classes(id) ON DELETE RESTRICT,
    context JSONB NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('mock', 'local', 'deepseek', 'fallback')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    profile_id UUID REFERENCES learning_profiles(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES classes(id) ON DELETE RESTRICT,
    request JSONB NOT NULL,
    response JSONB,
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    student_id TEXT NOT NULL,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    depth TEXT NOT NULL CHECK (depth IN ('shallow', 'concept', 'deep')),
    cost INTEGER NOT NULL CHECK (cost >= 0),
    correlation_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    purpose TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('granted', 'withdrawn', 'expired')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS research_identity_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES learning_profiles(id) ON DELETE CASCADE,
    participant_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS submissions_profile_version_uniq ON submissions(profile_id, activity_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_idempotency_uniq ON submissions(profile_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS revisions_submission_version_uniq ON revisions(submission_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS revisions_idempotency_uniq ON revisions(profile_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS events_idempotency_uniq ON learning_events(profile_id, idempotency_key);
CREATE INDEX IF NOT EXISTS memberships_class_role_idx ON memberships(class_id, role, status);
CREATE INDEX IF NOT EXISTS submissions_class_activity_idx ON submissions(class_id, activity_id, submitted_at);
CREATE INDEX IF NOT EXISTS revisions_profile_activity_idx ON revisions(profile_id, activity_id, created_at);
CREATE INDEX IF NOT EXISTS ai_interactions_profile_activity_idx ON ai_interactions(profile_id, activity_id, created_at);
CREATE INDEX IF NOT EXISTS hints_profile_activity_idx ON hints(profile_id, activity_id, created_at);
CREATE INDEX IF NOT EXISTS events_correlation_idx ON learning_events(correlation_id, occurred_at);
CREATE INDEX IF NOT EXISTS events_class_occurred_idx ON learning_events(class_id, occurred_at);

INSERT INTO schools (id, name) VALUES ('demo-school-01', 'Learning OS Synthetic School') ON CONFLICT (id) DO NOTHING;
INSERT INTO courses (id, school_id, title, language) VALUES ('biology-m4', 'demo-school-01', 'ชีววิทยา ม.4: ระบบนิเวศ', 'th') ON CONFLICT (id) DO NOTHING;
INSERT INTO classes (id, school_id, course_id, name) VALUES ('biology-m4-class-a', 'demo-school-01', 'biology-m4', 'ชีววิทยา ม.4 ห้อง A') ON CONFLICT (id) DO NOTHING;
INSERT INTO activities (id, course_id, unit, title, adi_phase, prompt, context, rubric_dimensions, peer_review_allowed)
VALUES
('ecosystem-food-web-01', 'biology-m4', 'ระบบนิเวศ', 'วิเคราะห์การเปลี่ยนแปลงในสายใยอาหาร', 'argument', 'หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้ จงอธิบายผลกระทบที่น่าจะเกิดขึ้นต่อประชากรหนู พืช และพลังงานในระบบ โดยเขียนเป็น Claim–Evidence–Reasoning', 'ระบบตัวอย่างประกอบด้วย หญ้า → ตั๊กแตน → กบ → งู และ หญ้า → หนู → งู โดยพลังงานถ่ายทอดจากผู้ผลิตไปยังผู้บริโภคและลดลงในแต่ละลำดับขั้น', '["claim", "evidence", "reasoning"]'::JSONB, FALSE),
('ecosystem-energy-flow-01', 'biology-m4', 'ระบบนิเวศ', 'อธิบายการไหลของพลังงาน', 'investigation', 'เปรียบเทียบพลังงานที่ผู้ผลิตและผู้บริโภคลำดับที่สองได้รับในระบบนิเวศ จงอธิบายโดยใช้หลักฐานจากบทเรียนและเหตุผลเชิงกลไก', 'ผู้ผลิตเปลี่ยนพลังงานแสงเป็นพลังงานเคมี ส่วนพลังงานบางส่วนสูญเสียไปเป็นความร้อนเมื่อพลังงานถ่ายทอดระหว่างลำดับขั้นการกิน', '["claim", "evidence", "reasoning"]'::JSONB, TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO activity_assignments (class_id, activity_id, enabled, peer_review_enabled)
VALUES ('biology-m4-class-a', 'ecosystem-food-web-01', TRUE, FALSE), ('biology-m4-class-a', 'ecosystem-energy-flow-01', TRUE, TRUE)
ON CONFLICT (class_id, activity_id) DO NOTHING;
