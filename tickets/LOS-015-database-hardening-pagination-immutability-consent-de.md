# LOS-015: Database hardening: pagination, immutability, consent, de-identification

- **Status:** open
- **Priority:** P0
- **Area:** data-integrity
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Supabase list queries silently cap at 1000 rows. Students can rewrite frozen baselines and write arbitrary events through the REST API. Consent can't be enforced. The research key leaks real IDs.

## Acceptance criteria

- [ ] [A7] Every Supabase list method pages with `.range()` until a short page comes back (or the export uses a SQL function). Add a test with more than 1000 mocked rows.
- [ ] [A8] New migration: `REVOKE UPDATE ON submissions FROM authenticated`. Workflow-state changes go through a SECURITY DEFINER RPC. A trigger blocks changes to frozen Draft 1 rows. Students may insert only whitelisted event types.
- [ ] [B1] Remove the student INSERT/UPDATE policies on `consent_records` (guardian or admin only). Add a SECURITY DEFINER `consented_profile_ids(class_id, purpose)`. The research export (wide and events) includes only students with current `granted` consent. Add a test proving a withdrawn student is excluded.
- [ ] [B2] The participant key comes from `research_identity_mapping` or an HMAC with a server secret, never derived from the real ID. The classroom comes from `class_id`, not from the ID string.
- [ ] [C8] Every teacher query filters on `class_id = identity.context.classId`. A teacher with several classes picks one explicitly, validated on the server.
- [ ] [C9] The roster sorts submissions and events explicitly and doesn't depend on repository order.
- [ ] [D6] Drop the unused SECURITY DEFINER functions from 002 that have no `search_path`.
- [ ] Extend `supabase/tests/phase9_isolation.sql`: a student can't update a frozen submission, can't insert a teacher event type, and can't grant their own consent.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
