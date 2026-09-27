# LOS-014: Research-data integrity: remove fabricated student content

- **Status:** done
- **Priority:** P0
- **Area:** research-validity
- **Source: `audit/PRE_E2E_AUDIT_2026-09-27.md` (IDs in brackets refer to that report)**

## Problem

Several screens put invented content into the research dataset as if students wrote it, and some real data is saved wrongly. This must be fixed before any E2E run or pilot.

## Acceptance criteria

- [x] [A1] `phase7-reflection.tsx`: the reflection starts empty with no score, confidence or concepts selected. Submit stays disabled until the text box has content.
- [x] [A2] `phase2-identification.tsx`: the variables and hypothesis use placeholders only. Proceed is blocked until every field has content.
- [x] [A3] Phase 6 shows the real peer reviews the author received. Add a received-reviews query (memory and Supabase, RLS on the author) to `GET /api/peer-reviews`. Show the synthetic review only in memory/demo mode, labelled "ตัวอย่าง", with decisions flagged `isSynthetic`.
- [x] [A4] `phase5-peer-review.tsx`: scores start unselected, strengths and suggestions must be typed (no canned text sent), and Next is gated on `submittedReview`.
- [x] [A5] `phase6-revision.tsx`: every feedback item needs a decision plus a justification the student typed. No auto-filled justification text.
- [x] [A6] Reflections: map the UI's confidence value to `confidence_score` correctly, save the analytical and AI-literacy scores (with a migration if needed), and send the active `submissionId`.
- [x] [A9] `export.ts`: no remaining fill-ins. `draft1FrozenAt`, `aiChatHintCost`, `authorshipStatus` and the start timestamp are blank when the source value is missing.
- [x] [E1] Phases 5 and 6 check `res.ok` and show a Thai error with a retry button instead of falling back to fake data.
- [x] [E2] `student-workbench.tsx`: check `res.ok` and that `data.activities` is an array, add a loading state, and never crash the page.
- [x] Tests prove there is no canned content: the Phase 5/6/7 payloads contain only typed text, and the reflection confidence round-trips correctly.
- [x] `npm run typecheck`, `npm test`, `npm run build` pass; handoff.md updated

## Resolution (2026-09-27)

- Phase 2 and Phase 7 start empty and block Next/Submit until complete. Phase 7 uses 1–5 buttons (a slider can't start unselected) and no longer shows a hardcoded certificate count.
- Peer review: the client-side fake peer draft and fake received review are removed. `GET /api/peer-reviews` returns `receivedReviews` (memory: filtered by author; Supabase: new RPC `get_received_peer_reviews` in migration 012), with the reviewer anonymized. The synthetic sample draft from the server is labelled "งานตัวอย่าง".
- Phase 5: scores and text start empty and are required, with no canned text. The server schema requires `scores`, `strengths` and `suggestions`. Next is allowed only after submitting, or when nothing is available to review. Load errors show a Thai message with a retry button.
- Phase 6: the student must pick a decision and type their own justification for every feedback item. The submit button is disabled after success.
- Reflections: migration 011 adds the self-rating and text columns and makes `confidence_score` nullable. The Supabase repo stores exactly what was given. `/api/reflections` returns 409 without Draft 1 and links the reflection to the latest submission.
- The workbench checks `res.ok` and that activities is an array, and shows a loading state.
- Export: no remaining fill-ins (freeze time, hint cost, authorship, start time and duration are blank when missing).
- Tests: `src/lib/los014-data-integrity.test.ts` (4). typecheck 0 errors · tests 67/67 · build OK. Browser: Phase 2 starts empty and Next is disabled.
- **Apply migrations 011 and 012 in Supabase.**
