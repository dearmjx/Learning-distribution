# LOS-015: Database hardening: pagination, immutability, consent, de-identification

- **Status:** done
- **Priority:** P0
- **Area:** data-integrity
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Supabase list queries silently cap at 1000 rows. Students can rewrite frozen baselines and write arbitrary events through the REST API. Consent can't be enforced. The research key leaks real IDs.

## Acceptance criteria

- [x] [A7] Every Supabase list method pages with `.range()` until a short page comes back (or the export uses a SQL function). Add a test with more than 1000 mocked rows.
- [x] [A8] New migration: `REVOKE UPDATE ON submissions FROM authenticated`. Workflow-state changes go through a SECURITY DEFINER RPC. A trigger blocks changes to frozen Draft 1 rows. Students may insert only whitelisted event types.
- [x] [B1] Remove the student INSERT/UPDATE policies on `consent_records` (guardian or admin only). Add a SECURITY DEFINER `consented_profile_ids(class_id, purpose)`. The research export (wide and events) includes only students with current `granted` consent. Add a test proving a withdrawn student is excluded.
- [x] [B2] The participant key comes from `research_identity_mapping` or an HMAC with a server secret, never derived from the real ID. The classroom comes from `class_id`, not from the ID string.
- [x] [C8] Every teacher query filters on `class_id = identity.context.classId`. A teacher with several classes picks one explicitly, validated on the server.
- [x] [C9] The roster sorts submissions and events explicitly and doesn't depend on repository order.
- [x] [D6] Drop the unused SECURITY DEFINER functions from 002 that have no `search_path`.
- [x] Extend `supabase/tests/phase9_isolation.sql`: a student can't update a frozen submission, can't insert a teacher event type, and can't grant their own consent.
- [x] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated

## Resolution (2026-09-27)

- **A7** `fetchAllPages()` pages every Supabase list query with `.range()` and a stable secondary order (`id`). Test: 2,345 events are read in 3 pages.
- **A8** Migration 013 drops the submissions UPDATE policy, revokes UPDATE, and adds the `set_submission_workflow_state` RPC (the repo uses it). A trigger makes submission research content immutable. The learning_events insert policy whitelists student and teacher event types.
- **B1** Migration 013 removes the student consent INSERT/UPDATE policies and adds the teacher-only `consented_student_ids(class, purpose)` RPC (the latest record per purpose decides; expired or withdrawn records don't count). The export filters events, submissions and reflections by consent (`RESEARCH_CONSENT_PURPOSE`). Memory mode holds synthetic data only, so it reports `consentFiltered:false`.
- **B2** Participant key = `P_` + HMAC-SHA256(`RESEARCH_KEY_SECRET`) in place of the ID-derived key. The export returns 503 in Supabase mode if the secret is missing. The classroom comes from `submission.classId`, never from the ID string.
- **C8** Teacher list queries filter on the scoped `class_id`. `resolveLearningIdentity({ classId })` accepts a requested class only if the user is an active member (otherwise 403), uses a deterministic default, and checks the membership date window. The roster, reviews and export routes accept `?classId=`. (A UI class picker is left for LOS-018.)
- **C9** The roster sorts submissions by version and events by time explicitly.
- **D6** The legacy 002 helpers get a fixed `search_path` (not dropped, because old policies may still reference them).
- SQL isolation test: plan 13 → 18. Covers a student rewriting Draft 1, forging a teacher event, or granting their own consent, workflow changes via the RPC, and teacher consent lookup.
- Verified: typecheck 0 errors · tests 70/70 (18 files) · build OK. Browser (memory mode): the wide export returns `P_…` keys and the real ID is absent from the CSV.

**Before the live run:** apply migrations **011, 012 and 013**. Set `RESEARCH_KEY_SECRET` (16+ characters, kept stable for the whole study) and, if different, `RESEARCH_CONSENT_PURPOSE`. Guardian consent rows must be inserted by an admin (service role or SQL editor).
