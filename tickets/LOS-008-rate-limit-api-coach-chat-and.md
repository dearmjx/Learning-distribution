# LOS-008: Rate-limit `/api/coach/chat` and add `/api/ready` probe

- **Status:** done
- **Priority:** P1
- **Area:** ops
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

Handoff's stated next step. A classroom of ~30 students hitting a local Ollama box can saturate it.

## Acceptance criteria

- [x] Per-student rate limit with friendly Thai error
- [x] `/api/ready` checks provider + persistence

## Resolution (2026-09-25)

`src/lib/safety/rate-limit.ts` is an in-process sliding window (default 6/min per student, `COACH_RATE_LIMIT_PER_MINUTE`), returning 429 with Retry-After and a Thai message. `GET /api/ready` returns 200 or 503 with persistence and LLM checks (pings Ollama `/models`, 2 s timeout) and is public under demo mode.
