# Phase X — Factory OS to Learning OS Migration and Execution Plan

> Updated: 2026-08-23 21:31 (+07:00)
>
> Status at this update: Current Gemini work audited, local runtime smoke-tested, and an opt-in password-protected demo mode implemented. The clean production server loads on `http://localhost:3000`, the 7-phase demo UI, typecheck, unit suite, and production build pass; Supabase persistence/auth/RLS integration is not ready for real student data. Factory OS remains read-only.

This document is the current source of truth for the Learning OS migration. Learning OS is a separate education project derived from patterns observed in Factory OS. It is not a renamed Factory OS copy, and no education code is added to Factory OS.

## 1. Scope and operating rules

Learning OS is a research prototype for Grade 10 biology using ADI and a Socratic AI Coach.

| Area | Initial scope |
|---|---|
| Course | Biology M.4 / Grade 10 — Ecosystems |
| First activity | Analyze change in an ecosystem food web |
| Student artifact | Claim–Evidence–Reasoning (CER) response |
| Primary outcome | Analytical reasoning through CER |
| Secondary outcome | AI literacy, exploratory only |
| Research design | One-group pretest–posttest; no unsupported causal claim |
| Teacher authority | Teacher assigns the final academic score and comment |
| AI role | Socratic questions and evidence-grounded hints; never the final grader |
| Persistence | In-memory runtime remains active; Supabase artifacts exist but the audited Phase 4/7 gate is not passed |
| LLM default | Mock provider; local provider is opt-in; DeepSeek is not enabled in this execution |

Non-negotiable rules:

- Read Factory OS only. Do not modify, delete, move, reset, checkout, clean, or commit changes in the Factory OS repository.
- Do not copy `.env`, API keys, tokens, passwords, private keys, certificates, `node_modules`, `.next`, `dist`, or generated build output.
- Do not copy Factory OS data or factory domain logic into Learning OS.
- Do not import Factory OS source files from the Learning OS application at runtime.
- Preserve the existing CER demo and research documents.
- Keep provider calls server-side and behind a provider interface.
- Never claim a check passed unless it was run successfully in this session.

## 2. Factory OS scan record

### Repository state

| Field | Observed value |
|---|---|
| Source path | `C:\Users\woram\OneDrive\Desktop\projectFACTORYOSSME` |
| Branch | `main` tracking `origin/main` |
| HEAD | `47e1f9be355591cd2d49b7cf467bbcd596d9cdb4` (`47e1f9b`) |
| Recent commits | `47e1f9b` handoff push record; `75a8549` Phase 4 safety/resilience/production infrastructure; `9031041` initial GitHub push; `329db72` initial monorepo commit |
| Scan date | 2026-08-12 (+07:00) |
| Working tree | Latest read-only check: 67 tracked paths modified, 83 untracked paths, 126 status entries |
| Source safety | Working tree contains factory changes and certificate/key-named files; contents were not copied or exposed |

The committed reference point is useful for history only. The current working tree is the latest repository state for analysis, but it is not a safe copy source because it contains uncommitted Phase 4/5 work and sensitive factory infrastructure. The initial Step 0 check saw 57/79/115; later read-only checks saw 63/82/121 and then 67/83/126, indicating concurrent or previously interrupted activity while this task was running. No Factory OS write command was issued by this task, and all source changes were preserved. The architecture reports are also not all equally fresh: `module-map.md` and `current-architecture.md` are dated 2026-07-23, while `phase5-plan.md` was revised 2026-08-12.

### Current Factory OS status signals

- `docs/architecture/phase3-plan.md`: Phase 3A–3D marked complete.
- `docs/architecture/phase4-plan.md`: Phase 4A and 4B are recorded as complete; Phase 4C remains active and has live Supabase telemetry/migration blockers.
- `docs/architecture/phase5-plan.md`: revised 2026-08-12; Phase 5B is in progress. Provider adapters, gateway controls, routing, telemetry, and Tier 1 controls are present, while runtime persistence and live provider/API verification remain open.
- `handoff.md` and `finish.md`: record prior successful static/build/test evidence, but those records are historical evidence and are not reused as proof for Learning OS.
- `README.md`: describes a Next.js 16 frontend, Hono backend, Supabase/Postgres, agent orchestration, event/audit infrastructure, and IoT stack.

## 3. Reuse and exclusion matrix

The matrix distinguishes direct reuse of a concept or primitive from reuse through an adapter. “Reuse through an adapter” means that Learning OS defines its own contract and implementation; it does not import the Factory OS file.

