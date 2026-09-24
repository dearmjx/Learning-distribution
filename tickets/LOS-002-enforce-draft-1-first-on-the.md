# LOS-002: Enforce Draft-1-first on the Coach chat API (audit gap #1)

- **Status:** done
- **Priority:** P0
- **Area:** research-validity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

UI hid the chat until Draft 1 was frozen, but `POST /api/coach/chat` accepted requests with no baseline — AI help could precede the baseline, contaminating the pre/post comparison.

## Acceptance criteria

- [x] Chat returns 409 `draft1_required` when the student has no submission for the activity
- [x] No `hint_requested` event is logged for refused calls
- [x] Chat works after Draft 1

## Notes

Fixed 2026-09-25 in `src/app/api/coach/chat/route.ts`; test `src/lib/coach-chat-gate.test.ts`.
