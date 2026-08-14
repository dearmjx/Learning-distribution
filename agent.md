# Learning OS Agent Rules

This file is the local operating rule for Codex, Antigravity, or another LLM continuing the Learning OS project.

## Read first

1. `agent.md`
2. `handoff.md`
3. `docs/phase-x.md`
4. Existing source and research documents before editing them

`handoff.md` is the continuation state, not proof that a command passed. Verify anything that matters by running the command again when practical.

## Scope

- Work only in `C:\Users\woram\OneDrive\Desktop\Hatairat\learn os`.
- Treat `C:\Users\woram\OneDrive\Desktop\projectFACTORYOSSME` as a read-only reference.
- Never modify, delete, move, reset, checkout, clean, or commit Factory OS files.
- Never copy factory data, factory agents, IoT/MQTT code, certificates, private keys, `.env` files, API keys, tokens, passwords, `node_modules`, `.next`, `dist`, or generated build artifacts.
- Use `apply_patch` for source and documentation edits.

## Architecture rules

- Learning OS owns `LearningContext`, `LearningEvent`, education repositories, ADI workflow, Education Safety Policy, and Coach contracts.
- Do not import or mention `FactoryContext` in Learning OS implementation code.
- Do not add factory concepts such as machines, inventory, maintenance, production, suppliers, telemetry, OEE, VSM, digital twin, MQTT, or factory agents to the student workflow.
- Reuse Factory OS only through a local, domain-neutral adapter or a documented design pattern.
- Keep LLM access behind `LlmProvider`/Coach gateway code on the server.
- Mock provider is the safe default. Local provider is explicit opt-in. DeepSeek is explicit opt-in and must not be connected with real credentials during this migration.
- Every Coach response must be Socratic, evidence-grounded in approved activity context, marked `directAnswerBlocked: true`, and unable to assign a grade or plagiarism verdict.
- `hintCost` is a process metric. It is never silently subtracted from a teacher-assigned academic score.
- Authorship indicators are teacher-review signals only.
- Student data is class/student scoped. Teacher review is a separate, explicit capability.

## Phase 4 Supabase rules

- Use one Supabase project per environment with row-level isolation per student/class; do not create one database or project per student unless a documented school requirement makes that unavoidable.
- Treat every browser-supplied `studentId`, `classId`, `teacherId`, school ID, and role as untrusted input. Resolve identity from the Supabase Auth session and active membership on the server.
- Keep Supabase session access server-side for application data. A publishable/anonymous key may support the approved auth flow; a service-role key is server-only and must never enter client code, browser bundles, logs, or responses.
- Create education-only migrations and synthetic fixtures. Do not copy Factory OS Supabase clients, migrations, schemas, data, or credentials.
- Keep `LEARNING_PERSISTENCE=memory` as the default until two-student isolation, RLS, consent, retention, export, rollback, typecheck, tests, and build gates pass.
- Do not mark Phase 4 complete from a plan or migration file alone; verify direct database policies and route behavior with at least two synthetic students and one teacher.

## Verification and truthfulness

- Do not claim tests, builds, lint, migrations, or runtime checks passed unless the command succeeded in the current task.
- If dependencies are missing, record the exact limitation and install only normal project dependencies needed for verification.
- Do not print secret contents. When checking secret hygiene, inspect names/patterns or file presence without outputting values.
- Preserve existing student CER behavior and `research-source/` documents.

## Handoff discipline

Update `handoff.md` after every meaningful implementation or verification step. At minimum, record:

- status and current phase;
- exact files changed;
- reuse/adaptation/exclusion decisions;
- commands and actual results;
- blockers and open decisions;
- next action.

When context or quota is low, stop after updating `handoff.md`. The next LLM should continue from that file rather than hallucinating missing progress.

## Stop conditions

Stop and report if a requested decision requires changing Factory OS, copying protected material, enabling real credentials, introducing real student data, or making an unsupported academic/plagiarism decision.
