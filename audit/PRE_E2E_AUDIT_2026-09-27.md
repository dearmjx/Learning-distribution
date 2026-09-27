# Pre-E2E Audit — 2026-09-27

Scope: the whole codebase on `feat/phase11-research-hardening` (HEAD `d34909c`).
- Three read-only audit passes: backend/security/data, UI/UX, and workflow/AI/tests.
- One live browser pass at phone width (375px) on the dev server in memory mode.
- `npm test` at audit time: 16 files / 63 tests passed. There is **no browser E2E test**.

Findings marked ✔ were re-checked by hand against the code. Severity: **B** = blocks the E2E/pilot, **H** = high, **M** = medium, **L** = low.

## Verdict

**Not ready for LOS-009 or the pilot.**
- Three research-data problems would put fabricated content into the dataset:
  - pre-filled student answers (Phases 2 and 7);
  - a fake peer review in Phase 6;
  - canned peer-review text in Phase 5.
- Two database problems would silently corrupt or truncate it:
  - a 1000-row cap on Supabase queries;
  - students can rewrite their own frozen Draft 1.
- Consent can't be enforced yet.

---

## A. Fabricated or corrupted research data (fix first)

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| A1 ✔ | B | `phase7-reflection.tsx:21-27` | The reflection starts pre-filled: a full Thai paragraph, scores 4/5, "high", and every concept ticked. A student can submit it without typing anything. | Start empty with no score selected, and require text. |
| A2 ✔ | B | `phase2-identification.tsx:11-22` | The variables and hypothesis are pre-filled with the correct answers. | Use placeholders only, and require input. |
| A3 ✔ | B | `phase6-revision.tsx:36-57` + `api/peer-reviews/route.ts:33` | GET ignores `authorId` and never returns `reviews`, so **every student sees a hardcoded fake peer review** ("peer-student-05"). Their accept/reject decisions are then logged against the fake text. Real reviews never reach their authors. | Add a "reviews received" query (RPC/RLS on author) and remove the synthetic fallback outside demo mode. |
| A4 | B | `phase5-peer-review.tsx:21-23,59-61,81-84,256` | Scores default to 4/3/3. Empty strengths and suggestions are replaced by canned Thai text. Next is enabled without submitting a review. | Start with no score, require typed text, and gate Next on `submittedReview`. |
| A5 | H | `phase6-revision.tsx:70,86-104` | Feedback decisions are optional, and clicking one auto-fills a canned justification. | Require a decision plus the student's own justification for each item. |
| A6 ✔ | B | `supabase-repository.ts:403` | Reflections are stored with `confidence_score ?? 3`, and the UI sends `confidenceRating`, so **every reflection is saved as 3**. The analytical and AI-literacy scores aren't saved to the table. No submissionId is sent. | Map the fields properly, persist the scores, and send the submissionId. |
| A7 ✔ | B | `supabase-repository.ts` list queries (no `.range`) | Supabase returns at most 1000 rows. About 57 students × 2 events per chat turn passes that in one lesson. Rows are ordered newest-first, so the **oldest (Draft 1) events are dropped silently** from the export and roster. | Paginate with `.range()`, or move the export into a SQL function or view. |
| A8 ✔ | H | `006_phase9_rls.sql:159-161` | A student can UPDATE any column of their own submission through the REST API, which includes rewriting the frozen Draft 1. Students can also insert arbitrary `learning_events`. | Revoke UPDATE; change workflow state through a SECURITY DEFINER RPC; add a frozen-row trigger; whitelist the event types students may insert. |
| A9 | M | `export.ts:163,183,189,212` | The export still fills in some values: freeze time falls back to submit time, hint cost to 0, authorship to "none", and start time to `new Date()`. | Emit a blank for each. |

