# LOS-003: Persist Phase 11 research fields in Supabase mode

- **Status:** open
- **Priority:** P0
- **Area:** data-integrity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

`SupabaseRepository` does not write `cycle`, `draft1Frozen`, `draft1FrozenAt`, `feedbackDecisions` (submissions/revisions) or `syntheticScores`/4-dim `rubricScores` (teacher reviews). No migration adds these columns. In Supabase mode they are silently dropped (only event payloads keep partial copies).

## Acceptance criteria

- [ ] Migration `008_phase11_research_fields.sql` adds columns (+ RLS unchanged or extended)
- [ ] Supabase repo maps fields both ways
- [ ] Test in `supabase-repository.test.ts` asserts round-trip
- [ ] Wide export in Supabase mode includes cycle + decisions + 4-dim scores
