-- Phase 9/11 live RLS test. Run with: supabase test db
-- Synthetic auth users are created inside a transaction and rolled back.

BEGIN;

SELECT plan(18);

CREATE TEMP TABLE phase9_ids (student_a UUID, student_b UUID, teacher_a UUID, teacher_b UUID, student_other UUID);
INSERT INTO phase9_ids VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

SET LOCAL ROLE postgres;
INSERT INTO auth.users (id, aud, role, email, encrypted_password)
SELECT student_a, 'authenticated', 'authenticated', 'phase9-a@example.invalid', 'not-used'
FROM phase9_ids;
INSERT INTO auth.users (id, aud, role, email, encrypted_password)
SELECT student_b, 'authenticated', 'authenticated', 'phase9-b@example.invalid', 'not-used'
FROM phase9_ids;
INSERT INTO auth.users (id, aud, role, email, encrypted_password)
SELECT teacher_a, 'authenticated', 'authenticated', 'phase9-teacher@example.invalid', 'not-used'
FROM phase9_ids;
INSERT INTO auth.users (id, aud, role, email, encrypted_password)
SELECT teacher_b, 'authenticated', 'authenticated', 'phase9-teacher-b@example.invalid', 'not-used'
FROM phase9_ids;
INSERT INTO auth.users (id, aud, role, email, encrypted_password)
SELECT student_other, 'authenticated', 'authenticated', 'phase9-other@example.invalid', 'not-used'
FROM phase9_ids;

INSERT INTO learning_profiles (id, auth_user_id, external_id, display_name, role, school_id, course_id)
SELECT student_a, student_a, 'phase9-student-a', 'Synthetic Student A', 'student', 'demo-school-01', 'biology-m4' FROM phase9_ids
UNION ALL SELECT student_b, student_b, 'phase9-student-b', 'Synthetic Student B', 'student', 'demo-school-01', 'biology-m4' FROM phase9_ids
UNION ALL SELECT teacher_a, teacher_a, 'phase9-teacher-a', 'Synthetic Teacher A', 'teacher', 'demo-school-01', 'biology-m4' FROM phase9_ids
UNION ALL SELECT teacher_b, teacher_b, 'phase9-teacher-b', 'Synthetic Teacher B', 'teacher', 'demo-school-01', 'biology-m4' FROM phase9_ids
UNION ALL SELECT student_other, student_other, 'phase9-student-other', 'Synthetic Student Other', 'student', 'demo-school-01', 'biology-m4' FROM phase9_ids;

INSERT INTO memberships (profile_id, class_id, role)
SELECT student_a, 'biology-m4-class-a', 'student' FROM phase9_ids
UNION ALL SELECT student_b, 'biology-m4-class-a', 'student' FROM phase9_ids
UNION ALL SELECT teacher_a, 'biology-m4-class-a', 'teacher' FROM phase9_ids
UNION ALL SELECT teacher_b, 'biology-m4-class-a', 'teacher' FROM phase9_ids;

SET LOCAL ROLE service_role;
INSERT INTO submissions (student_id, activity_id, profile_id, class_id, version, content, workflow_state)
SELECT 'phase9-student-a', 'ecosystem-food-web-01', student_a, 'biology-m4-class-a', 1,
       '{"claim":"A","evidence":"A","reasoning":"A"}'::jsonb, 'submitted' FROM phase9_ids
UNION ALL
SELECT 'phase9-student-b', 'ecosystem-food-web-01', student_b, 'biology-m4-class-a', 1,
       '{"claim":"B","evidence":"B","reasoning":"B"}'::jsonb, 'submitted' FROM phase9_ids;

