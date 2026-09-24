# LOS-012: Automated pre/post (Draft 1 vs Final) analytics (audit gap #10)

- **Status:** done
- **Priority:** P2
- **Area:** feature
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

No per-student growth analytics; researchers compute manually from wide CSV.

## Acceptance criteria

- [x] Dashboard shows Draft1→Final deltas per dimension and per cycle

## Resolution (2026-09-25)

`src/lib/research/growth.ts` and `GrowthAnalyticsPanel` on `/teacher/analytics` show per-cycle means for the 4 dimensions and total, Draft 1→Final length change, the reject/modify rate, and paired Cycle 1→2 differences (n reported, no imputation). Inferential stats are left to SPSS/R.
