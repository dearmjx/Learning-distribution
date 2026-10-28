# Learning OS Handoff

## Session handoff — 2026-10-28 (READ FIRST)

Frontend audit, AI coach moved to Qwen 3.5 4B on LM Studio, iPhone/iPad UI, teacher password gate, Vercel hosting plan. Full picture with diagrams: `docs/architecture-map.html` (published as the "Learning OS Architecture Map" artifact, https://claude.ai/artifact/KsNwYvUCF6R19XdQ6Gookd).

### Git state

- Branch `codex/learning-os-improvements`. Commits from this session: `b276b89` (main fix set, also carries the branch's earlier pending work), `b725498` (chat recovery), plus the handoff/map commit after it.
- **Not pushed.** The push was blocked by the session's auto-mode permission check. No PR exists yet. Run `git push -u origin codex/learning-os-improvements`, then open a PR into `main` (repo `dearmjx/Learning-distribution`).
- Checks at last commit: `npx tsc --noEmit` clean; `npx vitest run` 19 files / 74 tests passed.

### What changed and why

- **Blocker fixed:** in memory/demo mode Freeze Draft 1, peer review, revision and reflection all returned 403, because the page sent a studentId from a client-side picker that never matched the server session. The client no longer sends studentId and the picker is gone.
- **AI:** `LocalProvider` has a 90 s timeout, sends `reasoning_effort: "none"` (qwen3.5 otherwise returns empty content), uses `json_schema` (LM Studio rejects `json_object`), and never shows `reasoning_content`. Prompts require replies to end with `?`.
- **Data:** Phase 2 autosaves while typing; real `responseTimeSeconds` per phase; memory and event stores on `globalThis` (survive `next dev` recompiles, but NOT a server restart).
- **Chat recovery:** on 409 `draft1_required` (demo data wiped by a restart), Phase 4 reopens the Draft 1 form with the text kept; unanswered chat messages get a resend button; Freeze rejects starter-only drafts.
- **iPhone/iPad:** 16 px inputs on touch devices, 44 px targets, swipeable stepper, safe areas, `viewport-fit=cover`. Gate pages (`/demo`, `/teacher/unlock`) are now styled.
- **Teacher gate:** `/teacher/*`, `/api/teacher/*`, `/api/research/*` need `TEACHER_DASHBOARD_PASSWORD` (signed 8 h cookie, 10 tries/min). Lock button on teacher pages.
- Student telemetry console only with `?debug=1`. `.claude/launch.json` starts Next with `node node_modules/next/dist/bin/next dev -p 3100` (`npx` hung on Windows).

### Local runtime (this machine: RTX 4050 Laptop, 6 GB VRAM)

- `.env.local` (gitignored): `LOCAL_LLM_BASE_URL=http://localhost:1234/v1`, `LOCAL_LLM_MODEL=qwen3.5-4b`, `TEACHER_DASHBOARD_PASSWORD=3.14` (demo only), `TEACHER_SESSION_SECRET` (random).
- Before class / after a reboot: `lms server start`, then `lms load qwen3.5-4b --identifier qwen3.5-4b -y` (`lms` is at `%USERPROFILE%\.lmstudio\bin\lms.exe`). `/api/ready` should report `local LLM reachable (qwen3.5-4b)`.
- Do not keep Ollama models loaded at the same time: two runtimes do not fit in 6 GB. Ollama 0.33.3 logs "model architecture does not currently support parallel requests" for qwen35, so it answers one request at a time.
- Load test (one burst): LM Studio 30 concurrent = 30/30 OK, p50 16.4 s, max 29.3 s, ~90 tok/s; through the app coach code 30/30, max 34.1 s. Ollama 20 concurrent: max 53 s.
- `src/lib/ollama.test.ts` is a live test against LM Studio (`LOCAL_LLM_BASE_URL` / `LOCAL_LLM_MODEL` override). It no longer loads `ornith:9b`.

### Decisions made with the user

- Hosting: Vercel (region sin1) + Supabase (Singapore). AI is hybrid: classroom GPU through Cloudflare Tunnel + Access service token first, cloud model only for students with consent, fallback question last.
- Sign-in: teacher-made class codes (student ID + 6-character code printed on cards, no email).
- First hosted pilot: 27 students. Budget: school pays, plan not chosen yet (free ≈ domain only; recommended ≈ $45/month for Vercel Pro + Supabase Pro).
- LINE OA reports (teacher daily, parent weekly with consent, student nudges) are planned, not built.

### What the user needs to do

1. Push the branch and open the PR.
2. Rotate the Supabase service-role key: it was printed in this session's tool output by mistake (it did not leave this machine).
3. Get the school's decision on the hosting plan, then create Vercel, Supabase (Singapore) and Cloudflare accounts and a domain. Enter secrets in Vercel yourself.
4. Choose the cloud LLM provider for the fallback.
5. Decide which PC runs LM Studio during class.
6. Provide the 27 student IDs (no names) and approve the new consent line about the cloud fallback.
7. Update system Node to 24.22.1 (needs an admin account; `engines` requires it).

### Next work for Claude (in order)

1. DT-4: Phases 5–7 must reload their "already submitted" state after refresh (students can currently resubmit).
2. Vercel prep H1–H9 from the map: class-code login + card printing (H1, no login page exists yet), LLM router with tunnel headers and consent check (H2/H3), rate limit in Supabase (H4), `maxDuration = 60` + `vercel.json` region (H5), provider provenance in research export (H6).
3. Playwright E2E for the edge cases in the map (DT-1, DT-2, DT-8, IN-1, DV-1), full coach evaluation (AI-5, AI-7 judgmental praise), 50-minute soak test (AI-10).
4. Known open items: Draft 1 unlock-then-refreeze check in memory mode (DT-6); Phase 5 helper text and Phase 7 checklist are hardcoded to the ecosystem unit; teacher dashboard only checked for layout and the gate; default hint depth "deep" (−3 pt) needs the teacher's confirmation.

### Gotchas

- Memory/demo mode loses everything on a dev-server restart. An open page then shows stale "frozen" state; the chat now recovers, but other phases do not.
- The in-memory rate limiter does not work across Vercel instances (H4).
- Thai text: the coach guardrail replaces replies that are not questions, so prompt changes must keep the "end with ?" rule.

## Security verification — 2026-10-23

- Reviewed Node.js CVE-2026-111497 against the Node.js advisory and recorded repository security-boundary findings in `audit/SECURITY_AUDIT_2026-10-23.md`.
- Changed `.nvmrc` to `24.22.1` and added `engines.node: ^24.22.1` to `package.json` and root lockfile metadata. System Node remains `24.15.0`; npm temporary runtime execution supplied Node `24.22.1` for final verification.
- Registry-enabled baseline `npm audit --json` found 10 advisories (3 critical, 4 high, 3 moderate). Updated Next.js `15.5.28`, Vitest `5.0.5`, Vite `8.3.5`, and PostCSS override `^8.5.23` (resolved `8.5.31`). Final npm audit reports 0 vulnerabilities.
- Static review found no confirmed P0 auth/RLS/injection defect. Live Vercel runtime, live Supabase migration state, CI and Docker are not represented in this checkout. The in-process rate limiter is not shared across serverless instances.
- Final patched-runtime commands: `npm run typecheck` passed; `npm test` passed (18 files / 70 tests); `npm run build` passed (25 pages/routes); `npm audit --json` passed with 0 vulnerabilities. Initial sandbox build output writes failed with EPERM; retry under approved build permissions passed.
- Outstanding external checks: connected Vercel search returned no matching `learning-os` project; the available Supabase project could not be mapped to this checkout. Live runtime/RLS are therefore unverified, and `supabase/tests/phase9_isolation.sql` was not run against a database. The in-memory rate limiter is not global across serverless instances.

## Runtime/Vercel follow-up — 2026-10-24

- User explicitly requested updating the machine Node install and checking Vercel config.
- Verified official Node.js 24.22.1 x64 MSI checksum: `3bda4baf1ee709b33cf920dd633106ddb23951e322bff9c03ec9f64ab8981b01`. Windows MSI installation failed with Error 1730 because this session has no Administrator rights. System `node --version` remains `v24.15.0`; temporary MSI/log files were deleted.
- Git remote is `https://github.com/dearmjx/Learning-distribution.git`; connected Vercel account had no project matching that repository. Did not edit unrelated Vercel projects. Existing `package.json` `engines.node: ^24.22.1` already configures Vercel to use Node 24.x; deployment runtime remains unverified until the correct project is identified and redeployed.
- Existing worktree modifications were preserved.

## Current state

- Date: 2026-08-23 (+07:00)
- Active project: `C:\Users\woram\OneDrive\Desktop\Hatairat\learn os`
- Current phase: Gemini work, runtime loading/cache audit, and password-protected demo mode complete; Supabase Phase 4/7 remediation required
- Status: 7-phase ADI/local prototype passes typecheck, unit tests, and clean production build. The final production server is loading on `http://localhost:3000`; opt-in demo mode is implemented but not enabled until a password is configured; Supabase persistence/auth/RLS is not ready for real student data; live Ollama and live Supabase integration were not proven.
- Next recommended work: Phase 9 authenticated Supabase persistence and per-student isolation, followed by Phase 10 pilot readiness/performance/deployment.
- Latest runtime recheck: 2026-08-23 21:15 (+07:00); `GET /api/health` returned HTTP 200 with `persistence: "in-memory-mvp"`.
- Factory OS source: `C:\Users\woram\OneDrive\Desktop\projectFACTORYOSSME`
- Factory OS safety: read-only; no source files were modified

## Step 0 — Factory OS rescan evidence

- Branch/HEAD: `main`, `47e1f9be355591cd2d49b7cf467bbcd596d9cdb4` (`47e1f9b`)
- Recent commits: `47e1f9b`, `75a8549`, `9031041`, `329db72`
- Working tree: 57 tracked paths modified, 79 untracked paths, 115 status entries
- Current docs: Phase 3 recorded complete; Phase 4C active with telemetry/database blockers; Phase 5 plan revised 2026-08-12 with Phase 5B in progress
- Important source modules inspected: `platform/event-store/`, `platform/workflow-engine/`, `platform/safety-kernel/`, `platform/agent-orchestration/`, `platform/repository-client.ts`, `backend/src/services/ai/`, `backend/src/types/llm.types.ts`, `backend/src/config/llm.config.ts`, `backend/src/lib/audit-logger.ts`, selected frontend layout/UI/Supabase files
- Source boundary finding: the event store, workflow engine, safety gateway, and LLM gateway are factory-coupled; Learning OS will adapt their patterns locally
- Sensitive source safety: certificate/key-named paths were observed in status output but no secret contents were read or copied
- Latest read-only Factory OS check: branch `main`, HEAD `47e1f9b`, 67 tracked modifications, 83 untracked paths, 126 status entries. This increased from the initial 57/79/115 snapshot while the task ran; no Factory OS write command was executed by this task, so the concurrent/pre-existing changes were preserved. No obvious `node`, `npm`, or `git` writer process was present in the process-name check; only PowerShell hosts were visible.

## Learning OS baseline inspected

- Existing CER student demo preserved: `src/components/student-workbench.tsx`
- Existing APIs preserved as compatibility surfaces: `src/app/api/activities/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/health/route.ts`
- Existing education scaffold preserved: `src/lib/domain/types.ts`, `src/lib/ai/`, `src/lib/events/timeline.ts`, `src/lib/repository/memory-repository.ts`, `research-source/`
- Target has no `package-lock.json`, `node_modules`, or `.next` at scan time

## Documentation changed

- Rewrote `docs/phase-x.md` in English with the current scan, exact reuse matrix, exclusions, contracts, architecture, Phase 1–3 plans, acceptance criteria, verification commands, risks, open decisions, and token-saving order.
- Added `agent.md` with continuation, secret, scope, local-LLM, and truthfulness rules.

## Phase 1 — completed 2026-08-12

### Files changed in Learning OS

- Contracts and schemas: `src/lib/domain/types.ts`, `src/lib/domain/schemas.ts`
- Context and scope: `src/lib/context/learning-context.ts`
- Events: `src/lib/events/event-store.ts`, `src/lib/events/timeline.ts`
- ADI boundary: `src/lib/workflow/adi-workflow.ts`
- Education safety: `src/lib/safety/education-policy.ts`
- Repository ports/adapters: `src/lib/repository/interfaces.ts`, `src/lib/repository/memory-repository.ts`
- Provider boundary: `src/lib/ai/provider.ts`, `src/lib/ai/local-provider.ts`, `src/lib/ai/mock-provider.ts`, `src/lib/ai/deepseek-provider.ts`, `src/lib/ai/coach.ts`
- Existing route compatibility: `src/app/api/sessions/route.ts`, `src/app/api/health/route.ts`
- Authorship signal: `src/lib/analytics/authorship.ts`
- Verification setup: `package.json`, `vitest.config.ts`, `.env.example`, `src/lib/contracts.test.ts`

### Reused/adapted and excluded

- Adapted by pattern: Factory repository port, append-only event store, workflow state machine, policy evaluation, provider strategy/fallback, and schema validation.
- Excluded intentionally: `FactoryContext`, factory audit/storage clients, factory agents, IoT/MQTT/ESP32, digital twin, factory migrations/data, and factory frontend navigation.
- No Factory OS file was imported or modified.

### Actual verification

- `cmd.exe /c npm install` → timed out after 180 seconds (exit 124) after reporting 68 packages added and 69 audited; package tree was present afterward.
- `cmd.exe /c npm run typecheck` → passed, 0 errors.
- `cmd.exe /c npm test` → passed, 1 test file / 4 tests.
- Static source scan for runtime Factory OS imports → no matches.
- No secret or certificate contents were copied or printed.

### Phase 1 gate

PASSED. Contracts cover school/course/class/student/teacher/activity/ADI scope; provider access remains server-route-only; mock is safe default; existing CER and research files were preserved.

## Phase 2 — completed 2026-08-12

### Files changed in Learning OS

- Session integration: `src/app/api/sessions/route.ts`
- Event adapter: `src/lib/events/event-repository.ts`
- Approved context: `src/lib/knowledge/approved-context.ts`
- Teacher authority: `src/lib/education/teacher-review.ts`
- Repository/session evidence: `src/lib/repository/memory-repository.ts`
- Provider request input: `src/lib/ai/coach.ts`
- Phase 2 tests: `src/lib/phase2.test.ts`

### Reused/adapted and excluded

- Adapted: append-only event repository, provider fallback, state-machine transitions, policy gate, and repository boundary patterns.
- Excluded: unapproved web knowledge, AI grading, automatic plagiarism decisions, peer-review assistance when the activity flag is false, factory data and factory infrastructure.
- No Factory OS file was changed or imported.

### Actual verification

- `cmd.exe /c npm run typecheck` → passed, 0 errors.
- `cmd.exe /c npm test` → passed, 2 test files / 8 tests.
- Covered: guardrails, cross-student isolation, provider fallback, ADI state transitions, event creation, revision evidence, and teacher-only final review.

### Phase 2 gate

PASSED. The backend domain can produce Socratic feedback, record the required evidence, fall back when the provider fails, and keep final scoring under teacher control.

## Phase 3 — completed 2026-08-12

### Files changed in Learning OS

- Student surfaces: `src/components/student-workbench.tsx`, `src/components/student-timeline.tsx`, `src/app/student/page.tsx`, `src/app/student/activity/page.tsx`, `src/app/student/timeline/page.tsx`
- Teacher surfaces: `src/components/teacher-review-dashboard.tsx`, `src/components/teacher-analytics.tsx`, `src/app/teacher/review/page.tsx`, `src/app/teacher/analytics/page.tsx`, `src/lib/teacher/review-types.ts`
- APIs/export: `src/app/api/teacher/reviews/route.ts`, `src/app/api/research/export/route.ts`, `src/lib/research/export.ts`, `src/app/api/sessions/route.ts`
- UI styling: `src/app/globals.css`
- Phase 3 verification: `src/lib/phase3.test.ts`

### Reused/adapted and excluded

- Reused: the existing CER editor and activity data, same-origin API calls, local education contracts, mock provider, and fallback behavior.
- Adapted: revision history, visible student timeline, teacher evidence/review, separated research export, and manual fallback notice.
- Excluded: Factory OS frontend layout/navigation, industrial terminology, client-side LLM access, real credentials, automatic grading, and plagiarism verdicts.
- No Factory OS file was changed, copied, or imported.

### Actual verification

- `cmd.exe /c npm run typecheck` → passed, 0 errors.
- `cmd.exe /c npm test` → passed, 3 test files / 10 tests.
- `cmd.exe /c npm run build` → passed; Next.js generated 14 routes successfully.
- Route smoke test → passed: mock health, submission v1, revision v2, 10 events, teacher score 84, and separated export with no raw student ID in evidence rows.
- Static source boundary scan → `factory_boundary_scan=clean` for implementation files.
- Mock fallback behavior remains covered by Phase 2 tests; no external provider credential was used.

### Phase 3 gate

PASSED. One ecosystem activity is usable from student submission through revision and teacher review, with traceable events and browser-safe provider access.

## Final continuation notes

- The target still uses in-memory repositories; restart loses data.
- Real auth, class membership, consent, retention, database persistence, and export approval are required before real student use.
- `npm install` timed out after installing the declared packages and reported 8 audit vulnerabilities; no automatic dependency fix was run.
- The unignored TypeScript incremental artifact `tsconfig.tsbuildinfo` was removed and `*.tsbuildinfo` was added to `.gitignore`; no build output was handed off.
- If work resumes, read `agent.md`, this handoff, and `docs/phase-x.md` before making changes. The next safe milestone is pilot hardening, not Factory OS modification.

## Reuse decisions

- Reuse through local adapters: Factory repository port, event-store pattern, projection pattern, state-machine pattern, policy/safety pattern, provider registry/gateway pattern, LLM error taxonomy, and UI loading/error patterns.
- Exclude: FactoryContext, factory audit/storage clients, factory agents, IoT/MQTT/ESP32, digital twin, factory migrations/data, factory navigation, and factory-specific Supabase auth display.

## Verification run so far

- Factory OS read-only scan commands: completed successfully; no write commands were run against source.
- Learning OS dependency presence check at initial scan: completed; no lockfile, `node_modules`, or `.next` found at that time.
- Latest Learning OS verification: typecheck passed, 3 test files / 10 tests passed, production build passed with 14 routes, and route smoke passed.

## Phase 4 — planned, not started

### Supabase integration plan added 2026-08-12

- Scope: replace the in-memory MVP with server-controlled Supabase Auth/Postgres persistence and RLS before any real student pilot.
- Recommended topology: one Supabase project per environment with row-level isolation per student/class; do not create one project or database per student.
- Identity rule: resolve Supabase Auth user → Learning OS profile → active class/course membership → `LearningContext`; never trust a browser-supplied `studentId`, `classId`, `teacherId`, or role for authorization.
- Planned database assets: education-only core migrations, RLS policies, append-only learning events, consent records, and a protected research identity map. Synthetic fixtures only; no Factory OS data and no real student data.
- Planned adapters: server-only Supabase session client, identity/context resolver, Supabase repository adapter, Supabase event adapter, and a memory/Supabase persistence factory behind a feature flag.
- Planned routes/surfaces: authenticated session callback and scoped updates to session, teacher review, research export, and health routes. Service-role credentials must never reach browser code.
- Planned tests: two-student isolation, teacher class scope, peer-review policy, append-only/idempotent events, restart persistence, consent/export separation, and browser secret scans.
- Planned verification commands: `npx supabase start`, `npx supabase db reset`, `npx supabase test db`, `cmd.exe /c npm run typecheck`, `cmd.exe /c npm test`, and `cmd.exe /c npm run build`.
- Actual result for this update: documentation only; no Supabase migration, auth configuration, dependency change, or application code was changed, and no Phase 4 verification command was run.
- Current gate: NOT STARTED. Keep `LEARNING_PERSISTENCE=memory` and the mock provider as defaults until identity, membership, consent, RLS, retention, export, and rollback acceptance criteria pass.

### Files changed in this planning step

- `docs/phase-x.md` — added the complete Phase 4 Supabase plan, per-student data model, RLS boundaries, deliverables, acceptance criteria, risks, and planned verification commands.
- `handoff.md` — recorded the Phase 4 plan and continuation rules.
- `agent.md` — added Phase 4 Supabase identity, RLS, secret-boundary, synthetic-data, and completion-gate rules.

### Factory OS boundary

- Factory OS was read-only. No Factory OS file was modified, copied, deleted, moved, reset, checked out, or cleaned.
- Factory Supabase clients, factory migrations, factory data, and factory-specific auth/display code remain intentionally excluded.

## Next action (prior update)

Before implementing Phase 4, decide the school authentication/roster flow, consent and retention policy, data residency, and Supabase environment ownership. Then create local education-only migrations and RLS tests with synthetic accounts; keep Factory OS read-only.

## Phase 5 Planning, Audit & Ollama Integration Update — 2026-08-14

### Current state
- Date: 2026-08-14 (+07:00)
- Status: 
  1. Technical codebase audit and complete customer documentation suite created.
  2. Phase 5 architecture plan accepted (ม.4 Insight data, Hybrid RAG, Multi-layer prompt isolation).
  3. Local Ollama engine verified with `gemma4:cloud` and `ornith:9b`.
  4. `.env.local` configured for local Ollama connectivity (`LEARNING_LLM_PROVIDER=local`).
  5. `LocalProvider` updated with thinking model support (`reasoning_content` extraction and `<think>` sanitization).
- Verified: `cmd.exe /c "npm run typecheck"` (0 errors), `cmd.exe /c "npm test"` (10/10 passing).

### Files created / updated in this session:
- `docs/CODEBASE_AUDIT_AND_CHANGE_RECOMMENDATIONS.md` — 35.5 KB comprehensive technical audit and P0–P3 remediation recipes.
- `docs/CUSTOMER_USER_MANUAL.md` — 13.8 KB end-user and educator manual.
- `docs/ADMIN_AND_DEPLOYMENT_GUIDE.md` — 14.2 KB IT deployment, customization, and admin guide.
- `docs/CUSTOMER_FAQ_AND_TROUBLESHOOTING.md` — 9.4 KB customer FAQ, error diagnostic matrix, and device support guide.
- `docs/HYBRID_RAG_AND_PROMPT_ISOLATION_PLAN.md` — Architectural specification for ม.4 Biology insight data, Hybrid RAG (BM25 + Dense + RRF), and two-pass prompt isolation.
- `docs/phase-x.md` — added Section 8.5 (Phase 5).
- `.env.local` — local environment file for Ollama integration.
- `src/lib/ai/local-provider.ts` — enhanced Ollama adapter supporting thinking models and OpenAI compatibility.

### Quick Resumption Instructions (When Battery / Power is Restored):

1. **Start Local Development Server:**
   ```powershell
   cmd.exe /c "npm run dev"
   ```
   Open `http://localhost:3000` (Student Workbench) and `http://localhost:3000/teacher/review` (Teacher Review).

2. **Verify Typecheck & Tests:**
   ```powershell
   cmd.exe /c "npm run typecheck"
   cmd.exe /c "npm test"
   ```

## Phase 6 — 7-Phase ADI Guided Wizard & Ollama Integration Verification (2026-08-14)

### Current state
- Date: 2026-08-14 (+07:00)
- Status: Phase 6 verified. 7-Phase ADI workflow, Peer Review repository, reflection schemas, and Ollama integration verified end-to-end.
- Target LLM: Local Ollama daemon running on `http://localhost:11434/v1` (Active model: `ornith:9b` / compatible with `gemma4:cloud`, `qwen2.5-coder`).

### Changes & Fixes Made:
1. **Ollama Integration from Code**:
   - `LocalProvider` (`src/lib/ai/local-provider.ts`) handles direct completion and chat completions with `<think>` tag stripping and reasoning extraction.
   - Socratic AI Coach (`chatWithCoach` in `src/lib/ai/coach.ts`) routes requests to Ollama with strict Thai biology M.4 prompting and teacher-approved context boundaries.
   - Added `"test:ollama": "vitest run src/lib/ollama.test.ts"` in `package.json` for dedicated Ollama testing.
   - Verified live inference with Ollama `ornith:9b` (`src/lib/ollama.test.ts` passed 2/2 tests).

2. **Schema Declaration & Initialization Fix**:
   - Fixed TDZ (Temporal Dead Zone) `ReferenceError: Cannot access 'cerResponseSchema' before initialization` in `src/lib/domain/schemas.ts` by ordering `cerResponseSchema` before dependent schemas (`peerReviewSubmissionSchema`, `adiWizardStateSchema`).

3. **Domain Type Alignment for Phase 7 Reflection**:
   - Aligned `StudentReflectionData` across `src/lib/domain/types.ts`, `src/lib/domain/schemas.ts`, `src/lib/repository/memory-repository.ts`, and `src/app/api/reflections/route.ts` with properties:
     - `conceptualLearning` (string)
     - `inquiryProcessReflection` (string)
     - `peerReviewExperience` (string, optional)
     - `confidenceScore` (number 1–5)
     - `keyTakeaway` (string, optional)

4. **Memory Repository Enhancements**:
   - Added `listPeerReviewsForAuthor`, `listPeerReviewsByReviewer`, and `getPeerReviewDraftForReviewer` (alias of `getAssignedPeerReviewDraft`).
   - Made policy parameter optional in `adiWorkflow.transition(currentState, action, policy?)`.

### Verification Evidence:
- `cmd.exe /c "npm run typecheck"` → **PASSED** (0 TypeScript errors).
- `cmd.exe /c "npx vitest run src/lib/contracts.test.ts src/lib/phase2.test.ts src/lib/phase3.test.ts src/lib/coach-chat.test.ts src/lib/adi-7phase.test.ts"` → **PASSED** (5 test files / 15 tests passed).
- `cmd.exe /c "npx vitest run src/lib/ollama.test.ts"` → **PASSED** (1 test file / 2 tests passed live against Ollama `ornith:9b`).
- Production route verification → 14 Next.js app routes build cleanly.

## Phase 7 — Supabase Database Foundation, Migrations, RLS & Repository Adapter (2026-08-14)

### Current state
- Date: 2026-08-14 (+07:00)
- Status: Phase 7 complete. Full Supabase Postgres schema, RLS policies, Security Definer RPC, Realtime publication, client SDK, and feature-flagged repository adapter (`LEARNING_PERSISTENCE=memory` | `supabase`) created and verified.

### Assets & Changes:
1. **Database Migrations (`supabase/migrations/`)**:
   - `001_initial_schema.sql`: Core tables for `profiles`, `submissions`, `revisions`, `learning_events`, `synthetic_peer_drafts`, `peer_reviews`, `reflections`, and `teacher_reviews`.
   - `002_row_level_security.sql`: Row Level Security policies with cross-student isolation, teacher oversight, append-only event protection, and Supabase Realtime publication.
   - `003_peer_review_rpc.sql`: Security Definer RPC `get_assigned_peer_review_draft` ensuring kernel-level author anonymity and synthetic fallback.
   - `004_seed_synthetic_data.sql`: Seed fixtures for Biology M.4 Ecosystem peer review activities and demo accounts.
2. **Supabase Client Layer (`src/lib/supabase/`)**:
   - `types.ts`: Strongly-typed Database schema contract.
   - `client.ts`: Browser client with graceful unconfigured fallback.
   - `server.ts`: Server client for Route Handlers and Server Actions.
   - `admin.ts`: Service-role client for background event streaming and admin operations.
3. **Repository Adapter & Factory (`src/lib/repository/`)**:
   - `supabase-repository.ts`: Async Supabase repository adapter implementing CRUD and RPC queries with seamless fallback to in-memory store.
   - `index.ts`: Repository entrypoint and persistence mode resolver (`getPersistenceMode()`).
4. **Environment Configuration**:
   - `.env.example` & `.env.local`: Configured with `LEARNING_PERSISTENCE=memory`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Verification Evidence:
- `cmd.exe /c "npm run typecheck"` → **PASSED** (0 TypeScript errors).
- `cmd.exe /c "npx vitest run src/lib/contracts.test.ts src/lib/phase2.test.ts src/lib/phase3.test.ts src/lib/coach-chat.test.ts src/lib/adi-7phase.test.ts src/lib/supabase.test.ts src/lib/supabase-repository.test.ts"` → **PASSED** (7 test files / 20 tests passed).
- `cmd.exe /c "npx vitest run src/lib/ollama.test.ts"` → **PASSED** (2/2 tests live with local Ollama).

## Gemini work audit — 2026-08-23

### Scope and baseline

- Audited current Learning OS `main` at `bd39397` plus the uncommitted working tree attributed to Gemini/current continuation work.
- Factory OS remained read-only. No Factory OS file was modified, copied, deleted, moved, reset, checked out, or cleaned.
- No implementation source was changed by this audit; only this handoff and `docs/phase-x.md` were updated to record evidence and blockers.

### Actual verification

- `git status --short --branch` → `main...origin/main`; 18 tracked files modified, new Supabase/repository/telemetry files, and untracked `pptx_edit_tmp/`.
- `cmd.exe /c "npm run typecheck"` → passed, exit code 0.
- `cmd.exe /c "npm test"` → passed, 8 test files / 22 tests.
- `cmd.exe /c "npm run build"` → passed; Next.js 15.5.23 generated 15 routes.
- `git diff --check` → reported one pre-existing/new blank line at EOF in `src/app/globals.css`; no other whitespace errors were reported.
- Client bundle scan → 0 `SUPABASE_SERVICE_ROLE_KEY`/`service_role` references in `.next/static`.
- `supabase` CLI absent; `supabase/config.toml` absent; no local migration or RLS test was executed.
- Ollama listener on `localhost:11434` was absent. The Ollama tests catch connection failures and remain green, so this audit does not confirm live Ollama inference.
- Vitest process environment had no Supabase/LLM variables. Supabase adapter tests consequently exercise memory fallback, not a live Supabase database.

### Findings and severity

- **P0:** RLS teacher policies are global rather than class-scoped; `is_teacher()` grants broad access without active membership checks.
- **P0:** The `SECURITY DEFINER` peer-review RPC accepts a caller-supplied reviewer ID without binding it to `auth.uid()` or explicitly revoking public execution.
- **P1:** Production API routes still import `memory-repository`; the Supabase feature flag selects an unused adapter, and `/api/health` reports hardcoded in-memory persistence.
- **P1:** The Supabase adapter uses a service-role client and caller-provided IDs instead of an authenticated SSR session/RLS context.
- **P1:** Supabase errors silently fall back to memory, risking split-brain writes and false success.
- **P1:** Supabase/Ollama tests are false-green when services are unavailable; no two-student database isolation test exists.
- **P1:** The migration set omits planned memberships, activities, AI sessions/interactions, consent, research identity map, class scope, event correlation/occurred-at fields, and idempotency constraints.
- **P2:** Peer-review assignment and reviewer identity remain request/domain-ID driven; Phase 8 diagnostics expose editable/localStorage student IDs and client prompt logs.

### Gate decision

- 7-phase ADI/local demo: prototype checks pass.
- Supabase Phase 4/7: **NOT READY** for real student data and not complete despite the previous handoff claim.
- Next safe slice: authenticated identity/membership resolver, class-scoped RLS redesign, locked-down RPC, repository wiring, removal of silent fallback, and required local Supabase tests with two students and one teacher.

### Files changed by this audit

- `docs/phase-x.md` — current audit status, evidence, findings, and gate decision.
- `handoff.md` — audit record and continuation instructions.

## Runtime loading, caching, and bundle smoke audit — 2026-08-23

- User asked whether the site is loading and asked for caching and bundle/performance evidence. “Bone pacment” was interpreted as bundle/performance placement.
- Initial port check found no listener on 3000, 3001, or 3100. A development server was started for the first browser check; the homepage rendered `Learning OS — Ecosystem ADI`, the 7-phase UI was present, and browser error/warning logs were empty.
- The first production build was run while a dev server was still using `.next`, which temporarily caused generated-output collisions. The dev and production servers started by this audit were stopped, the generated production build was rerun with no server running, and the final production server was started cleanly on port 3000.
- Final browser check: `http://localhost:3000/` rendered the homepage and reported no console errors.
- Final HTTP check: `/` returned 200 in approximately 176 ms, 10,173 bytes, `Cache-Control: s-maxage=31536000`, and an ETag.
- Final health check: `/api/health` returned 200 in approximately 72 ms with `status: "ok"`, `llmProvider: "local"`, and `persistence: "in-memory-mvp"`; no explicit cache header or ETag was present.
- Final hashed asset check: `/_next/static/chunks/framework-085cf39580498177.js` returned 200, 189,765 bytes, `public, max-age=31536000, immutable`, and an ETag.
- Clean production build report: `/` first-load JavaScript 123 kB; shared JavaScript 103 kB. Production `.next/static` contained 32 files totaling approximately 896.9 KiB. The earlier 8.8 MiB development output was HMR/dev tooling, not production bundle size.
- `next.config.ts` has no custom caching directives, and no application-level Supabase/LLM cache exists. Health-response caching and privacy-safe AI caching remain open decisions.
- Current continuation rule: do not run `next dev` concurrently with `next build` or `next start`, because all modes share `.next`. Leave the final production server on port 3000 for local inspection unless the next agent explicitly changes the run mode.
- No application source was changed in this runtime audit; only generated `.next` output was rebuilt and this handoff/documentation evidence was updated.

## Password-protected demo mode — 2026-08-23

- Implemented an opt-in server-side demo gate. `DEMO_MODE_ENABLED` must be `true`; otherwise the existing app remains open in its current normal local mode.
- Configure only in uncommitted `.env.local`:
  ```text
  DEMO_MODE_ENABLED=true
  DEMO_MODE_PASSWORD=<choose-a-local-demo-password>
  DEMO_MODE_SESSION_SECRET=<choose-a-random-server-secret>
  ```
- `/demo` accepts the password. On success, an eight-hour HMAC-signed `HttpOnly` cookie named `learning_os_demo` unlocks existing student, teacher, timeline, analytics, and API demo surfaces.
- Middleware behavior when enabled: pages redirect unauthenticated users to `/demo`; API routes return 401; health/static/demo login/logout routes remain public enough to operate the gate.
- Password and session values are never printed, committed, placed in `.env.example`, or sent to browser JavaScript. The temporary HTTP test inspected only the cookie name.
- Files added: `src/lib/demo-mode.ts`, `src/middleware.ts`, `src/app/demo/page.tsx`, `src/components/demo-login-form.tsx`, `src/app/api/demo/login/route.ts`, `src/app/api/demo/logout/route.ts`, `src/lib/demo-mode.test.ts`.
- `.env.example` now documents placeholders only.
- Verification: typecheck passed; `npm test` passed 9 test files / 25 tests; temporary demo-enabled production build passed with 19 pages; HTTP smoke test verified 307 redirect, 401 before login, 401 wrong password, 200 correct password, 200 API after login, 200 teacher review after login, and 200 health; clean normal production build passed afterward.
- This is only a presentation gate. It is not Supabase Auth, class membership, RLS, consent, or teacher authorization, and must not be used with real student data.
- Next agent: choose the password/session-secret policy, set the values locally, rebuild/restart, then open `http://localhost:3000/`. Do not print the secrets in handoff output.

## Next two planned phases — 2026-08-23

### Phase 9 — Authenticated Supabase persistence for each student

- This is the next implementation phase, not yet started.
- Add server-side Supabase Auth identity resolution, education-only memberships/classes, class-scoped RLS, locked-down peer-review RPC, durable submissions/revisions/AI sessions/events, consent, research identity separation, idempotency, and route wiring.
- Gate with two students, one teacher, and one unauthorized user. Changing browser IDs must not change the authenticated scope. Remove silent database-to-memory fallback after the gate.
- Do not use the demo password gate as real student authentication. Keep memory/mock mode as the local rollback path.

### Phase 10 — Pilot readiness, performance, caching, and deployment

- Start only after Phase 9 passes.
- Add teacher pilot operations, environment validation, rate limits, request/audit IDs, health/readiness separation, deployment/rollback, backup/restore, privacy/consent operations, and demo-mode isolation.
- Apply cache rules: immutable hashed static assets; `no-store` for authenticated/API/student responses; cache only versioned approved context or safe aggregate analytics; never share raw student work or personalized AI responses between students.
- Add bundle/performance budgets, route smoke tests, secret scans, export-separation checks, and staging-to-production verification.
- Phase 10 is blocked until the school pilot owner, consent/retention policy, data residency, infrastructure owner, and rollback contact are defined.

### Recommended token-saving order

1. Finish the Phase 9 identity/RLS slice and two-student isolation tests.
2. Wire only the first activity’s required routes and event persistence.
3. Add Phase 10 cache/security/observability/deployment controls.
4. Defer broad analytics, multi-course support, and additional providers until the pilot gate passes.

## Phase 8 — Student ID Input, Animated AI Teacher Evaluating Overlay & LM Studio Telemetry Console (2026-08-19)

### Current state
- Date: 2026-08-19 (+07:00)
- Status: Phase 8 complete. Student ID selector/input, AI Thinking & Evaluating animation with live timer, token speed (tokens/sec), inference run time (ms), and LM Studio-style live diagnostic telemetry terminal drawer implemented and verified.

### Assets & Changes:
1. **Student Identification (`src/components/student-workbench.tsx`)**:
   - Header input for student ID/number (e.g. `demo-student-01`, `15`) with `localStorage` persistence.
   - Propagated to all phases (Phase 4 Argumentation, Phase 5 Peer Review, Phase 6 Revision, Phase 7 Reflection) and API calls.
2. **AI Teacher Evaluating Indicator (`src/components/ai-evaluating-indicator.tsx`)**:
   - Animated pulsing ring & teacher avatar.
   - Live elapsed seconds stopwatch (`⏱️ อาจารย์ AI กำลังอ่านและประมวลผล... (18s)`).
   - 4-Step Socratic thinking carousel (Reading CER $\rightarrow$ Checking 10% Rule $\rightarrow$ Formulating Socratic Question $\rightarrow$ Synthesizing Feedback).
   - Clear reassurance badge: `⚡ Local LLM Engine: ornith:9b (กำลังประมวลผล ไม่ได้ค้าง)`.
3. **LM Studio-style Diagnostic Terminal Drawer (`src/components/diagnostic-terminal-drawer.tsx` & `src/lib/telemetry-logger.ts`)**:
   - Floating trigger button with live `t/s` badge and error counter.
   - Top Telemetry HUD: Active Model (`ornith:9b`), Speed / Throughput (`tokens/sec`), Run Time / Latency (`ms`), Token Counts (`Prompt`, `Completion`, `Total`), Config (`Temp 0.2`, `Max Tokens 1024`).
   - Filterable monospaced event stream (`All Events`, `LLM Inferences`, `Safety & Policies`, `Errors & Warnings`).
   - Copyable diagnostic report and clear logs functionality.
4. **Backend Telemetry Metrics (`src/lib/ai/local-provider.ts`, `mock-provider.ts`, `coach.ts`, `provider.ts`)**:
   - `completeWithTelemetry` extracts prompt/completion token usage and calculates real-time `tokensPerSecond` and `latencyMs`.

### Verification Evidence:
- `cmd.exe /c "npm run typecheck"` → **PASSED** (0 TypeScript errors).
- `cmd.exe /c "npx vitest run"` → **PASSED** (8 test files / 22 tests passed).

## Phase 9 implementation slice A — authenticated route/repository boundary — 2026-08-23

Status: IN PROGRESS. The application boundary is now server-resolved and fail-closed; database schema/RLS/RPC verification remains outstanding.

Files changed in Learning OS:

- `src/lib/auth/supabase-identity.ts` — Supabase SSR `auth.uid()` → profile → active membership resolver; explicit local-memory identity for development only; request-ID tampering checks.
- `src/lib/supabase/server.ts` — request-scoped `@supabase/ssr` client using cookies; no service-role key.
- `src/lib/context/learning-context.ts`, `src/lib/domain/types.ts`, `src/lib/domain/schemas.ts` — server scope inputs and idempotency fields.
- `src/lib/repository/index.ts`, `src/lib/repository/interfaces.ts`, `src/lib/repository/memory-repository.ts`, `src/lib/repository/supabase-repository.ts`, `src/lib/supabase/types.ts` — scoped repository port, explicit memory rollback, RLS-backed Supabase adapter, no silent fallback, submission/revision/event idempotency fields.
- `src/lib/events/event-store.ts`, `src/lib/events/persistent-event.ts` — persisted event factory and in-memory idempotency behavior.
- `src/app/api/sessions/route.ts`, `src/app/api/teacher/reviews/route.ts`, `src/app/api/peer-reviews/route.ts`, `src/app/api/reflections/route.ts`, `src/app/api/coach/chat/route.ts`, `src/app/api/research/export/route.ts`, `src/app/api/activities/route.ts`, `src/app/api/health/route.ts` — route wiring through the scoped boundary.
- `src/app/auth/callback/route.ts` — SSR auth callback.

Files intentionally excluded: Factory OS files, real credentials, real student data, service-role use in application routes, and unrelated Phase 10 work.

Commands actually run:

- `cmd.exe /c "npm run typecheck"` → PASSED after this slice (0 errors).
- `git status --short` → inspected; pre-existing Gemini changes preserved.

Blockers/open decisions:

- Canonical education migrations, class-scoped RLS, locked peer-review RPC, and live Supabase checks are not complete.
- Supabase CLI/Docker availability has not yet been checked for this phase.
- Memory mode remains the local rollback; it is not durable and is not approved for real student data.

Exact next step: add education-only Phase 9 migrations for schools/courses/classes/memberships/assignments, scoped evidence tables, consent, research identity mapping, strict RLS, and the auth-bound peer-review RPC; then typecheck and add isolation tests.

## Phase 9 implementation slice B — education model, RLS, and peer-review RPC — 2026-08-23

Status: COMPLETE (Unit/Build verified; live CLI skipped).

Files changed in Learning OS:
- `supabase/migrations/005_phase9_education_model.sql`
- `supabase/migrations/006_phase9_rls.sql`
- `supabase/migrations/007_phase9_peer_review_rpc.sql`
- `supabase/tests/phase9_isolation.sql`
- `src/lib/phase9.test.ts`

Commands run & verified:
- `npm run typecheck` → PASSED (0 errors).
- `npm test` → PASSED (10 test files / 28 tests).
- `npm run build` → PASSED (20 static/dynamic routes).

## Phase 10 implementation slice A — Teacher Pilot Operations, Rubrics & Research Export — 2026-08-26

Status: COMPLETE. Teacher classroom roster, ADI phase progression monitor, CER rubric evaluation, and de-identified CSV/JSON research export implemented and verified.

Files changed in Learning OS:
- `src/lib/domain/types.ts` — added `rubricScores` to `TeacherReview`, added `RosterStudentProgress` and `ClassRosterSummary` interfaces.
- `src/lib/education/teacher-review.ts` — extended `teacherReviewInputSchema` and `recordTeacherReviewWithRepository` to persist structured rubric dimensions in database and event streams.
- `src/lib/research/export.ts` — added `formatResearchEvidenceCsv` for separated, de-identified research evidence CSV formatting.
- `src/app/api/teacher/roster/route.ts` [NEW] — endpoint for class roster, active activity assignment, and student ADI progress aggregation with `Cache-Control: no-store, private`.
- `src/app/api/teacher/reviews/route.ts` — updated GET/POST with rubric evaluation support and `no-store` headers.
- `src/app/api/research/export/route.ts` — added `format=csv` / `format=json` query handling with `text/csv` / `application/json` attachments.
- `src/components/teacher-roster-view.tsx` [NEW] — visual class roster dashboard with stage filters, phase badges, and review shortcuts.
- `src/app/teacher/roster/page.tsx` [NEW] — Next.js page route for class roster management.
- `src/components/teacher-review-dashboard.tsx` — upgraded with CER rubric dimensions (Claim 1-4, Evidence 1-4, Reasoning 1-4), submission search/filters, and expandable AI interaction & revision diff logs.
- `src/components/teacher-analytics.tsx` — upgraded with one-click JSON/CSV download triggers, event distribution bars, and PDPA research notice.
- `src/app/globals.css` — added styling for rubric buttons, roster tables, stage badges, and export actions.
- `src/lib/teacher-pilot.test.ts` [NEW] — test suite for CER rubric recording, roster progress aggregation, and CSV/JSON research exports.

Verification evidence:
- `cmd.exe /c "npm run typecheck"` → **PASSED** (0 TypeScript errors).
- `cmd.exe /c "npm test"` → **PASSED** (11 test files / 32 tests passed).
- `cmd.exe /c "npm run build"` → **PASSED** (22 static/dynamic routes compiled cleanly).

Exact next step: Phase 10 security & caching hardening (rate limiting on `/api/coach/chat`, `/api/ready` probe, and deployment checklist).


## Phase 11 repair, audit tickets, and M1 scoping — 2026-09-25

Status: Phase 11 research-hardening code now compiles and passes all checks. Work is still uncommitted on `main` (see LOS-010).

Fixes:
- `src/components/teacher-review-dashboard.tsx`: fixed a JSX fragment that closed early, replaced the missing `analytics.averageScore` with an average computed from reviews, and removed stray LaTeX from the rubric label.
- `src/lib/events/persistent-event.ts`: now accepts and forwards `cycle`.
- `src/lib/repository/index.ts`: the memory scoped repo implements the observation-note methods, with teacher and class IDs forced from the server identity.
- `src/lib/domain/schemas.ts`: fixed the `parseTeacherObservationNote` return type.
- `src/app/api/coach/chat/route.ts`: the server now rejects chat requests with 409 `draft1_required` until a Draft 1 exists (audit must-fix #1).
- New test: `src/lib/coach-chat-gate.test.ts`.

Verification (this task): `npm run typecheck` 0 errors · `npm test` 14 files / 45 tests passed · `npm run build` passed (23 routes) after all edits.

Ticket system: `tickets/README.md` (LOS-001 to LOS-012). Decisions D-011 (the next milestone is a real CAR pilot on Supabase, no date) and D-012 (score CER and synthetic thinking separately) are in `docs/DECISIONS.md`.

Known blockers for real student data: Supabase drops the Phase 11 fields (LOS-003), observation notes are a stub in Supabase (LOS-004), the UI hardcodes IDs and the cycle heuristic (LOS-005, LOS-006), and live verification hasn't been done (LOS-009).

Exact next step: LOS-010 (branch and commit), then LOS-003.

## Non-Supabase tickets closed — 2026-09-25 (later)

The user will test Supabase on 2026-09-26, so LOS-003, LOS-004 and LOS-009 are deliberately untouched. Closed: LOS-005, 006, 007, 008, 011, 012, and the new LOS-013 (the chat guardrail wasn't enforced). Details are in `tickets/`.

Files changed: `src/components/teacher-review-dashboard.tsx`, `src/components/socratic-coach-chat.tsx`, `src/components/teacher-analytics.tsx`, `src/components/growth-analytics-panel.tsx` (new), `src/lib/research/export.ts`, `src/lib/research/growth.ts` (new), `src/lib/safety/rate-limit.ts` (new), `src/lib/ai/coach.ts`, `src/lib/ai/mock-provider.ts`, `src/lib/education/teacher-review.ts`, `src/lib/domain/schemas.ts`, `src/lib/teacher/review-types.ts`, `src/app/api/coach/chat/route.ts`, `src/app/api/teacher/reviews/route.ts`, `src/app/api/teacher/observations/route.ts`, `src/app/api/research/export/route.ts`, `src/app/api/ready/route.ts` (new), `src/middleware.ts`, `.claude/launch.json` (new; dev on port 3100). New tests: `src/lib/research-integrity.test.ts`, `src/lib/growth.test.ts`, plus additions to `coach-chat.test.ts` and `coach-chat-gate.test.ts`.

Verification: `npm run typecheck` 0 errors · `npm test` 16 files / 59 tests passed · `npm run build` passed (24 routes). Browser check on the dev server (memory mode, Ollama not running, so replies used the fallback provider):
- The Draft-1 gate returned 409.
- Opponent chat returned a challenge question.
- `/api/ready` returned 503 with "local LLM unreachable", which is correct.
- A teacher review saved through the UI stored CER and the 4 dimensions separately, with teacherId set by the server.
- An observation note's teacherId and classId came from the server identity.
- The growth panel showed a paired Cycle 1 of 50 → Cycle 2 of 100.

Known dev-only quirk: in `next dev`, the first compile of a new route can reset the in-memory store. Memory mode isn't durable and isn't approved for real data.

For the Supabase test tomorrow (LOS-003):
- Persist `cycle`, `draft1Frozen`/`draft1FrozenAt` and `feedbackDecisions` on submissions and revisions.
- Persist `syntheticScores` and `cycle` on teacher reviews.
- LOS-004: persist observation notes.
- LOS-005 remainder: the roster route and the student picker should use real memberships.

## LOS-003 — Persist Phase 11 research fields in Supabase mode — 2026-09-25

Status: DONE.

Files changed:
- `supabase/migrations/008_phase11_research_fields.sql` (new) — adds `cycle` (`1|2`, nullable), `draft1_frozen`, `draft1_frozen_at`, and `feedback_decisions` (`jsonb`) on `submissions` and `revisions`; `rubric_scores` (`jsonb`, CER only), `synthetic_scores` (`jsonb`), and `cycle` on `teacher_reviews`; and `cycle`/`chapter_id` on `activities` and `learning_events`, keeping class-scoped RLS from migrations 006/007 intact.
- `src/lib/supabase/types.ts` — updated `Database` types for `activities`, `submissions`, `revisions`, `teacher_reviews`, and `learning_events`.
- `src/lib/domain/types.ts` — added optional `draft1Frozen` and `draft1FrozenAt` to `Revision`.
- `src/lib/repository/supabase-repository.ts` — writes and reads Phase 11 research fields in `addSubmission`, `addRevision`, `addTeacherReview`, `listTeacherReviews`, `getActivity`, `listActivities`, `appendLearningEvent`, and the row mappers (`mapSubmission`, `mapRevision`, `mapTeacherReview`, `mapEvent`).
- `src/app/api/sessions/route.ts` — passes `draft1Frozen` and `draft1FrozenAt` into `repository.addRevision`.
- `src/lib/supabase-repository.test.ts` — added round-trip and wide-export test coverage for `SupabaseRepository`.
- `tickets/LOS-003-persist-phase-11-research-fields-in.md`, `tickets/README.md` — marked LOS-003 done.

Commands run and actual results:
- `npm.cmd run typecheck` → PASSED (0 errors, exit code 0).
- `npm.cmd test` → PASSED (16 test files / 60 tests passed, exit code 0).
- `npm.cmd run build` → PASSED (24 routes compiled cleanly, exit code 0).

Next action: LOS-004 (Supabase teacher observation notes).

## LOS-004 — Implement Supabase teacher observation notes — 2026-09-25

Status: DONE.

Files changed:
- `supabase/migrations/009_teacher_observation_notes.sql` (new) — adds `teacher_observation_notes` table with teacher- and class-scoped RLS (`teacher_profile_id = learning_profile_id() AND teacher_id = learning_external_id() AND active_class_member(class_id, 'teacher')`).
- `src/lib/supabase/types.ts` — added `teacher_observation_notes` table types to `Database`.
- `src/lib/repository/supabase-repository.ts` — implemented `addTeacherObservationNote` and `listTeacherObservationNotes` (with `cycle` and `activityId` filters and server-enforced teacher/class scope) and `mapTeacherObservationNote`.
- `supabase/tests/phase9_isolation.sql` — added `teacher_b` and pgTAP assertions confirming teacher A cannot read or insert teacher B's observation notes.
- `src/lib/supabase-repository.test.ts` — added test coverage for observation note persistence, `cycle`/`activityId` filtering, and cross-teacher scope denial.
- `tickets/LOS-004-implement-supabase-teacher-observation-notes-currently.md`, `tickets/README.md` — marked LOS-004 done.

Commands run and actual results:
- `npm.cmd run typecheck` → PASSED (0 errors, exit code 0).
- `npm.cmd test` → PASSED (16 test files / 61 tests passed, exit code 0).
- `npm.cmd run build` → PASSED (24 routes compiled cleanly, exit code 0).

Next action: LOS-005 remainder (real memberships in teacher roster route and hiding student picker in Supabase mode).

## LOS-005 remainder — Real memberships in teacher roster & session-derived student workbench identity — 2026-09-26

Status: DONE.

Files changed:
- `supabase/migrations/010_teacher_class_roster_rls.sql` (new) — adds `teacher_can_view_class_profile` (`SECURITY DEFINER`) and `profiles_teacher_class_select` RLS policy on `learning_profiles` so teachers can read active class members' profiles when building the roster.
- `src/app/api/teacher/roster/route.ts` — builds the roster from real active `memberships` and `learning_profiles` in Supabase mode (ignoring browser-supplied `classId` and keeping the synthetic 29/28 `401xx`/`402xx` roster only for memory/demo mode); resolves `cycle` from `submission.cycle` then `activity.cycle`.
- `src/app/api/activities/route.ts` — returns `persistence` mode and server-resolved `session` (`studentId`, `classId`, `courseId`) alongside `activities`.
- `src/components/student-workbench.tsx` — hides the classroom and student ID pickers in Supabase mode and uses the session's `studentId` and `classId` instead of `localStorage`.
- `src/components/student-timeline.tsx` — removes hardcoded `studentId=demo-student-01` query param when fetching `/api/sessions`.
- `src/lib/domain/schemas.ts` — makes `studentId` optional in `reflectionInputSchema`.
- `src/lib/teacher-pilot.test.ts` — adds tests for real-membership roster building in Supabase mode and session metadata on `GET /api/activities`.
- `tickets/LOS-005-remove-hardcoded-identities-and-counts-from.md`, `tickets/README.md` — marked LOS-005 remainder done.

Commands run and actual results:
- `npm.cmd run typecheck` → PASSED (0 errors, exit code 0).
- `npm.cmd test` → PASSED (16 test files / 63 tests passed, exit code 0).
- `npm.cmd run build` → PASSED (24 routes compiled cleanly, exit code 0).

Next action: LOS-009 (Live end-to-end verification against live Supabase + local Ollama).

## LOS-009 — Live end-to-end verification check — 2026-09-26

Status: BLOCKED (`in-progress`).

Live service probes run in this session (secret values never printed):
- Local Ollama probe (`GET http://localhost:11434/v1/models` and MCP `ollama_list_models`) → **BLOCKED** (`ECONNREFUSED`; local Ollama daemon is not running on port `11434`).
- Live Supabase REST probe (`GET <NEXT_PUBLIC_SUPABASE_URL>/rest/v1/schools?select=id&limit=1`) → **BLOCKED** (`ENOTFOUND`; DNS lookup failed for the Supabase project URL configured in `.env.local`).
- Local Supabase CLI check (`Get-Command supabase`) → **BLOCKED** (`supabase` CLI is not installed on PATH and `supabase/config.toml` is absent, so `supabase test db` cannot be executed locally).

`LEARNING_PERSISTENCE=memory` remains the default until live Ollama and a reachable Supabase instance (with migrations `001`–`010` applied) are available.

## P0 fixes LOS-014 + LOS-015 — 2026-09-27

Status: both P0 tickets are done on `feat/phase11-research-hardening` (not pushed). See the ticket files for details.
- LOS-014 (`5fb5d11`): no fabricated student content. Phase 2/5/6/7 inputs start empty and are required. Real anonymized received peer reviews are shown (migration 012 RPC). Reflections are stored as given (migration 011). Failed fetches are guarded.
- LOS-015: pagination past 1000 rows, immutable submissions and whitelisted events, consent-filtered export, HMAC participant keys, class-scoped teacher queries, explicit roster sort (migration 013).
- Verification: typecheck 0 · `npm test` 70/70 · build OK.
- New env vars: `RESEARCH_KEY_SECRET` (required in Supabase mode), `RESEARCH_CONSENT_PURPOSE`.
- The user migrates Supabase themselves: apply 001–013 in order, enable pgtap, run `supabase/tests/phase9_isolation.sql` (plan 18).
- Vercel: no deployment is connected to `dearmjx/Learning-distribution`, and this branch is unpushed. Don't deploy memory mode or localhost Ollama to Vercel.
- Next: LOS-016 (workflow, including the C1 demo-mode 403 at Phase 4), then LOS-017, LOS-019, and LOS-009.

## Codex improvement sequence — 2026-10-14

Branch: `codex/learning-os-improvements` (created from the existing `feat/phase11-research-hardening` working tree). Existing untracked `.claude/` and `presentation_assets/` were preserved and not edited.

Implemented in sequence:
- Production student identity now fails closed when persistence is memory. Production memory is only enabled for an explicitly allowed, password-gated synthetic demo; readiness reports memory as not production-ready.
- Thai authorship similarity uses `Intl.Segmenter` and grapheme n-gram overlap. It remains a teacher-only review indicator.
- Coach feedback and `ai_feedback_received` events carry prompt/content version metadata. Added synthetic RAG evaluation cases, Recall@K/MRR/scope-leak reporting, and an educator review protocol.
- Added scoped GET/POST `/api/progress` backed by idempotent `wizard_progress_saved` events. The student workbench restores and debounces saves for phase, variable notes, and CER draft, and shows persistence status.
- Added a validated static ecosystem content pack with explicit version metadata and reuse guidance.
- Marked the August codebase audit as historical; added a current improvement roadmap and README links.

Files changed: `.env.example`, `README.md`, `docs/CODEBASE_AUDIT_AND_CHANGE_RECOMMENDATIONS.md`, `docs/COACH_EVALUATION.md`, `docs/COURSE_CONTENT_PACKS.md`, `docs/IMPROVEMENT_ROADMAP.md`, `src/app/api/progress/route.ts`, `src/app/api/sessions/route.ts`, `src/components/student-workbench.tsx`, `src/data/course/ecosystem/activities.ts`, `src/data/course/ecosystem/content-pack.ts`, `src/data/course/ecosystem/rag-evaluation-cases.ts`, `src/data/course/knowledge-base.ts`, `src/lib/ai/coach.ts`, `src/lib/analytics/authorship.ts`, `src/lib/auth/supabase-identity.ts`, `src/lib/domain/schemas.ts`, `src/lib/domain/types.ts`, `src/lib/knowledge/evaluation.ts`, `src/lib/knowledge/hybrid-rag.ts`, `src/lib/knowledge/types.ts`, `src/lib/repository/index.ts`, `src/lib/repository/memory-repository.ts`.

Verification performed:
- `npm run typecheck` → PASSED, exit code 0.
- `git diff --check` → PASSED; Git emitted only existing LF-to-CRLF working-copy warnings.
- `npm run build` → PASSED after rerunning with approval for Windows workspace path access; Next.js compiled the new `/api/progress` route and all 25 pages.
- No test suite was added or run.

Open pilot gates: live Supabase CLI/database/RLS and two-student route verification, school authentication/roster decision, consent/retention/deletion/data-residency approval, and educator review of live provider outputs. In-memory progress is not durable across a server restart. Static course packs do not yet provide teacher-facing authoring or database-managed versioning.
