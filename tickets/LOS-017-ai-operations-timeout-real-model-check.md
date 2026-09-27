# LOS-017: AI operations: timeout, real-model check, stronger guardrail

- **Status:** open
- **Priority:** P1
- **Area:** ai-safety
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

A hung Ollama blocks requests for about 5 minutes. A wrong model name silently falls back to Mock, so an E2E could pass without the real model. The guardrail is easy to satisfy.

## Acceptance criteria

- [ ] [D1] `local-provider.ts` uses `AbortSignal.timeout(LOCAL_LLM_TIMEOUT_MS ?? 30000)`. Add a test that a hung fetch falls back within the timeout.
- [ ] [D2] `/api/ready` checks that `LOCAL_LLM_MODEL` is listed in `/v1/models`. `/api/health` or `/api/ready` reports when the fallback is in use.
- [ ] [D3] Chat history is stored on the server; the route no longer trusts client `assistant` turns. The guardrail adds answer-leak checks (a CER-shaped structure, or the reply overlapping the activity's reference answer). Add a test that a full CER ending in "?" is rejected.
- [ ] [D5] Apply `rate-limit.ts` to `POST /api/sessions`.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