## B. Consent, privacy, de-identification

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| B1 ✔ | B | `006_phase9_rls.sql:237-239` + no app code | Consent is never checked. Teachers can't read `consent_records`, so a naive filter would drop everyone. **Students can grant their own consent**, which PDPA doesn't allow for minors, who need a guardian. | Remove the student insert/update policies; add a SECURITY DEFINER `consented_profile_ids()`; filter the export by it. |
| B2 | H | `export.ts:86-103,167` | The participant key reveals the real ID (`40105`→`M41_05`, `PARTICIPANT_<id>`). The hash has no salt. The classroom is guessed from the ID string, and the class prefix check never matches. `research_identity_mapping` is never used. | Use `research_identity_mapping` or an HMAC with a server secret, and take the class from `class_id`. |
| B3 | H | `export.ts:323-356` | The event export includes raw chat, CER and observation text, and its rows have no participant key. | Whitelist payload fields per event type and add participantKey. |
| B4 | M | `api/research/export/route.ts:13` | Any teacher can export. The researcher role can't be reached in Supabase mode. | Gate the export on an explicit researcher permission. |
| B5 | M | sessions, reflections, peer-reviews, coach/chat and activities routes | Personal data is served without `Cache-Control: no-store`, which matters on shared school PCs. | Set it in middleware for `/api/*`. |
| B6 | M | `export.ts:271` | The CSV is open to formula injection: student text starting with `= + - @` runs as a formula in Excel. | Prefix those values with `'`. |

## C. Workflow and state

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| C1 ✔ | B (demo mode) | `student-workbench.tsx` picker + local identity | In memory mode the picker sends `40101` but the server identity is `demo-student-01`, so **Phase 4 submit returns 403**. Verified live. | In memory mode, drop the picker or send no studentId (let the server decide). |
| C2 | H | `api/peer-reviews/route.ts:79-81` | The state transition runs on the peer's submission, so it never fires. The peer_review, revision, reflection and completed states can't be reached from the student side. | Transition the reviewer's own latest submission. |
| C3 | H | reflections + peer-reviews POST | There's no draft-first gate, so a reflection can be posted with no work done. | Add the same `latestSubmission` gate the chat uses. |
| C4 | H | `student-workbench.tsx:28-40` | Everything is lost on refresh or when a phone sleeps: the student goes back to Phase 1, and re-freezing makes a second baseline. | Rebuild progress from `/api/sessions` and keep a localStorage draft. |
| C5 | H | `phase4-argumentation.tsx:151-163` | "ปลดล็อคเพื่อแก้ไข" lets the student edit the frozen baseline, and a re-freeze POSTs again. | Remove the unlock, or route edits to the Phase 6 revision. |
| C6 | H | `phase6-revision.tsx:315`, `phase7-reflection.tsx:167` | The submit buttons stay enabled after success, so double submits create v3, v4 and duplicate reflections. | Disable the button after success. |
| C7 | M | `sessions/route.ts:44-83` | A retry with the same idempotency key recomputes the version and overwrites the baseline. The UI never sends a key. | Short-circuit on a known key, and send a requestId per click. |
| C8 | H | `supabase-identity.ts:85` + teacher queries | A teacher with two classes (M.4/1 and M.4/2) gets an arbitrary class, and the exports merge both. | Filter every teacher query by `class_id` and add an explicit class picker. |
| C9 | H | `teacher/roster/route.ts:128,157` | Supabase sorts newest-first but the route takes `[length-1]`, so the roster shows the **oldest** state as "latest". | Sort explicitly in the route. |
| C10 | H | `teacher-review-dashboard.tsx:68-80` | Reopening a reviewed submission shows default scores (3s, 75), so saving overwrites the real review. | Seed the form from the existing review. |
| C11 | M | `007_phase9_peer_review_rpc.sql:55-64` | Peer assignment can hand out a synthetic draft or an old version. | Use each author's latest version only; in the E2E, submit both Phase 4s first. |
| C12 | M | Phases 1-3 | No events are logged and investigation data is never saved. | Add a phase-progress event, and add `investigationData` to the session schema. |