| Factory OS path | Decision | Learning OS use | Boundary or change required |
|---|---|---|---|
| `platform/repository-client.ts` | Reuse through an adapter | Persistence port shape | Keep vendor-neutral; Learning OS owns its education repositories and may later add a Supabase adapter |
| `platform/event-store/event-store.ts` | Reuse through an adapter | Append-only learning timeline | Source is tied to `DomainEvent` and `FactoryContext`; use a LearningEvent envelope and education scope |
| `platform/event-store/projections.ts` | Reuse through an adapter | Revision, hint, and teacher-evidence projections | Keep projection idea; no `factory_context` payload or factory table names |
| `platform/workflow-engine/state-machine.ts` | Reuse through an adapter | ADI transitions | Use a local education state/action union; do not pass `FactoryContext` |
| `platform/workflow-engine/workflow-engine.ts` | Reuse through an adapter | Workflow lifecycle pattern only | Source stores `factoryId`, `siteId`, and operator information; Learning OS uses `LearningContext` |
| `platform/safety-kernel/policy-engine.ts` | Reuse through an adapter | Rule registration/evaluation pattern | Education rules have a separate category and fail-closed output policy |
| `platform/safety-kernel/safety-gateway.ts` | Reuse through an adapter | AI Coach guardrail boundary | Do not reuse factory audit calls, factory categories, or kill-switch semantics directly |
| `platform/safety-kernel/safety.types.ts` | Rewrite for Learning OS | Education safety result | Factory risk categories are not valid education policy vocabulary |
| `platform/agent-orchestration/capability-registry.ts` | Reuse through an adapter | Future Coach capability allowlist | Phase 1–3 exposes no factory tools or autonomous agents |
| `platform/agent-orchestration/tool-registry.ts` | Exclude from MVP; pattern may be adapted later | No tool execution in the first activity | Source authorizes `FactoryContext` tools through the factory SafetyGateway |
| `backend/src/services/ai/llm-gateway.ts` | Reuse through an adapter | Provider selection, timeout/fallback, response boundary | Source requires FactoryContext, factory SafetyGateway, factory audit, and factory-scoped LLM schemas |
| `backend/src/services/ai/llm-providers.ts` | Reuse through an adapter | Local/remote HTTP provider strategy | Copy no implementation or credentials; retain only provider-neutral behavior |
| `backend/src/services/ai/llm-errors.ts` | Reuse through an adapter | Error taxonomy for fallback tests | Rename to education-safe local errors if needed |
| `backend/src/services/ai/secure-system-prompt.ts` | Rewrite for Learning OS | Socratic Coach policy | Factory decision perspectives and factory instructions are excluded |
| `backend/src/types/llm.types.ts` | Reuse through an adapter | Provider-neutral request/response ideas | Remove `factoryId`, `siteId`, factory decision analysis, and factory model-management scope |
| `backend/src/config/llm.config.ts` | Reuse through an adapter | Server-side provider configuration | Keep mock/local defaults; DeepSeek remains explicit opt-in and absent from this execution |
| `backend/src/lib/audit-logger.ts` | Reuse through an adapter | Append-only learning evidence logging | Do not copy factory audit schema; minimize student PII and separate research export data |
| `frontend/components/layout/AppShell.tsx` | Reuse through an adapter | Layout composition reference | Learning OS has its own student/teacher shell |
| `frontend/components/layout/SidebarNav.tsx` | Exclude | Factory navigation and factory selector | Contains factory routes, factory labels, and factory-scoped auth metadata |
| `frontend/components/layout/TopBar.tsx` | Exclude | Factory approvals/notifications | Reads factory agent approvals and factory auth metadata |
| `frontend/components/ui/ErrorState.tsx` | Reuse through an adapter | Loading/error UX pattern | Copy only if needed; no factory data dependency |
| `frontend/components/ui/Skeleton.tsx` | Reuse through an adapter | Loading UX pattern | Education labels only |
| `frontend/components/ui/StatusBadge.tsx` | Reuse through an adapter | Workflow/safety status display | Education states only |
| `frontend/lib/supabase.ts` | Reuse through an adapter, later | Browser auth adapter | Not present in the current Learning OS MVP; must be configured without service-role secrets |
| `frontend/lib/supabase-server.ts` | Reuse through an adapter, later | Server-side auth/data adapter | Pilot prerequisite; never expose service-role credentials |
| `backend/src/lib/supabase.ts` | Exclude from Phase 1–3 | Factory service-role client | Not copied; the MVP uses memory repositories |
| `agents/src/specialized/inventory/` | Exclude | None | Factory domain |
| `agents/src/specialized/maintenance/` | Exclude | None | Factory domain and machine work orders |
| `agents/src/specialized/production/` | Exclude | None | Factory production domain |
| `agents/src/specialized/vision/` | Exclude | None | Factory camera/inspection domain |
| `agents/src/specialized/audit/` | Exclude | None | Factory audit agent |
| `platform/digital-twin/` | Exclude | None | Factory process/machine model |
| `iot/`, MQTT, ESP32, Home Assistant | Exclude | None | Industrial telemetry and device control |
| `knowledge/factories/` | Exclude | None | Factory-specific knowledge/data |
| `backend/migrations/` | Exclude | None in Phases 1–3 | No factory schema or data migration is copied |

## 4. Factory-specific exclusion list

Learning OS must not contain imports, schemas, routes, UI labels, fixtures, or provider prompts for:

- `FactoryContext`, `factoryId`, `siteId`, operator roles, machine identities, or factory tenant scope;
- machines, inventory, maintenance, production, suppliers, telemetry, MQTT, IoT, OEE, VSM, digital twins, downtime, work orders, cameras, or industrial sensors;
- Factory OS specialized agents, factory approvals, or autonomous machine/tool actions;
- factory migrations, factory demo records, industrial certificates, private keys, service-role keys, or copied `.env` files.

The only allowed use of “scope” in Learning OS is education scope: school, course, class, activity, student, teacher, and research/export scope.

## 5. Dependency and boundary risks

1. The Factory OS platform directory is not currently domain-neutral. `event-store.ts`, `workflow-engine.ts`, `safety-gateway.ts`, and `llm-gateway.ts` import factory context or factory backend modules. Direct cross-repository imports would violate the read-only boundary and create hidden factory coupling.
2. Factory architecture documentation trails the working tree. The current Phase 5 plan is newer than the module map and current architecture report, so this document records observed code and status rather than treating old docs as authoritative.
3. The Factory OS working tree contains uncommitted and untracked changes, including certificate/key-named paths. No file content from those paths is needed for Learning OS.
4. Learning OS has no lockfile or installed dependencies at scan time. Type checks/builds require dependency installation or an equivalent local runtime; results will be recorded honestly.
5. The MVP has no real authentication. The demo API must use a server-owned demo identity and explicit class/student scope checks until auth and consent are implemented.
6. In-memory storage resets on restart. It is suitable for local research interaction only, not a student pilot.
7. LLM output is untrusted. The Coach must validate, constrain, and fallback to a static Socratic prompt; a provider response can never assign a grade or declare plagiarism.

## 6. Target Learning OS architecture

```text
Student / Teacher Next.js UI
          │
          ▼
Learning route handlers (server-side)
          │
   ┌──────┼─────────┐
   ▼      ▼         ▼
Scope   Education   Learning
guard   Safety      Event Store
   │      │         │
   └──────┼─────────┘
          ▼
       AI Coach
          │
          ▼
Provider adapter (mock default / local opt-in / DeepSeek explicit opt-in)
          │
          ▼
Education repository ports
          │
          ▼
Memory MVP → future Postgres/Supabase adapter
```

The application owns the education contracts. Platform ideas are used at the boundary and can later be replaced without changing the student workflow.

## 7. Core contracts

### LearningContext

```ts
interface LearningContext {
  schoolId: string;
  courseId: string;
  classId: string;
  activityId?: string;
  studentId?: string;
  teacherId?: string;
  adiPhase: AdiPhase;
  language: "th" | "en";
  role: "student" | "teacher" | "system" | "researcher";
  permissions: string[];
  traceId: string;
  correlationId: string;
}
```

The context never contains `FactoryContext`. Student-facing requests must match the server-resolved student/class scope. Teacher review can read only the configured demo class until real authentication is added.

### LearningEvent

```ts
interface LearningEvent {
  id: string;
  schemaVersion: 1;
  eventType: LearningEventType;
  context: LearningContext;
  actor: { type: "student" | "teacher" | "system"; id: string };
  payload: Record<string, unknown>;
  occurredAt: string;
  correlationId: string;
}
```

Initial event catalog: `activity_selected`, `context_viewed`, `student_submitted`, `ai_feedback_received`, `hint_requested`, `student_revised`, `peer_review_assigned`, `peer_review_submitted`, `teacher_reviewed`, `reflection_completed`, `learning_phase_changed`, and `authorship_indicator_created`.

### AI Coach

```ts
interface CoachRequest {
  requestId: string;
  context: LearningContext;
  activity: Activity;
  approvedContext: string;
  cer: CerResponse;
  hintDepth: HintDepth;
  currentAdiPhase: AdiPhase;
}

interface CoachResponse {
  requestId: string;
  provider: "mock" | "local" | "deepseek" | "fallback";
  message: string;
  targetDimension: RubricDimension;
  citations: string[];
  hintDepth: HintDepth;
  hintCost: number;
  directAnswerBlocked: true;
  fallbackUsed: boolean;
  safetyFlags: string[];
}
```

## 8. Phase status and execution plan

### Phase 1 — Extract and define education boundaries

Status: COMPLETE — verified 2026-08-12.

