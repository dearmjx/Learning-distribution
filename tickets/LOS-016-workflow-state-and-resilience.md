# LOS-016: Workflow state and resilience

- **Status:** open
- **Priority:** P1
- **Area:** correctness
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Students lose work on refresh, can undo the Draft 1 freeze, can double-submit, and can't reach the later ADI states. Demo mode fails at Phase 4.

## Acceptance criteria

- [ ] [C1] Memory/demo mode: the student picker no longer causes a 403 at Phase 4. Either the server resolves identity from the picker in demo mode only, or the picker is removed and the server's identity is shown.
- [ ] [C2] After a peer review, the reviewer's own latest submission transitions (request_peer_review / submit_peer_review) and emits `learning_phase_changed`.
- [ ] [C3] Reflections and peer-review POST return 409 when the student has no submission for the activity (same gate as the chat).
- [ ] [C4] The workbench rebuilds progress from `/api/sessions` on load and keeps an unsent draft in localStorage per student and activity.
- [ ] [C5] Remove the Draft 1 unlock button, or make unlocking clear the result and send edits through the Phase 6 revision path.
- [ ] [C6] The submit buttons in Phases 6 and 7 are disabled after success.
- [ ] [C7] `/api/sessions`: a replay with a known idempotency key returns the original submission unchanged. The UI sends a `requestId` on each click.
- [ ] [C10] Teacher review: the form is seeded from the existing review, so reopening and saving doesn't overwrite it. A repeat review of a completed submission returns 409.
- [ ] [C11] Peer assignment uses only the latest version of each author's work.
- [ ] [C12] Phases 1-3 log a phase-progress event, and `investigationData` is added to the session schema and saved.
- [ ] [D4] Log the original error server-side. Map RLS error 42501 to 403. [D7] Malformed JSON returns 400.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