## D. AI and ops

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| D1 | H | `local-provider.ts:30` | The Ollama fetch has no timeout, so a hung model blocks the class for about 5 minutes per request. | `AbortSignal.timeout(LOCAL_LLM_TIMEOUT_MS ?? 30000)`. |
| D2 | H | `coach.ts:28-31,145-156`, `/api/ready` | A wrong model name silently falls back to Mock, so an E2E can "pass" without Ollama. | `/api/ready` checks the model is in `/v1/models`; the E2E asserts `provider==="local"` and `fallbackUsed===false`. |
| D3 | M | `education-policy.ts:19,45-62`, `coach/chat/route.ts:21-29` | The guardrail is weak: any text containing "?" passes. The client can forge earlier `assistant` history turns. | Keep chat history server-side and add answer-leak heuristics. |
| D4 | M | `supabase-identity.ts:135-140` | Every database error becomes an unlogged 500 "identity" error, which makes E2E debugging blind. | Log the original error; map 42501→403 and a repeat review→409. |
| D5 | L | `/api/sessions` | No rate limit, and each call triggers an LLM call. | Reuse `rate-limit.ts`. |
| D6 | L | `002_row_level_security.sql:15-36` | The old SECURITY DEFINER functions have no `search_path` and are no longer used. | Drop them. |
| D7 | L | request.json() in 5 routes | Malformed JSON causes a 500. | Return 400. |

## E. UI/UX

| # | Sev | Where | Problem |
|---|---|---|---|
| E1 | B | `phase5-peer-review.tsx:29-54,241` | A failed fetch leaves the student stuck with no message. There's no `res.ok` check in Phases 5 and 6; errors fall back to fake data instead. |
| E2 | B | `student-workbench.tsx:81-99` | The `/api/activities` failure crashes the page (`activities.map` on undefined), and there's no loading state. |
| E3 ✔ | H | live at 375px | `/student/activity` (388px) and `/teacher/roster` (456px, table without a scroll wrapper) scroll sideways on phones. |
| E4 ✔ | M | `student-workbench.tsx:217,323,327` | Students see the "แดชบอร์ดครู" link and the developer "LM Studio Telemetry" console and footer. |
| E5 | M | Phase 4 and chat copy | "✓ Direct answer ถูกบล็อก" is always shown. "Local Ollama" and `ornith:9b` are hardcoded. |
| E6 | M | roster route, workbench, phase 7 | Hardcoded "57 คน", "29/28 คน", and the "2 Versions / 1 Peer Review" certificate. |
| E7 | M | teacher pages, timeline, `/demo` | Mostly English headings. Raw event codes and activity IDs are shown. English server errors reach students. |
| E8 | H | `teacher-roster-view.tsx:236` | The roster's "ตรวจงาน" link passes `?studentId=`, but the dashboard ignores it. |
| E9 | L | several | Accessibility: range sliders and observation fields have no label link; the chat input has no label; toggles show state by color only (no `aria-pressed`); the stepper has no `aria-current`; Phase 3 uses a clickable `<tr>`; one unlabeled select on `/teacher/analytics`. |

## F. What the LOS-009 E2E needs

- There is no browser E2E test, so add `@playwright/test`. Minimal script:
  1. Check `/api/ready` returns 200 **and** that the model exists.
  2. Use two student contexts plus one teacher, all signing in through real auth.
  3. Students A and B both complete Phases 1-4 **before** either opens Phase 5. Assert `provider==="local"` and `fallbackUsed===false`.
  4. Open one chat turn per student.
  5. Phase 5: A reviews B's work and B reviews A's (not synthetic), with no identities shown.
  6. Phase 6: the review shown is the peer's real text, and the revision is saved as v2.
  7. Phase 7: submit the reflection.
  8. Teacher: review both students and add an observation.
  9. Teacher: export and assert every event type is present per student, plus the correct reflection confidence.
  10. Negative checks: a double-click on freeze creates no duplicate, and student A cannot read B's data (403).
- With the current code, **steps 5, 6 and 9 fail** because of A3, A6 and C2.
- Unit tests to add:
  - the peer-review state transition;
  - Phase 6 receives real reviews;
  - reflection 409 with no work, and the confidence mapping;
  - idempotent replay;
  - a hung-LLM timeout;
  - a guardrail full-CER leak;
  - a repeat teacher review returns 409.

## Suggested ticket batches

1. **LOS-014 Research-data integrity:** A1-A6, A9, E1, E2.
2. **LOS-015 Database hardening:** A7, A8, B1 (consent), B2, C8, C9, D6.
3. **LOS-016 Workflow state and resilience:** C1-C7, C10-C12, D4, D7.
4. **LOS-017 AI ops:** D1, D2, D3, D5.
5. **LOS-018 UI/UX polish:** E3-E9, B5, B6.
6. **LOS-019 Playwright E2E:** section F. This then unblocks LOS-009.
