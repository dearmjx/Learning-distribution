-- LOS-014 (A3): Let a student read the peer reviews written about their own work.
-- RLS on peer_reviews only exposes rows to the reviewer and teachers, so this
-- auth-bound RPC returns the author's received reviews WITHOUT reviewer identity.

CREATE OR REPLACE FUNCTION get_received_peer_reviews(p_activity_id TEXT)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
        'id', pr.id,
        'submission_id', pr.submission_id,
        'scores', pr.scores,
        'strengths', pr.strengths,
        'suggestions', pr.suggestions,
        'feedback', pr.feedback,
        'created_at', pr.created_at
    ) ORDER BY pr.created_at), '[]'::JSONB)
    FROM peer_reviews pr
    WHERE pr.author_profile_id = learning_profile_id()
      AND pr.activity_id = p_activity_id
      AND learning_profile_id() IS NOT NULL
      AND active_class_member(pr.class_id, 'student');
$$;

REVOKE ALL ON FUNCTION get_received_peer_reviews(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_received_peer_reviews(TEXT) TO authenticated;
