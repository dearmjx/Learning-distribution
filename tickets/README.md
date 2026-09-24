# Learn OS Tickets

Lightweight file-based tracker. One file per ticket: `LOS-NNN-slug.md`.

**Workflow:** `open` → `in-progress` → `done` (or `wontfix`). Edit the `Status:` line in the ticket and the row below together. Priority: **P0** blocks a usable pilot · **P1** needed before real student data · **P2** later.

**Definition of done:** acceptance criteria met, `npm run typecheck`, `npm test`, `npm run build` pass, `handoff.md` updated.

| ID | Pri | Status | Title | Area |
|---|---|---|---|---|
| [LOS-001](LOS-001-fix-phase-11-build-break-typecheck.md) | P0 | done | Fix Phase 11 build break (typecheck/build failing) | fix |
| [LOS-002](LOS-002-enforce-draft-1-first-on-the.md) | P0 | done | Enforce Draft-1-first on the Coach chat API (audit gap #1) | research-validity |
| [LOS-003](LOS-003-persist-phase-11-research-fields-in.md) | P0 | done | Persist Phase 11 research fields in Supabase mode | data-integrity |
| [LOS-004](LOS-004-implement-supabase-teacher-observation-notes-currently.md) | P0 | open | Implement Supabase teacher observation notes (currently a stub) | data-integrity |
| [LOS-005](LOS-005-remove-hardcoded-identities-and-counts-from.md) | P1 | done | Remove hardcoded identities and counts from teacher/student UI | correctness |
| [LOS-006](LOS-006-use-real-cycle-field-for-paor.md) | P1 | done | Use real `cycle` field for PAOR filters instead of activityId heuristic | research-validity |
| [LOS-007](LOS-007-decide-cer-synthetic-thinking-rubric-mapping.md) | P1 | done | Score CER and synthetic-thinking rubrics separately | research-design |
| [LOS-008](LOS-008-rate-limit-api-coach-chat-and.md) | P1 | done | Rate-limit `/api/coach/chat` and add `/api/ready` probe | ops |
| [LOS-009](LOS-009-live-verification-ollama-supabase-end-to.md) | P1 | open | Live verification: Ollama + Supabase end-to-end | verification |
| [LOS-010](LOS-010-commit-phase-11-work-off-main.md) | P1 | done | Commit Phase 11 work off `main` | hygiene |
| [LOS-013](LOS-013-enforce-strict-guardrail-on-coach-chat.md) | P0 | done | Enforce strict Socratic guardrail on Coach chat replies | safety |
| [LOS-011](LOS-011-ai-opponent-role-audit-gap-7.md) | P2 | done | AI Opponent role (audit gap #7) | feature |
| [LOS-012](LOS-012-automated-pre-post-draft-1-vs.md) | P2 | done | Automated pre/post (Draft 1 vs Final) analytics (audit gap #10) | feature |

## Milestone M1 — Real CAR pilot on Supabase (D-011)

No date fixed. Real student data stays blocked until the **gate** tickets are done.

1. LOS-010: commit the Phase 11 work on a branch (so everything after it can be reviewed)
2. **Gate:** LOS-003, then LOS-004: Supabase persistence for research fields and observations
3. **Gate:** LOS-005, LOS-006, LOS-007: correct identity, cycle, and rubric data
4. LOS-008: rate limit and readiness probe
5. **Gate:** LOS-009: live end-to-end verification with 2 synthetic students and 1 teacher
6. LOS-011, LOS-012: AI Opponent and pre/post analytics (in scope, since there's no deadline)

**Status 2026-09-25:** everything except the Supabase tickets (003, 004, 009) and the commit (010) is done. The Supabase test is planned for 2026-09-26.

Open outside the code: parent consent and student assent, and the IRB/ethics path (D-008).