Deliverables:

- `LearningContext`, event types/envelope, Coach request/response schemas;
- education safety rules and a server-owned demo scope;
- repository/event/workflow/provider interfaces;
- a reuse allowlist and factory exclusion list;
- local mock provider as the default and explicit local/DeepSeek adapter contracts;
- boundary tests or static checks proving no factory imports or secret material are introduced.

Acceptance criteria:

- No Learning OS code imports IoT, factory data, factory agents, or factory migrations.
- Learning code has no direct dependency on `FactoryContext`.
- No secrets or certificates are copied.
- AI provider access remains server-side and behind a provider abstraction.
- Contracts cover school, course, class, student, teacher, activity, and ADI phase scope.
- The current CER demo and research documents remain intact.

Verification commands:

```powershell
rg -n "FactoryContext|factoryId|siteId|MQTT|IoT|inventory|maintenance|production|supplier|telemetry|OEE|VSM|digital twin" src docs
rg -n "\.env|API_KEY|TOKEN|PRIVATE_KEY|BEGIN .* KEY|\.crt|\.pem" src docs
cmd.exe /c "npx tsc --noEmit"
```

Phase 1 execution record:

- Changed: `src/lib/domain/types.ts`, `src/lib/domain/schemas.ts`, `src/lib/context/learning-context.ts`, `src/lib/events/event-store.ts`, `src/lib/events/timeline.ts`, `src/lib/workflow/adi-workflow.ts`, `src/lib/safety/education-policy.ts`, `src/lib/repository/interfaces.ts`, `src/lib/repository/memory-repository.ts`, `src/lib/ai/provider.ts`, `src/lib/ai/local-provider.ts`, `src/lib/ai/mock-provider.ts`, `src/lib/ai/deepseek-provider.ts`, `src/lib/ai/coach.ts`, `src/lib/analytics/authorship.ts`, `src/app/api/sessions/route.ts`, `src/app/api/health/route.ts`, `package.json`, `.env.example`, `vitest.config.ts`.
- Reused by pattern: repository port, append-only event store, state-machine, policy, provider strategy, and fallback concepts from the Factory OS scan.
- Intentionally excluded: FactoryContext, factory audit/storage, factory agents, IoT/MQTT, factory migrations/data, and factory UI.
- Actual checks: `cmd.exe /c npm run typecheck` → 0 errors; `cmd.exe /c npm test` → 1 file / 4 tests passed.
- Boundary result: no runtime import from the Factory OS repository; the student Coach route uses the local provider abstraction and demo student scope.

Phase 1 gate: PASSED. Continue to Phase 2.

### Phase 2 — Build the education backend domain

Status: COMPLETE — verified 2026-08-12.

Deliverables:

- education entities and Zod validation schemas;
- repository interfaces for courses, activities, submissions, revisions, AI sessions, peer reviews, teacher reviews, and learning events;
- an education event-store adapter and ADI workflow;
- Education Safety Policy: no direct answer, no student-work writing, no cross-student Coach access, no unapproved web knowledge, no AI grading, and peer-review help only when explicitly allowed;
- provider/gateway adaptation with mock/local fallback and DeepSeek opt-in only;
- authorship indicators as teacher-review signals and `hintCost` separate from academic score;
- tests for guardrails, scope isolation, fallback, and event creation.

ADI state path:

```text
draft → submitted → ai_feedback_received → revising
      → peer_review → teacher_review → completed
```

For activities with peer review disabled, `revising` may transition directly to `teacher_review`. The workflow records the activity policy and does not silently enable peer review.

Acceptance criteria:

- CER submission produces Socratic feedback.
- Direct answers are blocked on provider and fallback paths.
- LLM failure has a deterministic fallback.
- Submission, revision, hint, and feedback events are recorded.
- Teacher remains the final grader.
- Authorship indicators never become automatic plagiarism decisions.
- Existing scaffold behavior and checks do not regress.

Verification commands:

```powershell
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "npm test"
```

Phase 2 execution record:

- Changed: `src/app/api/sessions/route.ts`, `src/lib/events/event-repository.ts`, `src/lib/knowledge/approved-context.ts`, `src/lib/education/teacher-review.ts`, `src/lib/safety/education-policy.ts`, `src/lib/repository/memory-repository.ts`, `src/lib/ai/coach.ts`, and `src/lib/phase2.test.ts`.
- Reused by pattern: event repository adapter, approved-context port, ADI workflow transitions, education policy gate, provider fallback, and teacher-owned review boundary.
- Intentionally excluded: web search/RAG outside approved activity context, automated grading/plagiarism decisions, peer-review tools for activities that disable them, and all factory infrastructure/data.
- Actual checks: `cmd.exe /c npm run typecheck` → 0 errors; `cmd.exe /c npm test` → 2 files / 8 tests passed.
- Runtime flow result: the session route records submission/revision, hint, AI feedback, authorship signal, workflow, and AI interaction evidence; cross-student submission returns 403; teacher review is the only final score path.

Phase 2 gate: PASSED. Continue to Phase 3.

### Phase 3 — Connect the frontend and complete one activity

Status: COMPLETE — verified 2026-08-12.

Deliverables:

- student activity page with approved context and CER editor;
- AI Coach feedback and optional hint selection;
- revision history and a student-only learning timeline;
- teacher review page with evidence, AI interactions, hint usage, authorship indicators, peer feedback, final score, and comment;
- teacher evidence/analytics view;
- server-side route handling with no browser API keys;
- mock-provider and manual fallback UX.

Initial activity:

**Analyze change in an ecosystem food web**

Topics: food web, trophic levels, energy flow, and population change.

Student flow: select activity → read approved context → write CER → submit → receive Coach feedback → request optional hint → revise → view personal timeline.

Teacher flow: review submissions → inspect revisions → inspect AI interactions and hints → inspect authorship indicators → review peer feedback → assign final score and comment.

Acceptance criteria:

- One activity can be completed from draft through revision.
- Timeline events are visible and traceable.
- API keys are not exposed to the browser.
- Mock provider works without external credentials.
- LLM failure has a manual fallback.
- Identity data and research evidence can be separated for export.
- No factory terminology appears in the student workflow.

Verification commands:

```powershell
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "npm test"
cmd.exe /c "npm run build"
```

Phase 3 execution record:

- Changed: `src/components/student-workbench.tsx`, `src/components/student-timeline.tsx`, `src/components/teacher-review-dashboard.tsx`, `src/components/teacher-analytics.tsx`, `src/app/student/page.tsx`, `src/app/student/activity/page.tsx`, `src/app/student/timeline/page.tsx`, `src/app/teacher/review/page.tsx`, `src/app/teacher/analytics/page.tsx`, `src/app/api/teacher/reviews/route.ts`, `src/app/api/research/export/route.ts`, `src/lib/teacher/review-types.ts`, `src/lib/research/export.ts`, `src/app/globals.css`, and the session API response shape.
- Reused by pattern: existing CER workbench, same-origin route calls, existing CSS design language, and provider/fallback boundary. Factory layout/navigation/auth components were intentionally not copied.
- Intentionally excluded: factory terminology, industrial dashboards, browser LLM calls, real credentials, real student identities, and automatic grading/plagiarism decisions.
- Actual checks: `cmd.exe /c npm run typecheck` → 0 errors; `cmd.exe /c npm test` → 3 files / 10 tests passed; `cmd.exe /c npm run build` → success with 14 routes.
- Route smoke result: health `ok`, default provider `mock`, versions 1 and 2 completed, second state `ai_feedback_received`, 10 events visible, teacher score `84`, separated research export identity present and evidence free of the raw student ID.
- Boundary result: `factory_boundary_scan=clean` for `src/**/*.ts` and `src/**/*.tsx`; Coach/provider modules are imported by the server route only.

Phase 3 gate: PASSED. Phases 1–3 are complete for the in-memory research MVP.

### Phase 4 — Supabase identity, persistence, and per-student isolation

Status: PARTIAL — artifacts were added by Gemini, but authentication, route integration, RLS isolation, and database verification are not complete.

#### Recommended boundary

Use one Supabase project per environment (`local`, `staging`, and `production`) with a shared education schema and row-level security. Do not create a separate database or Supabase project for every student. Each student's records must be isolated by authenticated identity and class membership through database policies and server-side context resolution.

The browser-provided `studentId` is never an authorization source. The server must resolve:

```text
Supabase Auth session
  → auth user id
  → learning profile
  → active classroom/course membership
  → LearningContext
  → RLS-scoped repository query
```

Normal application queries should use a server-side Supabase session client so RLS is applied. A service-role client, if needed for migrations or tightly controlled administration, must remain server-only and must not be imported by client components or exposed through an API response.

#### Phase 4 deliverables

Planned files and database assets are education-specific; none will be copied from Factory OS:

- `supabase/migrations/0001_learning_core.sql` — profiles, schools, courses, classrooms, memberships, activities, submissions, revisions, AI sessions/interactions, peer reviews, teacher reviews, learning events, consent records, and research participant keys;
- `supabase/migrations/0002_learning_rls.sql` — RLS enablement, scoped policies, append-only event protections, and narrowly scoped helper functions;
- `supabase/seed.sql` — synthetic school, class, teacher, student, and ecosystem activity fixtures only;
- `src/lib/supabase/server.ts` — server-only session client using placeholders from `.env.example`;
- `src/lib/auth/supabase-identity.ts` — authenticated-user-to-`LearningContext` resolver and membership checks;
- `src/lib/repository/supabase-repository.ts` — adapters implementing the existing education repository interfaces;
- `src/lib/events/supabase-event-repository.ts` — append-only persistence for `LearningEvent` with correlation and idempotency handling;
- `src/lib/repository/repository-factory.ts` or equivalent — `memory` versus `supabase` selection, with memory remaining the safe local default until the Phase 4 gate passes;
- `src/app/auth/callback/route.ts` and authenticated UI states, if the selected school login flow requires them;
- updates to `src/app/api/sessions/route.ts`, `src/app/api/teacher/reviews/route.ts`, `src/app/api/research/export/route.ts`, and `src/app/api/health/route.ts` to use resolved identity and report persistence mode without exposing secrets;
- `.env.example` placeholders for Supabase URL and publishable/anonymous key, plus a clearly server-only service-role placeholder if administration requires it;
- database isolation tests and repository contract tests using two synthetic students, one teacher, and an unauthorized user;
- a short data map/runbook covering consent, retention, deletion, export, backup, and rollback.

#### Education data model

The schema should use UUID identifiers and explicit education scope columns. The current TypeScript `studentId` remains a domain identifier, but it is resolved server-side from the authenticated learning profile rather than accepted as trusted client input.

- `learning_profiles`: maps a Supabase Auth user to a Learning OS profile without putting identity data in research evidence;
- `schools`, `courses`, and `classrooms`: education hierarchy and ownership;
- `classroom_memberships`: profile, class, role, status, and effective dates; this is the source for student and teacher scope;
- `activities`: approved activity metadata, ADI phase, rubric dimensions, and peer-review policy;
- `submissions` and `revisions`: student-owned CER work, version, workflow state, hint process metrics, and timestamps;
- `ai_sessions` and `ai_interactions`: provider metadata, Coach request/response evidence, fallback status, and scoped ownership; do not store provider secrets;
- `peer_reviews`: explicit reviewer/author scope and activity consent, with policies preventing unauthorized cross-student access;
- `teacher_reviews`: teacher-owned final score/comment records scoped to classes the teacher teaches;
- `learning_events`: append-only event envelope with school/course/class/activity/student scope, actor, correlation ID, payload, and occurred time;
- `consent_records`: student/guardian/school consent version, purpose, status, and timestamps before real student data is enabled;
- `research_participant_keys`: a separately protected identity map; exported evidence rows must omit raw student identity fields.

Every student-owned table must have a direct or enforceable path to `student_profile_id`, `class_id`, and `activity_id` where applicable. Add indexes for `(student_profile_id, activity_id)`, `(class_id, created_at)`, and event correlation queries. Add uniqueness or idempotency constraints for submission versions and event IDs so retries do not duplicate learning evidence.

#### RLS and authorization rules

- Students can read their own profile-scoped activities, submissions, revisions, AI sessions/interactions, and timeline events only when they have an active class membership.
- A student cannot read, update, submit for, or request Coach data for another student, even when a different ID is placed in a URL or request body.
- Teachers can read submissions and process evidence only for active classes they teach; they can write teacher reviews only for those classes.
- Students can access peer-review data only for assignments explicitly enabled by the activity and policy; reviewer and author visibility must be deliberately defined.
- Learning events are append-only to application roles. Updates/deletes are blocked except through an audited retention/deletion procedure.
- Research export is a controlled server-side operation that separates the identity map from evidence and never grants broad browser table access.
- All policies must derive authorization from `auth.uid()` and membership rows, not from a client-supplied role, school, class, teacher, or student ID.

#### Implementation order

1. Decide the school authentication and roster model, consent wording, retention period, data region, and Supabase environments.
2. Create local Supabase migrations and synthetic fixtures; do not import Factory OS data or real student data.
3. Add the server identity resolver and construct `LearningContext` only after session and membership checks succeed.
4. Implement Supabase repository and event adapters against the existing interfaces; keep the memory adapter working.
5. Enable RLS and test direct database access with two student identities, a teacher, and an unauthorized identity.
6. Add a persistence feature flag. Keep `LEARNING_PERSISTENCE=memory` as the default until all acceptance criteria pass; allow `supabase` only in an explicitly configured environment.
7. Update API routes and auth UI without trusting browser IDs. Keep the Coach provider boundary and education safety rules unchanged.
8. Run local database, application, security, and export checks. Pilot only with synthetic or consented test accounts after the gate is signed off.
9. Document rollback to memory mode and the approved process for deletion, export, backup restore, and consent withdrawal.

#### Phase 4 acceptance criteria

