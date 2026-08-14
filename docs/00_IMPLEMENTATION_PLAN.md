# Learning OS — Scaffold Implementation Plan

## 1. Research baseline

| Area | Decision for scaffold | Consequence |
|---|---|---|
| Design | One-group pretest–posttest | Report association/pre-post change; do not claim full causality |
| Primary outcome | Analytical thinking | CER rubric, revision quality, and pre/post analytical-thinking test are central |
| Secondary outcome | AI Literacy | Treat as secondary/exploratory; keep H2 tentative until advisor confirms |
| Satisfaction | Dependent variable | Formalize H3 and collect post-intervention survey |
| Course | Biology Grade 10, ecosystem | RAG and activities use food webs, energy flow, and approved examples |
| LLM | DeepSeek V3/R1 API behind an adapter | API key stays server-side; mock provider supports local development |
| Ethics | Parent consent + student assent | IRB status remains a documented limitation until approval exists |
| Peer review | AI-assisted only during an explicit activity phase | Activity has a `peer_review` phase flag and audit event |

## 2. MVP scope

### In scope

1. Student selects an ecosystem ADI activity.
2. Student submits a CER response.
3. AI Coach analyses missing CER dimensions and returns a Socratic follow-up.
4. Student can request a hint with a recorded depth and point cost.
5. The system records draft/revision metadata, response time, AI interaction, and timeline events.
6. Teacher-facing data can later consume the authorship indicators; the system does not make an academic-integrity verdict.

### Out of scope for the first scaffold

- Real student authentication and class roster management
- Production database and vector index
- Final research instruments, sample size, and statistical thresholds
- Automatic grading or automatic authorship accusations
- Production consent workflow and deployment to a school server

## 3. Suggested repository structure

```text
src/
├── app/
│   ├── api/health/route.ts
│   ├── api/activities/route.ts
│   ├── api/sessions/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── data/course/ecosystem/activities.ts
├── components/
└── lib/
    ├── ai/{provider,deepseek-provider,coach}.ts
    ├── analytics/authorship.ts
    ├── domain/types.ts
    ├── events/timeline.ts
    └── repository/memory-repository.ts
```

## 4. Core flow

```text
Student draft
  → input guardrail (MVP validation)
  → CER analysis + course context
  → DeepSeek adapter or mock provider
  → output guardrail (no direct answer)
  → record hint cost and authorship indicators
  → append learning timeline event
  → student revises
```

## 5. Data contracts to preserve

### Activity

- `courseId`, `unit`, `adiPhase`, `prompt`
- `rubricDimensions`: claim, evidence, reasoning
- `peerReviewAllowed`: explicit phase control

### Session submission

- `studentId`, `activityId`, `content`, `version`
- `hintDepth`, `hintCost`, `responseTimeSeconds`
- `previousDraftContent` for revision comparison

### Authorship indicators

- `revisionCount`
- `responseTimeSeconds`
- `copySimilarityToPrompt`
- `followUpResponseQuality` when a follow-up answer is available
- `status`: `none | observe | teacher_review`

These indicators are evidence for teacher review, not a detector and not a grade.

## 6. Point deduction decision

Until Q4 is confirmed by the advisor, store two independent values:

- `activityScore`: quality of the submitted CER work, assigned by teacher/rubric
- `aiIndependenceScore`: an experimental process metric derived from hint usage

Default hint costs:

| Hint type | Cost |
|---|---:|
| No AI request | 0 |
| Shallow/calculation | -1 |
| Concept check | -2 |
| Socratic deep dive | -3 |

Do not subtract these costs from the teacher's academic score until the advisor approves the scoring rule.

## 7. Build phases

1. **Scaffold and contracts** — current milestone; mock data, API routes, provider interface.
2. **Research alignment** — revise proposal/methodology and lock instruments with advisor.
3. **Course RAG** — ingest approved Grade 10 ecosystem materials, rubric, and citations.
4. **Persistence and identity** — Supabase/Postgres, RBAC, consent, append-only events.
5. **Teacher review** — submissions, peer-review queue, authorship indicators, manual decision.
6. **Pilot readiness** — guardrail tests, usability test, data export, backup/retention, contingency for delayed quizzes.

## 8. Acceptance criteria for the next milestone

- A student can complete one ecosystem activity from draft to feedback to revision.
- Every AI request has a hint depth and timeline event.
- The API does not expose `DEEPSEEK_API_KEY` to the browser.
- The response path has a fallback when the LLM is unavailable.
- The UI labels authorship signals as “teacher review indicator,” never as plagiarism/copy verdict.
- Research documents clearly distinguish primary, secondary, and exploratory outcomes.
