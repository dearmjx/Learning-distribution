# LOS-013: Enforce strict Socratic guardrail on Coach chat replies

- **Status:** done
- **Priority:** P0
- **Area:** safety
- **Source:** found while implementing LOS-011 (audit gap #9)

## Problem

`chatWithCoach` returned model output to students without running `validateStrictSocraticResponse`, so a direct answer from the LLM reached the student unchecked. The mock provider's raw JSON envelope was also shown in the chat bubble.

## Acceptance criteria

- [x] Every chat reply passes the strict guardrail or is replaced with a safe question
- [x] Replacement flagged (`guardrail_replaced`) in the response and in the event payload
- [x] JSON `{ "message": ... }` replies are unwrapped to plain text
- [x] Tests in `src/lib/coach-chat.test.ts`
