# LOS-018: UI/UX polish: mobile, student-facing chrome, Thai copy, accessibility

- **Status:** open
- **Priority:** P2
- **Area:** ux
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Pages scroll sideways on phones, students see developer tools, labels are mixed English, and accessibility has gaps.

## Acceptance criteria

- [ ] [E3] `/student/activity` and `/teacher/roster` have no horizontal scroll at 375px (wrap the roster table in `.table-responsive`, and make the activity dropdown responsive).
- [ ] [E4] The teacher-dashboard link, telemetry console and "LM Studio" footer render only in memory/demo mode.
- [ ] [E5] "Direct answer ถูกบล็อก" renders only when `directAnswerBlocked` is true. The model and provider names come from telemetry (no hardcoded `ornith:9b` or "Local Ollama").
- [ ] [E6] Counts come from real data, with no hardcoded "57 คน", "29/28 คน" or "2 Versions / 1 Peer Review".
- [ ] [E7] Teacher and demo pages use Thai headings. Activity titles replace IDs. Event codes are mapped to Thai labels. Server errors shown to students are in Thai.
- [ ] [E8] `/teacher/review` reads `?studentId=` as the starting search filter.
- [ ] [E9] Sliders and observation fields have a linked label; the chat input has an aria-label; toggles use `aria-pressed`; the stepper uses `aria-current`; Phase 3 rows become buttons.
- [ ] [B5] Middleware sets `Cache-Control: no-store, private` for `/api/*`. [B6] CSV cells starting with `= + - @` are prefixed with `'`.
- [ ] [B3] The event export whitelists payload fields per event type and adds a participant key. [B4] Export requires an explicit researcher permission.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