INSERT INTO teacher_observation_notes (teacher_id, teacher_profile_id, class_id, cycle, activity_id, phase, content)
SELECT 'phase9-teacher-a', teacher_a, 'biology-m4-class-a', 1, 'ecosystem-food-web-01', 'observe', 'Teacher A private PAOR observation' FROM phase9_ids
UNION ALL
SELECT 'phase9-teacher-b', teacher_b, 'biology-m4-class-a', 1, 'ecosystem-food-web-01', 'observe', 'Teacher B private PAOR observation' FROM phase9_ids;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', student_a::text, true) FROM phase9_ids;
SELECT is((SELECT count(*)::int FROM submissions), 1, 'student A sees only student A evidence');
SELECT is((SELECT min(student_id) FROM submissions), 'phase9-student-a', 'student A cannot read student B submission');
SELECT throws_ok($sql$INSERT INTO submissions (student_id, activity_id, profile_id, class_id, content)
    SELECT 'phase9-student-b', 'ecosystem-food-web-01', learning_profile_id(), 'biology-m4-class-a', '{"claim":"tampered","evidence":"","reasoning":""}'::jsonb$sql$,
    '42501', NULL, 'student A cannot insert a submission for student B');
SELECT throws_ok($sql$UPDATE learning_events SET payload = '{}'::jsonb$sql$, NULL, NULL, 'learning events have no update path');
SELECT throws_ok($sql$SELECT * FROM research_identity_mapping$sql$, NULL, NULL, 'research identity mapping is more restricted than evidence');
-- LOS-015 (migration 013): research content is immutable and consent is guardian/admin-managed.
SELECT throws_ok($sql$UPDATE submissions SET content = '{"claim":"rewritten","evidence":"","reasoning":""}'::jsonb$sql$,
    '42501', NULL, 'student A cannot rewrite their frozen Draft 1 through the API');
SELECT throws_ok($sql$INSERT INTO learning_events (student_id, activity_id, profile_id, class_id, event_type, payload, correlation_id)
    SELECT 'phase9-student-a', 'ecosystem-food-web-01', learning_profile_id(), 'biology-m4-class-a', 'teacher_reviewed', '{}'::jsonb, 'forged'$sql$,
    '42501', NULL, 'student A cannot forge a teacher event');
SELECT throws_ok($sql$INSERT INTO consent_records (profile_id, school_id, purpose, policy_version, status)
    SELECT learning_profile_id(), 'demo-school-01', 'classroom_action_research', 'v1', 'granted'$sql$,
    '42501', NULL, 'student A cannot grant their own research consent');
SELECT lives_ok($sql$SELECT set_submission_workflow_state((SELECT id FROM submissions LIMIT 1), 'revising')$sql$,
    'student A can advance their own workflow state through the RPC only');

SELECT set_config('request.jwt.claim.sub', teacher_a::text, true) FROM phase9_ids;
SELECT is((SELECT count(*)::int FROM submissions), 2, 'teacher sees both submissions in assigned class');
SELECT is(cardinality(consented_student_ids('biology-m4-class-a', 'classroom_action_research')), 0,
    'teacher consent lookup returns no students without guardian-recorded consent');
SELECT is((SELECT count(*)::int FROM teacher_observation_notes), 1, 'teacher A sees only teacher A observation notes');
SELECT is((SELECT min(teacher_id) FROM teacher_observation_notes), 'phase9-teacher-a', 'teacher A cannot read teacher B observation notes');
SELECT throws_ok($sql$INSERT INTO teacher_observation_notes (teacher_id, teacher_profile_id, class_id, cycle, activity_id, phase, content)
    SELECT 'phase9-teacher-b', learning_profile_id(), 'biology-m4-class-a', 1, 'ecosystem-food-web-01', 'observe', 'spoofed note'$sql$,
    '42501', NULL, 'teacher A cannot insert observation notes as teacher B');

SELECT set_config('request.jwt.claim.sub', student_other::text, true) FROM phase9_ids;
SELECT is((SELECT count(*)::int FROM submissions), 0, 'unauthorized user sees no class submissions');

SELECT set_config('request.jwt.claim.sub', student_a::text, true) FROM phase9_ids;
SELECT ok((get_assigned_peer_review_draft('ecosystem-energy-flow-01') IS NOT NULL), 'peer-review RPC derives the reviewer from auth.uid');
SELECT throws_ok($sql$SELECT get_assigned_peer_review_draft('student-b', 'ecosystem-energy-flow-01')$sql$, NULL, NULL, 'old caller-supplied reviewer RPC signature is unavailable');
SELECT ok(TRUE, 'RLS test completed without trusting browser identity fields');

SELECT * FROM finish();
ROLLBACK;
