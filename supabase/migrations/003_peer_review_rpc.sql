-- Migration 003: Security Definer RPC for Anonymized Peer Review Assignment
-- Strips author identity at the database kernel level to protect student privacy and ensure unbiased peer reviews.

CREATE OR REPLACE FUNCTION get_assigned_peer_review_draft(
    p_reviewer_student_id VARCHAR,
    p_activity_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reviewed_ids TEXT[];
    v_real_sub RECORD;
    v_alias_index INT;
    v_synthetic RECORD;
    v_result JSONB;
BEGIN
    -- 1. Collect all submissions already reviewed by this reviewer
    SELECT ARRAY_AGG(COALESCE(submission_id, peer_review_submission_id))
    INTO v_reviewed_ids
    FROM peer_reviews
    WHERE reviewer_student_id = p_reviewer_student_id
    AND activity_id = p_activity_id;

    IF v_reviewed_ids IS NULL THEN
        v_reviewed_ids := ARRAY[]::TEXT[];
    END IF;

    -- 2. Try to find a real classmate submission in the pool
    SELECT s.id, s.activity_id, s.content, s.investigation_data, s.submitted_at
    INTO v_real_sub
    FROM submissions s
    WHERE s.activity_id = p_activity_id
    AND s.student_id <> p_reviewer_student_id
    AND s.workflow_state <> 'draft'
    AND NOT (s.id::TEXT = ANY(v_reviewed_ids))
    ORDER BY s.submitted_at ASC
    LIMIT 1;

    IF v_real_sub.id IS NOT NULL THEN
        -- Calculate deterministic anonymous index for display
        SELECT COUNT(*) INTO v_alias_index
        FROM submissions
        WHERE activity_id = p_activity_id
        AND id <= v_real_sub.id;

        v_result := jsonb_build_object(
            'id', 'real-peer-draft-' || v_real_sub.id::TEXT,
            'submissionId', v_real_sub.id::TEXT,
            'authorStudentId', 'anonymous-classmate', -- Strictly redacted
            'activityId', v_real_sub.activity_id,
            'anonymousAuthorAlias', 'เพื่อนร่วมชั้นนิรนาม #' || COALESCE(v_alias_index, 1)::TEXT,
            'content', v_real_sub.content,
            'investigationData', v_real_sub.investigation_data,
            'submittedAt', v_real_sub.submitted_at,
            'isSynthetic', false
        );
        RETURN v_result;
    END IF;

    -- 3. Fallback: Search unreviewed synthetic peer drafts
    SELECT syn.id, syn.activity_id, syn.anonymous_author_alias, syn.content, syn.investigation_data, syn.misconception_tag, syn.created_at
    INTO v_synthetic
    FROM synthetic_peer_drafts syn
    WHERE syn.activity_id = p_activity_id
    AND NOT (syn.id::TEXT = ANY(v_reviewed_ids))
    ORDER BY syn.created_at ASC
    LIMIT 1;

    IF v_synthetic.id IS NOT NULL THEN
        v_result := jsonb_build_object(
            'id', v_synthetic.id::TEXT,
            'submissionId', v_synthetic.id::TEXT,
            'authorStudentId', 'synthetic-peer',
            'activityId', v_synthetic.activity_id,
            'anonymousAuthorAlias', v_synthetic.anonymous_author_alias,
            'content', v_synthetic.content,
            'investigationData', v_synthetic.investigation_data,
            'misconceptionTag', v_synthetic.misconception_tag,
            'submittedAt', v_synthetic.created_at,
            'isSynthetic', true
        );
        RETURN v_result;
    END IF;

    -- 4. Final Fallback: Return any available synthetic draft
    SELECT syn.id, syn.activity_id, syn.anonymous_author_alias, syn.content, syn.investigation_data, syn.misconception_tag, syn.created_at
    INTO v_synthetic
    FROM synthetic_peer_drafts syn
    WHERE syn.activity_id = p_activity_id
    LIMIT 1;

    IF v_synthetic.id IS NOT NULL THEN
        v_result := jsonb_build_object(
            'id', v_synthetic.id::TEXT,
            'submissionId', v_synthetic.id::TEXT,
            'authorStudentId', 'synthetic-peer',
            'activityId', v_synthetic.activity_id,
            'anonymousAuthorAlias', v_synthetic.anonymous_author_alias,
            'content', v_synthetic.content,
            'investigationData', v_synthetic.investigation_data,
            'misconceptionTag', v_synthetic.misconception_tag,
            'submittedAt', v_synthetic.created_at,
            'isSynthetic', true
        );
        RETURN v_result;
    END IF;

    RETURN NULL;
END;
$$;