- Two synthetic student accounts can use the same activity while each sees only their own submissions, revisions, AI interactions, hints, and timeline events.
- Changing `studentId`, `classId`, `teacherId`, or role in a browser request cannot cross the authenticated user's RLS or server context boundary.
- A teacher sees only submissions from active classes they teach and remains the only final grader.
- Peer-review visibility is denied unless the activity and assignment explicitly allow it.
- Data survives an application restart and repository contract tests pass for both memory and Supabase adapters.
- Learning events remain append-only, correlated, queryable, and idempotent across request retries.
- Consent, retention, deletion, and research-export rules are documented and exercised with synthetic data.
- Supabase service-role credentials and all LLM credentials are absent from browser bundles and client responses.
- Mock provider and manual fallback continue to work without external LLM credentials.
- Research exports keep the identity map separate from evidence rows and contain no raw student identity in evidence.
- `cmd.exe /c npm run typecheck`, `cmd.exe /c npm test`, and `cmd.exe /c npm run build` pass after the integration; RLS/database tests pass when the local Supabase CLI is available.
- Factory OS remains untouched, and Learning OS contains no Factory OS runtime import or factory domain terminology in the student workflow.

#### Planned verification commands — not run for this planning update

```powershell
npx supabase start
npx supabase db reset
npx supabase test db
cmd.exe /c "npm run typecheck"
cmd.exe /c "npm test"
cmd.exe /c "npm run build"
rg -n "SUPABASE_SERVICE_ROLE_KEY|service_role|NEXT_PUBLIC_.*SERVICE|FactoryContext|factoryId|siteId|MQTT|IoT" src supabase
```

Phase 4 gate: NOT STARTED. Do not enable real student persistence until identity, membership, consent, RLS, export, retention, and rollback checks pass.

## 8.5 Phase 5 — Grade 10 (ม.4) Biology Knowledge Base, Hybrid RAG, and Multi-Layer Prompt Isolation Architecture

### Problem & Objective
1. **Grade 10 (ม.4) Biology Insight Data**: Ingest, structure, and curate authentic curriculum knowledge across the 6 core ecosystem topics (Ecosystem structure, Energy flow & 10% rule, Biogeochemical cycles, Ecological succession, Interspecific interactions, and Bioaccumulation/Biomagnification) according to Thai IPST (สสวท.) standards.
2. **Hybrid RAG Pipeline**: Overcome the limitations of pure vector embeddings on Thai scientific jargon by combining Sparse BM25 (tokenized via native `Intl.Segmenter` with `{ locale: "th", granularity: "word" }`) and Dense Vector Embeddings fused via Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking.
3. **Multi-Layer Prompt Isolation & Anti-Distraction Fortress**: Decouple the AI Coach into an Air-Gapped Two-Pass architecture:
   - **Pass 1 (Structured Evaluator)**: Quarantines raw student input inside strict XML envelopes and evaluates the CER submission into **strictly validated JSON**.
   - **Pass 2 (Socratic Generator)**: Uses only the clean JSON evaluation and approved RAG context to formulate the Socratic question, completely immunizing the generator from student prompt injections, roleplays, jailbreaks, or tone hijacking.

### Planned Deliverables
- `src/data/course/ecosystem/knowledge-base.ts`: Complete structured knowledge repository with core claims, misconception diagnostic guides, and rubric anchors.
- `src/lib/knowledge/hybrid-rag.ts`: Hybrid RAG engine with Thai-segmented BM25, vector search, and RRF.
- `src/lib/ai/prompt-templates.ts`: Strict XML-wrapped isolated prompt envelopes.
- `src/lib/ai/coach.ts`: Two-pass decoupled Socratic coach engine with markdown sanitizers.
- `src/lib/safety/education-policy.ts`: Anti-injection and out-of-scope guardrail kernel.
- `docs/HYBRID_RAG_AND_PROMPT_ISOLATION_PLAN.md`: Technical reference and architectural design document.
- `src/lib/hybrid-rag.test.ts` and `src/lib/prompt-isolation.test.ts`: Verification and adversarial test suites.

### Acceptance Criteria
- Top-k retrieval accurately matches both exact Thai biological keywords and semantic concepts with zero hallucination outside approved chunks.
- Adversarial student inputs (e.g. "Ignore previous instructions", "Give direct answer", "What is your system prompt") are 100% neutralized, yielding pedagogical Socratic prompts with zero direct answers and zero prompt leaks.
- All verification commands (`cmd.exe /c "npm run typecheck"`, `cmd.exe /c "npm test"`) pass cleanly.

## 8.6 Phase 6 — 7-Phase ADI Guided Wizard & AI-Assisted Peer Review Exchange

### Problem & Objective
1. **End-to-End Inquiry Progression**: Transition from a single-screen CER form into a structured 7-Phase ADI Guided Wizard (Orientation, Identification, Investigation, Argumentation, Peer Review, Revision, Reflection).
2. **AI-Assisted Peer Review**: Enable smart peer review exchange with Socratic AI Coach assistance and realistic synthetic fallback for single-user testing.
3. **UI/UX Modernization**: Eliminate cluttered form controls in favor of an intuitive, beautiful, responsive, stepper-driven interface with clear visual hierarchy, soft card surfaces, and accessible form semantics.

### Planned Deliverables
- `src/lib/domain/types.ts`: 7-phase state, peer review, and reflection data models.
- `src/lib/repository/memory-repository.ts`: Peer review and reflection storage with pre-seeded synthetic peer drafts.
- `src/app/api/peer-reviews/route.ts` & `src/app/api/reflections/route.ts`: API endpoints for peer reviews and reflections.
- `src/components/adi-stepper.tsx`: Interactive 7-phase progress stepper.
- `src/components/phases/`: Dedicated modular components for Phases 1 to 7.
- `src/components/student-workbench.tsx`: Cleaned, unified 7-Phase ADI Hub.
- `src/app/globals.css`: Premium, human-centered UI/UX styling.
- `src/lib/adi-7phase.test.ts`: Automated test suite for the 7-phase lifecycle.

## 8.7 Current Gemini work audit — 2026-08-23

Audit scope: current `main` at `bd39397` plus the uncommitted working tree. The audit preserved all implementation changes and did not read or modify Factory OS.

### Verification actually run

- `git status --short --branch` → `main...origin/main`; 18 tracked files modified and new Supabase/repository/telemetry files present, plus untracked `pptx_edit_tmp/`.
- `cmd.exe /c "npm run typecheck"` → passed with exit code 0.
- `cmd.exe /c "npm test"` → passed: 8 test files / 22 tests.
- `cmd.exe /c "npm run build"` → passed: Next.js 15.5.23 generated 15 routes.
- `git diff --check` → reported one blank line at EOF in `src/app/globals.css`; no other whitespace errors were reported.
- Static client-bundle scan → 0 references to `SUPABASE_SERVICE_ROLE_KEY` or `service_role` in `.next/static`.
- Supabase CLI → absent; `supabase/config.toml` is absent; no migration/RLS database test was run.
- Ollama listener on `localhost:11434` during this audit → absent. The Ollama tests catch connection failures and still pass, so the 2 Ollama tests are not live-inference evidence for this audit.
- Vitest process environment had no Supabase or LLM variables; Supabase adapter tests therefore exercise the in-memory fallback branch, not a live Supabase database.

