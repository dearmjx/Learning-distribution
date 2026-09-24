# LOS-011: AI Opponent role (audit gap #7)

- **Status:** done
- **Priority:** P2
- **Area:** feature
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

No opponent/devil's-advocate coach mode exists.

## Acceptance criteria

- [x] Opponent mode behind the same guardrails; logged as distinct event

## Resolution (2026-09-25)

Chat takes `mode: "coach" | "opponent"`. Opponent mode uses its own system prompt (one counter-argument from approved context, then asks the student to rebut) under the same guardrails. Events are logged with `mode: "opponent_challenge"`, the export has an `AIOpponent_Turns` column, and the chat UI has a toggle.
