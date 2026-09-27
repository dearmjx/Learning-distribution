# LOS-019: Playwright E2E suite for the full 7-phase flow

- **Status:** open
- **Priority:** P1
- **Area:** verification
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

There is no browser E2E test. LOS-009 needs a repeatable script. Depends on LOS-014 and LOS-016, and on LOS-015 for the Supabase run.

## Acceptance criteria

- [ ] Add `@playwright/test` as a dev dependency, a `playwright.config.ts`, and an `npm run e2e` script.
- [ ] Spec in memory mode (runs in CI with no Supabase or Ollama): 2 students plus 1 teacher go through all 7 phases, and both students finish Phase 4 before Phase 5.
- [ ] Assert that Phase 5 shows the other student's real draft with no identity, and Phase 6 shows the real peer review text, saved as v2.
- [ ] Assert that the export contains draft_1_frozen, student_submitted, student_revised, feedback_evaluated, peer_review_submitted, reflection_completed and teacher_reviewed for each student, and that the reflection confidence is correct.
- [ ] Negative checks: a double-click on freeze creates no duplicate, student A gets 403 on B's data, and the chat is 409 before Draft 1.
- [ ] Supabase + Ollama variant, gated by env: `/api/ready` is 200 with the model present, and `provider==="local"` and `fallbackUsed===false`.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