### Findings

1. **P0 — Do not use with real student data: RLS is not class-scoped.** `is_teacher()` grants access to every student row for any profile with a teacher/researcher/admin role, and the policies use `OR is_teacher()` without checking an active class membership. The schema has no membership table or foreign-key path for this decision. See `supabase/migrations/001_initial_schema.sql` and `supabase/migrations/002_row_level_security.sql`.
2. **P0 — Peer-review RPC does not bind the caller to the supplied student.** `get_assigned_peer_review_draft` is `SECURITY DEFINER`, accepts `p_reviewer_student_id` from the caller, and does not verify `auth.uid()` or revoke public execution. It can query submissions outside the caller's class scope. See `supabase/migrations/003_peer_review_rpc.sql`.
3. **P1 — Supabase persistence is not wired into production routes.** Four API routes still import `@/lib/repository/memory-repository`; no API route imports `repository/index` or `supabase-repository`. `GET /api/health` also hardcodes `persistence: "in-memory-mvp"`. The feature flag currently selects an unused adapter.
4. **P1 — The adapter bypasses RLS and trusts domain IDs.** `supabase-repository.ts` constructs its client from `SUPABASE_SERVICE_ROLE_KEY`, then filters by caller-provided `studentId`. The server session client does not read cookies or resolve `auth.uid()`, so the planned Auth → membership → `LearningContext` boundary is absent.
5. **P1 — Database errors silently become memory writes.** Most adapter methods fall back to the in-memory repository on any Supabase error. A successful database write followed by a response/read error can therefore create a second local record and return success while durable state is uncertain. This is unsafe for submissions, revisions, reviews, and consent-sensitive evidence.
6. **P1 — Integration tests are false-green when external services are unavailable.** `supabase-repository.test.ts` is passing against memory because the Vitest process has no Supabase environment; `ollama.test.ts` catches connection failures and asserts only that the provider name is local. These tests need explicit skip/required modes and a real local Supabase two-student RLS test before Phase 7 can pass.
7. **P1 — The database foundation is incomplete relative to the approved Phase 4 contract.** There are no schools/courses/classrooms/memberships, activities, AI sessions/interactions, consent records, research participant keys, or correlation/occurred-at event columns. There are also no uniqueness/idempotency constraints for submission versions and event retries.
8. **P2 — Peer-review authorization remains client/domain-ID driven.** The API accepts `studentId`, `reviewerStudentId`, `authorStudentId`, and submission identifiers from the request and validates only the demo scope/self-review check. The database policies do not verify assignment/activity consent or prevent an author from learning reviewer identity through the raw row.
9. **P2 — Phase 8 diagnostics are demo-only and privacy-sensitive.** Student IDs are user-editable and persisted in `localStorage`; the browser diagnostic logger records prompt text and can copy recent logs. The UI labels the model `ornith:9b` even when the configured provider/model differs. This needs a privacy policy and authenticated identity boundary before classroom use.

### Audit decision

The 7-phase ADI UI and local demo changes are acceptable as prototype work, subject to normal product review. Supabase Phase 4/7 is **NOT READY** and must not be marked complete or enabled for real students. The next implementation order is: add authenticated session/membership resolution; redesign class-scoped RLS; lock down the RPC; wire routes through a persistence port; remove silent database-error fallback; add local Supabase integration tests with two students and one teacher; then rerun the full gate.

## 8.8 Runtime loading, caching, and bundle audit — 2026-08-23

This was a read-only runtime check requested after the Gemini audit. “Bone pacment” was interpreted as bundle/performance placement. No application source, Factory OS file, secret, or generated artifact was copied between repositories.

### Actual smoke-test evidence

- The first development check started `npm run dev` on port 3000. The browser loaded the homepage with title `Learning OS — Ecosystem ADI`, rendered the ADI 7-phase activity, and reported no browser console errors. `GET /` returned HTTP 200.
- A clean `cmd.exe /c "npm run build"` was run after stopping all servers. It passed and generated the 15-route production build; the Next report showed 123 kB first-load JavaScript for `/` and 103 kB shared JavaScript.
- The final `cmd.exe /c "npm run start"` is running on `http://localhost:3000` against that clean production build.
- Final browser smoke test: `http://localhost:3000/` rendered the full homepage and reported no console errors.
- Final HTTP check: `GET /` → 200 in approximately 176 ms, 10,173 bytes, `Cache-Control: s-maxage=31536000`, with an ETag.
- Final and latest health recheck at 21:15 (+07:00): `GET /api/health` → 200, JSON `status: "ok"`, `llmProvider: "local"`, and `persistence: "in-memory-mvp"`. It has no explicit `Cache-Control` header or ETag.
- Final hashed JavaScript check: `/_next/static/chunks/framework-085cf39580498177.js` → 200, 189,765 bytes, `Cache-Control: public, max-age=31536000, immutable`, with an ETag.
- Production `.next/static` contained 32 files totaling approximately 896.9 KiB. The earlier development `.next/static` measured approximately 8.8 MiB because it included HMR/dev tooling and is not a production bundle-size measure.

### Runtime conclusions

1. The site is currently loading on port 3000 through the clean production server. The health route is reachable, but its response correctly exposes the current limitation: runtime persistence is still in-memory.
2. Production HTML and hashed static assets have long-lived caching. The health API has no explicit cache policy; it should be reviewed before real student data or authenticated identity is enabled.
3. The production bundle is materially smaller than the development HMR output. The build report is the authoritative first-load measure; do not use the 7.6 MiB development `main-app.js` as the production size.
4. `next.config.ts` has no custom cache headers or application cache layer. Supabase/LLM response caching is not implemented and should not be added until identity, privacy, and event-consistency decisions are approved.
5. Do not run `next dev` concurrently with `next build` or `next start` in this project: all modes share `.next`, and the earlier overlap temporarily corrupted the dev/production generated output. The servers were stopped, the build was rerun cleanly, and only the final production server was left running.

## 8.9 Password-protected demo mode — 2026-08-23

Status: **IMPLEMENTED and HTTP-tested; disabled in the current local environment until the owner chooses a password.** This feature is for local presentation/demo access, not real student authentication.

### Behavior

- When `DEMO_MODE_ENABLED=true`, unauthenticated page requests redirect to `/demo` and unauthenticated API requests return HTTP 401.
- One server-side password unlocks the existing student workspace, teacher review, analytics, timeline, and demo API surfaces through one signed session cookie.
- `/api/health`, static assets, `/demo`, and demo login/logout endpoints remain reachable so the gate can load and be monitored.
- When the flag is absent or false, the existing Learning OS behavior remains unchanged. The current server on `http://localhost:3000` is in this normal mode.

### Configuration

Add these values to the uncommitted `.env.local` file; never commit or expose the password:

```text
DEMO_MODE_ENABLED=true
DEMO_MODE_PASSWORD=<choose-a-local-demo-password>
DEMO_MODE_SESSION_SECRET=<choose-a-random-server-secret>
```

After changing the values, restart development mode or rebuild and restart the production server. The password and session secret are not included in client code, HTML, logs, or `.env.example` values.

### Implementation files

- `src/lib/demo-mode.ts` — HMAC password/session verification and eight-hour expiry.
- `src/middleware.ts` — opt-in route gate for pages and API requests.
- `src/app/demo/page.tsx` and `src/components/demo-login-form.tsx` — password entry and unlocked demo landing page.
- `src/app/api/demo/login/route.ts` — server-side password check and HttpOnly cookie.
- `src/app/api/demo/logout/route.ts` — cookie removal and return to the gate.
- `.env.example` — placeholders only; no real secret was added.
- `src/lib/demo-mode.test.ts` — password, signing, expiry, tamper, and enable-flag tests.

### Verification actually run

- `cmd.exe /c "npm run typecheck"` → **PASSED**.
- `cmd.exe /c "npm test"` → **PASSED**, 9 test files / 25 tests.
- Temporary test-only `npm run build` with demo variables → **PASSED**, 19 generated pages and middleware.
- Temporary HTTP smoke test on port 3100: root before login → 307 to `/demo`; demo page → 200; API before login → 401; wrong password → 401; correct password → 200; API after login → 200; teacher review after login → 200; health → 200. Only the cookie name `learning_os_demo` was inspected; its value was never printed.
- Clean normal `npm run build` after the smoke test → **PASSED**. The normal frontend was restarted on port 3000 and rendered without browser errors.

### Boundaries and remaining decisions

- Demo mode is a presentation gate, not a replacement for Supabase Auth, class membership, RLS, consent, or teacher authorization. Do not use it with real student data.
- The password grants access to the existing prototype surfaces; it does not turn in-memory persistence into durable per-student storage.
- Choose the actual demo password and session-secret handling before enabling the flag on any shared or deployed environment.

## Future implementation phases

### Phase 9 — Authenticated Supabase persistence for each student

Status: **IN PROGRESS; application boundary and education migration/RLS/RPC slice implemented, verification gate still open.** Do not use the password-protected demo gate as a substitute for this phase.

Objective: replace client-supplied demo identity and in-memory writes with authenticated, class-scoped, durable Learning OS records while preserving the mock/local AI path.

Deliverables:

- Supabase Auth session handling with a server-side `auth.uid()` → `LearningContext` resolver.
- Education-only tables and migrations for schools, courses, classes, memberships, activities, submissions, revisions, AI sessions/interactions, hints, peer reviews, teacher reviews, learning events, consent, and research identity mapping.
- Class-scoped RLS policies tested with two students, one teacher, and an unauthorized user.
- Locked-down peer-review RPC bound to the authenticated reviewer and assigned class/activity.
- Repository and event-store ports wired into every API route; no silent Supabase-to-memory fallback after the gate.
- Durable event correlation, idempotency, occurred-at timestamps, versioning, export separation, retention, deletion, and consent withdrawal rules.
- Authenticated student/teacher UI states and a rollback switch that keeps memory mode available for local development.

Acceptance criteria:

- Two synthetic students can use the same activity while each can read and write only their own submissions, revisions, AI interactions, hints, and timeline events.
- A teacher can access only the approved class scope; changing browser `studentId`, `classId`, role, or reviewer IDs cannot cross the server or RLS boundary.
- Restarting the app does not lose accepted synthetic records; retries do not duplicate submissions or learning events.
- Teacher review remains the final academic decision; authorship indicators remain review signals; no AI grading is introduced.
- Research export separates identity mapping from evidence and contains no raw identity in evidence rows.
- `cmd.exe /c "npm run typecheck"`, `cmd.exe /c "npm test"`, `cmd.exe /c "npm run build"`, route smoke tests, and live local Supabase isolation tests pass.

Phase 9 blockers: live Supabase CLI/Docker verification, route-level two-student tests, restart durability evidence, and approved school authentication/consent/retention/data-residency decisions remain open before real student data is allowed.

### Phase 10 — Pilot readiness, performance, caching, and deployment

Status: **PLANNED; begin only after the Phase 9 gate passes.**

Objective: make one approved activity safe and observable for a small synthetic/consented pilot, with predictable performance and a reversible deployment path.

Deliverables:

- Teacher pilot workflow: class roster, activity assignment, review queue, final score/comment, peer-review moderation, and export approval.
- Production safety: environment validation, rate limits, request IDs, structured audit events, error boundaries, health/readiness checks, secret scans, and safe provider fallback.
- Cache policy: immutable caching for hashed static assets; `no-store` for authenticated student/teacher/API responses; only cache versioned approved activity context or explicitly consented aggregate analytics; never cache raw student work or personalized AI responses across students.
- Bundle/performance budgets and route smoke measurements for student and teacher flows; fix regressions before deployment.
- Deployment plan with separate development/staging/production environments, Supabase migration ordering, backup/restore rehearsal, rollback to memory/mock mode, and demo-mode isolation.
- Privacy/pilot checklist covering consent, deletion, export, support contacts, data residency, incident response, and classroom access roles.

Acceptance criteria:

- A synthetic pilot can complete the full activity from draft through teacher review without data leakage or lost events.
- No browser bundle contains service-role, LLM, or other server-only secrets; API keys remain server-side.
- Cache headers match the approved policy, authenticated data is not served from a shared cache, and a second student never receives the first student’s response.
- Health/readiness checks distinguish app availability, database availability, and provider availability without claiming persistence or LLM readiness that was not verified.
- Build, tests, security checks, export-separation checks, performance checks, and deployment rollback checks pass from a clean checkout/build directory.
- Demo mode remains clearly labeled, opt-in, and unavailable for real student data.

Phase 10 blockers: Phase 9 identity/RLS must pass first; production deployment also requires an approved school pilot, consent/retention decision, infrastructure owner, and rollback contact.

Token-saving order for these phases: finish the Phase 9 identity/RLS slice and two-student tests first; wire only the routes used by the first activity; then add Phase 10 cache/security/observability controls; defer broad analytics, multi-course support, and additional AI providers until the pilot gate passes.

## 9. Open decisions

| Decision | Current safe default | Decision owner / gate |
|---|---|---|
| DeepSeek vs local model | Mock now; local adapter next; DeepSeek explicit opt-in | Technical owner + advisor |
| Supabase/Postgres timing | Artifacts exist, but memory remains the runtime until the audited Phase 4/7 gate passes | Technical owner |
| Supabase environment boundary | One project per environment with per-student RLS; not one project per student | Technical owner + school |
| Authentication and class roster | Demo identity until the school selects an auth/invite/SSO and roster source | School/advisor before pilot |
| Student/guardian consent | No real student data until consent scope, withdrawal, retention, and deletion are approved | School/advisor/research owner |
| Research identity map | Separate protected map from evidence rows; access through an approved export path | Research owner / consent review |
| Data residency and retention | Keep local synthetic data first; choose production region and deletion window before pilot | School/advisor |
| Peer review | Activity flag controls it; first food-web activity is off | Advisor/teacher |
| Hint cost | Process metric only; never deducted from academic score without teacher decision | Advisor/teacher |
| Authorship indicators | Teacher-review signal only | Advisor/teacher |
| Research export | Separate identity map from evidence events | Research owner / consent review |
| Thai/English UI | Existing Thai-first student copy; contracts support both | Advisor |

