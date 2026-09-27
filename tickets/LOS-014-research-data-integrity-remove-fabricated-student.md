# LOS-014: Research-data integrity: remove fabricated student content

- **Status:** open
- **Priority:** P0
- **Area:** research-validity
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Several screens put invented content into the research dataset as if students wrote it, and some real data is saved wrongly. This must be fixed before any E2E run or pilot.

## Acceptance criteria

- [ ] [A1] `phase7-reflection.tsx`: the reflection starts empty with no score, confidence or concepts selected. Submit stays disabled until the text box has content.
- [ ] [A2] `phase2-identification.tsx`: the variables and hypothesis use placeholders only. Proceed is blocked until every field has content.
- [ ] [A3] Phase 6 shows the real peer reviews the author received. Add a received-reviews query (memory and Supabase, RLS on the author) to `GET /api/peer-reviews`. Show the synthetic review only in memory/demo mode, labelled "ตัวอย่าง", with decisions flagged `isSynthetic`.
- [ ] [A4] `phase5-peer-review.tsx`: scores start unselected, strengths and suggestions must be typed (no canned text sent), and Next is gated on `submittedReview`.
- [ ] [A5] `phase6-revision.tsx`: every feedback item needs a decision plus a justification the student typed. No auto-filled justification text.
- [ ] [A6] Reflections: map the UI's confidence value to `confidence_score` correctly, save the analytical and AI-literacy scores (with a migration if needed), and send the active `submissionId`.
- [ ] [A9] `export.ts`: no remaining fill-ins. `draft1FrozenAt`, `aiChatHintCost`, `authorshipStatus` and the start timestamp are blank when the source value is missing.
- [ ] [E1] Phases 5 and 6 check `res.ok` and show a Thai error with a retry button instead of falling back to fake data.
- [ ] [E2] `student-workbench.tsx`: check `res.ok` and that `data.activities` is an array, add a loading state, and never crash the page.
- [ ] Tests prove there is no canned content: the Phase 5/6/7 payloads contain only typed text, and the reflection confidence round-trips correctly.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated
