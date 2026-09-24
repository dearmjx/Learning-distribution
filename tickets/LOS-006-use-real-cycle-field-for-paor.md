# LOS-006: Use real `cycle` field for PAOR filters instead of activityId heuristic

- **Status:** done
- **Priority:** P1
- **Area:** research-validity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

Dashboard cycle filter uses `sub.activityId.includes("energy") || sub.cycle === 2`. Cycle assignment must come from data, or Cycle 1/2 analysis in the CAR report is unreliable.

## Acceptance criteria

- [x] Filter uses `submission.cycle ?? activity.cycle` only
- [x] Activities without a cycle are shown as 'unassigned', not silently Cycle 1

## Resolution (2026-09-25)

The dashboard and wide export take cycle from `submission.cycle`, then the activity's `cycle`. Unknown cycles show as "ยังไม่ระบุ Cycle" or a blank export cell, never as Cycle 1. The teacher snapshot now includes `activities`.