## 10. Risks and blockers

- Factory OS is dirty and remains outside the Learning OS write scope.
- Live Factory OS telemetry and Phase 5 database gates are irrelevant to the Learning OS MVP and must not be pulled into it.
- Learning OS dependencies are installed for the current MVP; the recorded install timed out after adding the declared packages and reported 8 audit vulnerabilities. No automatic dependency fix was run.
- In-memory data is not durable and is not suitable for real student data.
- No real student authentication/consent/retention implementation exists yet; the current password gate is demo-only. Before pilot, add server-controlled identity, class membership, RLS, consent, and export controls.
- Supabase RLS can appear correct while an application route still trusts client-supplied IDs; direct database tests and route-level two-student isolation tests are both required.
- Current Gemini Supabase migrations use a broad teacher predicate and an unbound `SECURITY DEFINER` peer-review RPC; treat the database as unsafe until those policies are replaced and tested.
- Current API routes still use memory repositories and the health route reports memory persistence regardless of the feature flag.
- Current external-service tests can pass when Supabase/Ollama is unavailable; live integration evidence is still missing.
- Minor/student privacy, consent withdrawal, retention, deletion, backup restore, data residency, and school roster integration are unresolved Phase 4 gates.
- Provider output can be malformed or unsafe; fallback and schema/safety checks are required on every path.

## 11. Token-saving implementation order

1. Read this file, `handoff.md`, and `agent.md`; confirm the Factory OS path is read-only.
2. Preserve the existing CER demo and research docs; do not redo completed Phases 1–3.
3. Reuse the existing education contracts, repository interfaces, event envelope, safety policy, and mock provider.
4. Before database code, settle auth/roster, consent, retention, deletion, data residency, and research-access decisions.
5. Add local education-only migrations and synthetic fixtures; do not import Factory OS data or real student data.
6. Add server identity resolution and RLS tests with two students, one teacher, and an unauthorized user.
7. Implement Supabase repository/event adapters behind `LEARNING_PERSISTENCE=supabase`; keep memory as the default and rollback path.
8. Update only the required API/auth surfaces; keep Coach access server-side and provider selection unchanged.
9. Run database isolation tests, typecheck, unit tests, build, route smoke, secret scans, and export-separation checks.
10. Record exact results and update this file and `handoff.md` after every Phase 4 slice.
11. Stop at any decision requiring a Factory OS modification, real credentials, or real student data without approved consent.

## 12. Phase handoff protocol

After every meaningful step and at every phase boundary, update `handoff.md` with:

- current phase and status;
- files changed in Learning OS;
- Factory OS files inspected/reused by pattern and intentionally excluded;
- commands actually run and their result;
- blockers/open decisions;
- exact next command or next implementation slice.

If a different LLM continues this task, it must read `agent.md`, then `handoff.md`, then this document before editing. It must not infer completion from old notes or from a plan checkbox.

**Factory OS remains read-only.**

## Phase 9 implementation log — 2026-08-23

Current status: IN PROGRESS. This log records implementation evidence only; Phase 9 acceptance criteria are not yet marked complete.

Implemented in the Learning OS workspace:

- Server-side Supabase SSR client with cookie-backed sessions and an auth callback. `auth.uid()` is resolved to `learning_profiles`, active `memberships`, class/course scope, and a `LearningContext`.
- Explicit local-memory identity for development and rollback only. Browser `studentId`, `teacherId`, `classId`, and role values are not used as authorization sources.
- Request-scoped repository factory. Supabase mode uses the SSR client and RLS; database errors are surfaced instead of silently writing to memory. Memory mode remains explicit and non-durable.
- First-activity route wiring for submissions, revisions, learning events, timelines, AI sessions/interactions, teacher review, peer-review assignment, reflection, Coach events, activity access, research export, and health status.
- Education-only migration `005_phase9_education_model.sql` for schools, courses, classes, learning profiles, memberships, activity assignments, AI sessions/interactions, hints, consent records, and a protected research identity map, plus scope/idempotency columns on evidence tables.
- `006_phase9_rls.sql` replaces broad prototype policies with `auth.uid()`/membership/class/activity checks, append-only learning-event access, and restricted research identity access.
- `007_phase9_peer_review_rpc.sql` removes the caller-supplied reviewer argument, binds assignment to `auth.uid()`, checks class/activity assignment, redacts peer authorship, and adds an auth-bound peer-review submission RPC with explicit execute grants.
- `supabase/tests/phase9_isolation.sql` and `npm run test:db` provide a live database isolation test path. The command reports an explicit skip when the Supabase CLI is absent.

Files intentionally excluded: Factory OS files, Factory OS schema/data, real student records, real credentials, and Phase 10 pilot/deployment work.

Verification actually run for this log:

- `cmd.exe /c "npm run typecheck"` → PASSED (0 errors).
- No live Supabase migration/RLS test has been run yet; CLI/Docker availability remains to be checked.
- Unit and build suites have not yet been rerun after the Phase 9 route/schema changes.

Exact next step: add the two-student/teacher/tampering/idempotency unit coverage, run `npm run test:db` and record whether it is skipped or passes, then run the full typecheck/test/build/diff verification.

## Phase 10 implementation log — 2026-08-26

Current status: Teacher Pilot Operations slice (Roster, CER Rubric Evaluation, De-identified Research Export) COMPLETE.

Implemented in the Learning OS workspace:
- Extended domain contracts and schemas for granular CER rubric evaluation (`claim`, `evidence`, `reasoning` levels 1-4) in [`TeacherReview`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/lib/domain/types.ts).
- Class roster, activity assignment, and student ADI progress tracking endpoint [`/api/teacher/roster`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/app/api/teacher/roster/route.ts) with `Cache-Control: no-store, private` headers.
- Interactive Teacher Class Roster page [`/teacher/roster`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/app/teacher/roster/page.tsx) with ADI stage badges and direct links to student evidence.
- Upgraded Teacher Review Queue [`/teacher/review`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/app/teacher/review/page.tsx) with CER rubric buttons, 100-point total calculator, submission search/filters, and expandable Socratic interaction & revision diff logs.
- Interactive Research Export in [`/teacher/analytics`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/app/teacher/analytics/page.tsx) supporting both one-click JSON and CSV formats with PDPA/IRB identity-map separation.
- Verified test suite [`src/lib/teacher-pilot.test.ts`](file:///c:/Users/woram/OneDrive/Desktop/Hatairat/learn%20os/src/lib/teacher-pilot.test.ts) covering rubric scoring, roster aggregation, and CSV formatting.

Verification results:
- `npm run typecheck` → PASSED (0 errors).
- `npm test` → PASSED (11 test files / 32 tests passed).
- `npm run build` → PASSED (22 static/dynamic routes compiled).

