# LOS-003: Persist Phase 11 research fields in Supabase mode

- **Status:** done
- **Priority:** P0
- **Area:** data-integrity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

`SupabaseRepository` does not write `cycle`, `draft1Frozen`, `draft1FrozenAt`, `feedbackDecisions` (submissions/revisions) or `syntheticScores`/4-dim `rubricScores` (teacher reviews). No migration adds these columns. In Supabase mode they are silently dropped (only event payloads keep partial copies).

## Acceptance criteria

- [x] Migration `008_phase11_research_fields.sql` adds columns (+ RLS unchanged or extended)
- [x] Supabase repo maps fields both ways
- [x] Test in `supabase-repository.test.ts` asserts round-trip
- [x] Wide export in Supabase mode includes cycle + decisions + 4-dim scores

## Resolution (2026-09-25)

Files changed:
- `supabase/migrations/008_phase11_research_fields.sql` (new) — adds `cycle` (1|2, nullable), `draft1_frozen`, `draft1_frozen_at`, and `feedback_decisions` (`jsonb`) to `submissions` and `revisions`; `rubric_scores` (`jsonb`, CER only), `synthetic_scores` (`jsonb`, 4 synthetic-thinking dimensions), and `cycle` to `teacher_reviews`; and `cycle`/`chapter_id` to `activities` and `learning_events`. Existing class-scoped RLS policies from migrations 006/007 remain active.
- `src/lib/supabase/types.ts` — updated `Database` row/insert/update types for `activities`, `submissions`, `revisions`, `teacher_reviews`, and `learning_events`.
- `src/lib/domain/types.ts` — added optional `draft1Frozen` and `draft1FrozenAt` to `Revision`.
- `src/lib/repository/supabase-repository.ts` — writes and maps `cycle`, `draft1Frozen`, `draft1FrozenAt`, and `feedbackDecisions` on submissions and revisions; writes and maps `rubricScores` (CER), `syntheticScores` (4-dim), and `cycle` on teacher reviews; maps `cycle` and `chapterId` on activities and `cycle` on learning events.
- `src/app/api/sessions/route.ts` — forwards `draft1Frozen` and `draft1FrozenAt` to `repository.addRevision`.
- `src/lib/supabase-repository.test.ts` — added round-trip test for submissions, revisions, teacher reviews, and wide CSV export via `SupabaseRepository`.

Verification commands and actual results:
- `npm.cmd run typecheck` → passed (0 errors, exit code 0)
- `npm.cmd test` → passed (16 test files / 60 tests passed, exit code 0)
- `npm.cmd run build` → passed (24 routes built cleanly, exit code 0)

