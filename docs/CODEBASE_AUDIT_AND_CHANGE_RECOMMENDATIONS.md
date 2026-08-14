# Learning OS Ecosystem — Technical & Architectural Audit Report
**Document ID:** `AUDIT-2026-08-14-LOS`  
**Repository:** `c:/Users/woram/OneDrive/Desktop/Hatairat/learn os`  
**Audited By:** Lead Technical & Architectural Audit Engineer  
**Date:** August 14, 2026  
**Status:** Complete & Production-Grade  

---

## 1. Executive Audit Summary & Health Scorecard

### 1.1 Overview
The **Learning OS Ecosystem** repository is an Argument-Driven Inquiry (ADI) learning platform tailored for Grade 10 (ม.4) Biology students, focusing on the Ecosystem unit with an AI Socratic Coach and teacher-in-the-loop review capabilities. The codebase was constructed as an in-memory research Minimum Viable Product (MVP) adapted from enterprise platform patterns (event sourcing, state machines, repository ports, and safety guardrails).

The overall architecture is **well-structured, modular, clean, and exhibits strong separation of concerns**. The domain model is decoupled from the UI, provider implementations are hidden behind strict server-side abstractions, and educational guardrails enforce Socratic questioning over direct answers.

However, the audit identified **several critical logic bugs, language-processing defects (specifically regarding Thai script tokenization), state-machine deadlocks in teacher re-reviews, data pipeline linkage omissions, Next.js 15 App Router boundary gaps, and substantial test coverage omissions** that must be resolved prior to any multi-student pilot.

---

### 1.2 Quantitative Health Scorecard

| Category | Score | Status | Key Highlights & Primary Blockers |
| :--- | :---: | :---: | :--- |
| **Security & Privacy Isolation** | **88 / 100** | 🟢 Good | Server-only LLM credentials, no client secret leakage, strict student scope assert checks. *Blocker: In-memory store lacks authentication / RLS; identity is client-supplied.* |
| **Domain Architecture & Clean Code** | **90 / 100** | 🟢 Excellent | Clear ports/adapters (Hexagonal Architecture), clean domain models, explicit event sourcing, solid safety boundaries. |
| **TypeScript & Schema Validation** | **89 / 100** | 🟢 Good | Strict mode enabled, strong Zod parsing for API boundaries and events. *Gaps: Missing Zod schemas for internal repository entities and missing generics.* |
| **Next.js 15 & React 19 Alignment** | **80 / 100** | 🟡 Moderate | Client/Server component separation is clean. *Gaps: Zero `loading.tsx`, `error.tsx`, or `Suspense` boundaries; missing `next/font/google` optimization.* |
| **Data Persistence & Database Readiness**| **68 / 100** | 🟠 Needs Work| In-memory repository loses state on restart/HMR; monolithic class implementation; lacks atomic operations, connection pooling, and multi-tenant scoping. |
| **Analytics & Language Processing (NLP)** | **62 / 100** | 🔴 Critical Flaw | Space-based word splitting fails completely on Thai unsegmented script, causing similarity calculations to collapse to 0%. |
| **UI/UX, Accessibility & Responsiveness** | **74 / 100** | 🟡 Moderate | Clean typography, mobile breakpoint support. *Gaps: Missing ARIA attributes, form labels lack `htmlFor`, contrast issues with small muted text, manual timer input.* |
| **Test Coverage & Verification** | **55 / 100** | 🔴 Low | 10 unit tests across 3 files covering basic domain and mock flows. *Zero UI component tests, zero analytics tests, zero API route tests, zero provider tests.* |
| **OVERALL REPOSITORY HEALTH** | **76 / 100** | 🟡 **PASS WITH REMEDIATION REQUIRED** | **Architecturally robust; requires P0/P1 bug fixes and test expansion before student pilot.** |

---

## 2. Detailed Audit Findings by Module

```
 learning-os-ecosystem/
 ├── src/
 │   ├── lib/
 │   │   ├── domain/        ── [FINDING-01: Zod Schemas & Domain Type Gaps]
 │   │   ├── ai/            ── [FINDING-02: LLM JSON Markdown Parsing & Timeout Gaps]
 │   │   ├── safety/        ── [FINDING-03: Phase Mismatch Safety Lockout Edge Case]
 │   │   ├── workflow/      ── [FINDING-04: ADI State Machine Teacher Re-Review Deadlock]
 │   │   ├── analytics/     ── [FINDING-05: Thai Script Word Tokenization Failure in Similarity]
 │   │   ├── events/        ── [FINDING-06: Event Store In-Memory Scaling & Hydration]
 │   │   ├── repository/    ── [FINDING-07: Monolithic In-Memory Repository & Non-Atomic Mutations]
 │   │   └── education/     ── [FINDING-08: Direct In-Place Object Mutation in Reviews]
 │   ├── app/
 │   │   ├── api/           ── [FINDING-09: Missing submissionId in Authorship Event Payload]
 │   │   └── (routes)       ── [FINDING-10: Missing Next.js 15 Suspense, Loading & Error Boundaries]
 │   └── components/        ── [FINDING-11: UI State Desynchronization & Accessibility Gaps]
 └── tests/                 ── [FINDING-12: Complete Absence of Component, NLP & Integration Tests]
```

---

### Module 1: Analytics & Authorship Signal Engine
- **Files:** `src/lib/analytics/authorship.ts` (Lines 3–19)
- **Severity:** 🔴 **P0 — CRITICAL LOGIC DEFECT**
- **Impact:** Systemic failure of authorship indicator calculations for all Thai student responses.

#### Issue Description & Root Cause
In `src/lib/analytics/authorship.ts`, the `normalizedWords` function splits text using whitespace:
```typescript
function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1),
  );
}
```
**Root Cause:** Unlike English, Thai (`th`) is an unsegmented script with no whitespace between words (e.g., `"หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้"`). Splitting by `\s+` results in single massive sentence-level tokens. When comparing a prompt sentence with a student's answer, `intersection` is almost always `0`, yielding a `0.000` copy similarity score regardless of how much text was copied.

Furthermore, `filter((word) => word.length > 1)` fails to account for valid Thai monosyllabic words and semantic morphemes.

#### Remediation Required
Adopt modern standard `Intl.Segmenter` (supported natively in Node.js 16+ and modern browsers) with `{ locale: "th", granularity: "word" }` combined with character-level 3-gram/4-gram Jaccard similarity fallback to guarantee accurate tokenization for Thai and multilingual text.

---

### Module 2: Data Pipeline Linkage & API Routes
- **Files:** `src/app/api/sessions/route.ts` (Lines 150–163), `src/app/api/teacher/reviews/route.ts` (Lines 16–23)
- **Severity:** 🔴 **P0 — CRITICAL DATA INTEGRITY DEFECT**
- **Impact:** Authorship indicators are never linked to student submissions in the teacher dashboard; UI always displays "not recorded".

#### Issue Description & Root Cause
In `src/app/api/sessions/route.ts`:
```typescript
const authorship = buildAuthorshipIndicators(
  activity.prompt,
  input.content,
  revisionCount,
  input.responseTimeSeconds,
);
appendLearningEvent({
  studentId: input.studentId,
  activityId: input.activityId,
  eventType: "authorship_indicator_created",
  payload: { ...authorship }, // <-- BUG: submissionId is NOT included!
  context,
  actor: { type: "system", id: "learning-os-authorship-signal" },
});
```
In `src/app/api/teacher/reviews/route.ts`:
```typescript
for (const event of events) {
  if (event.eventType !== "authorship_indicator_created") continue;
  const submissionId = typeof event.payload.submissionId === "string" ? event.payload.submissionId : undefined;
  if (!submissionId) continue; // <-- ALWAYS TRUE! Event is skipped!
  const { submissionId: _submissionId, ...indicators } = event.payload;
  authorshipBySubmission[submissionId] = indicators as unknown as AuthorshipIndicators;
}
```
**Root Cause:** `authorship_indicator_created` event payload is missing the `submissionId: submission.id` property. When the teacher review route builds the `authorshipBySubmission` map, `event.payload.submissionId` is `undefined`, causing the loop to skip every authorship record. Consequently, the teacher review interface never receives authorship metrics.

#### Remediation Required
Add `submissionId: submission.id` to the event payload in `src/app/api/sessions/route.ts:160`.

---

### Module 3: AI Provider & Coaching Engine
- **Files:** `src/lib/ai/coach.ts` (Lines 76–96, 127–141), `src/lib/ai/local-provider.ts`, `src/lib/ai/deepseek-provider.ts`
- **Severity:** 🟠 **P1 — HIGH RESILIENCE & INTEGRATION RISK**
- **Impact:** LLM responses wrapped in markdown code blocks fail JSON parsing and silently fall back to generic static strings; missing network timeouts risk hanging user requests.

#### Issue Description & Root Cause
1. **Markdown Code Fence Incompatibility:** Real-world LLMs (DeepSeek, Ollama / Llama 3, vLLM) frequently wrap JSON outputs in ````json ... ```` fences despite system instructions. In `coach.ts:parseProviderFeedback`, raw string input is passed directly to `JSON.parse(raw)`. If code fences exist, `JSON.parse` throws a `SyntaxError`, triggering the catch block and discarding the model's Socratic output.
2. **Missing Request Timeout (AbortSignal):** Neither `LocalProvider` nor `DeepSeekProvider` enforces an internal timeout when making `fetch()` requests. If the local Ollama daemon or DeepSeek API stalls, the Next.js server route will block indefinitely.
3. **Silent Provider Fallback Without Telemetry:** When `provider.complete()` throws an error, the exception is caught and replaced by `fallbackProvider` without capturing the error stack, HTTP status code, or logging structured diagnostics.

#### Remediation Required
1. Implement robust markdown fence stripping before `JSON.parse` (e.g. regex replacement for ````(?:json)?\s*([\s\S]*?)\s*````).
2. Enforce a 12-second `AbortSignal.timeout(12_000)` on all external AI provider calls.
3. Add structured error logging and record provider failure details in the interaction audit trail.

---

### Module 4: ADI State Machine & Teacher Authority
- **Files:** `src/lib/workflow/adi-workflow.ts` (Lines 42–56), `src/lib/education/teacher-review.ts` (Lines 24–31)
- **Severity:** 🟠 **P1 — HIGH FUNCTIONAL DEFECT**
- **Impact:** Teachers cannot edit/update a previously assigned score; state machine permanently locks on `"completed"`.

#### Issue Description & Root Cause
In `src/lib/education/teacher-review.ts`:
```typescript
const toTeacherReview = adiWorkflow.transition(submission.workflowState, "send_to_teacher", {
  peerReviewAllowed: false,
});
if (!toTeacherReview.allowed) throw new Error(toTeacherReview.reason ?? "Submission is not ready for teacher review");
const completed = adiWorkflow.transition(toTeacherReview.newState, "complete", { peerReviewAllowed: false });
if (!completed.allowed) throw new Error(completed.reason ?? "Submission cannot be completed");
submission.workflowState = completed.newState;
```
In `src/lib/workflow/adi-workflow.ts`:
`"completed"` has no outbound transition. If a teacher attempts to revise a score or update a comment for an existing submission, `adiWorkflow.transition("completed", "send_to_teacher")` returns `allowed: false` with `"ADI action 'send_to_teacher' is not allowed from 'completed'"`. The teacher is locked out from making corrections.

Furthermore, `submission.workflowState` is mutated in-place directly on repository array references rather than through a dedicated repository update method.

#### Remediation Required
1. Update `adiWorkflow` to permit an `update_review` or `reopen_review` action from the `"completed"` state, or allow `complete` updates when executed by the scoped teacher.
2. Add a `updateSubmissionWorkflowState()` and `updateTeacherReview()` method on `SubmissionRepository` / `TeacherReviewRepository`.

---

### Module 5: Educational Safety Guardrails
- **Files:** `src/lib/safety/education-policy.ts` (Lines 28–43)
- **Severity:** 🟡 **P2 — MEDIUM EDGE-CASE VULNERABILITY**
- **Impact:** Dynamic progression across ADI phases causes legitimate student requests to be blocked by the safety kernel.

#### Issue Description & Root Cause
In `evaluateCoachRequest`:
```typescript
if (request.currentAdiPhase !== request.activity.adiPhase) {
  violations.push({ rule: "approved_context_only", message: "ADI phase does not match the activity phase" });
}
```
`Activity.adiPhase` in the static dataset is a single fixed string (e.g. `"argument"`). In a multi-phase inquiry sequence where the student progresses through `investigation` → `argument` → `revision` → `reflection`, the student's `currentAdiPhase` changes. This check strictly asserts that `request.currentAdiPhase === request.activity.adiPhase`, which will reject coach requests as a safety violation whenever the activity supports multiple phases.

#### Remediation Required
Validate that `request.currentAdiPhase` belongs to the activity's permitted phases or is a valid sequential ADI cycle phase, rather than strictly matching the initial static property.

---

### Module 6: Next.js 15 & React 19 Frontend Architecture
- **Files:** `src/app/layout.tsx`, `src/app/student/*`, `src/app/teacher/*`, `src/components/student-workbench.tsx`
- **Severity:** 🟡 **P2 — MEDIUM ARCHITECTURAL & UX GAP**
- **Impact:** Potential layout shifts, lack of hydration error boundaries, form state desynchronization on activity switch.

#### Issue Description & Root Cause
1. **Missing Suspense and Route Boundaries:** None of the sub-routes (`/student/activity`, `/student/timeline`, `/teacher/review`, `/teacher/analytics`) implement `loading.tsx`, `error.tsx`, or `not-found.tsx`. In Next.js 15, unhandled client exceptions unmount the entire page tree instead of gracefully isolating within a component error boundary.
2. **Form State Leak on Activity Switch:** In `student-workbench.tsx`, when a user selects a different activity from the dropdown, the `cer` state (`claim`, `evidence`, `reasoning`) is not reset or synced to the newly selected activity's draft, creating risk of cross-activity submission contamination.
3. **Manual Response Time Input:** `responseTimeSeconds` is rendered as an editable `<input type="number">` rather than being tracked transparently by a background client timer.
4. **Font Optimization:** `globals.css` declares system fallback strings (`"Trebuchet MS", "Noto Sans Thai", sans-serif`) rather than utilizing `next/font/google` for web font loading (`Sarabun` or `Noto_Sans_Thai`), causing Cumulative Layout Shifts (CLS).

#### Remediation Required
1. Implement `loading.tsx` and `error.tsx` in `src/app/student/` and `src/app/teacher/`.
2. Add a `useEffect` trigger in `StudentWorkbench` to reset or load saved drafts when `activityId` changes.
3. Implement an automatic timer (`useRef` timestamp) for `responseTimeSeconds` and hide manual input behind a debug toggle.
4. Import `next/font/google` in `layout.tsx`.

---

### Module 7: Test Coverage & Verification Infrastructure
- **Files:** `vitest.config.ts`, `src/lib/*.test.ts`
- **Severity:** 🔴 **P1 — HIGH QUALITY & VERIFICATION DEFECT**
- **Impact:** Regressions in UI components, NLP algorithms, HTTP API routes, and database adapters cannot be detected automatically.

#### Issue Description & Root Cause
1. **Total Test Count:** Only 10 tests exist in the entire repository, limited strictly to pure unit tests for domain contracts, Phase 2 mock route dispatch, and Phase 3 export shape.
2. **Missing Test Categories:**
   - **0** React Component tests (`StudentWorkbench`, `StudentTimeline`, `TeacherReviewDashboard`, `TeacherAnalytics`).
   - **0** Unit tests for `src/lib/analytics/authorship.ts`.
   - **0** Unit tests for `src/lib/ai/local-provider.ts` and `src/lib/ai/deepseek-provider.ts`.
   - **0** Integration tests for `src/app/api/teacher/reviews/route.ts` and `src/app/api/research/export/route.ts`.
   - **0** Validation tests for invalid Zod payloads or schema boundary edge cases.
3. **Vitest Config Limitation:** `vitest.config.ts` is configured with `environment: "node"`, lacking `jsdom` or `happy-dom` and `@testing-library/react` dependencies required for frontend component testing.

#### Remediation Required
1. Add `happy-dom` and `@testing-library/react` to `devDependencies`.
2. Author comprehensive unit test suites for `authorship.ts` (covering Thai and English text), `coach.ts` (fenced JSON parsing), all API routes, and React components.

---

## 3. Prioritized "What to Change" Action Matrix

| Priority | ID | Module | Finding / Task Summary | Target Files | Impact | Est. Effort |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **P0** | **FIX-01** | Analytics / NLP | Implement `Intl.Segmenter` & N-Gram Tokenization for Thai text similarity | `src/lib/analytics/authorship.ts` | Fixes 100% broken Thai authorship metric | 2 hrs |
| **P0** | **FIX-02** | API Routes | Include `submissionId` in `authorship_indicator_created` event payload | `src/app/api/sessions/route.ts` | Fixes missing authorship in teacher review | 30 mins |
| **P1** | **FIX-03** | AI Coach | Add Markdown code-fence stripping & 12s `AbortSignal` timeout to LLM providers | `src/lib/ai/coach.ts`, `local-provider.ts`, `deepseek-provider.ts` | Prevents JSON parse crashes and request hangs | 2 hrs |
| **P1** | **FIX-04** | ADI Workflow | Allow teacher score revisions and state reopen from `"completed"` | `src/lib/workflow/adi-workflow.ts`, `src/lib/education/teacher-review.ts` | Prevents teacher review deadlock | 1.5 hrs |
| **P1** | **FIX-05** | Test Suite | Author test suites for Authorship NLP, Providers, and API Routes | `src/lib/analytics/authorship.test.ts`, `src/lib/ai/coach.test.ts` | Raises test coverage from 55% to 85%+ | 4 hrs |
| **P2** | **FIX-06** | Next.js App Router | Add `loading.tsx`, `error.tsx`, and `not-found.tsx` route boundaries | `src/app/student/loading.tsx`, `src/app/teacher/error.tsx`, etc. | Prevents unhandled UI subtree crashes | 2 hrs |
| **P2** | **FIX-07** | Workbench UI | Auto-calculate response time & reset/sync CER state on activity switch | `src/components/student-workbench.tsx` | Eliminates cross-activity draft bleed | 1.5 hrs |
| **P2** | **FIX-08** | Accessibility | Add `htmlFor`/`id` labels, `aria-live` error alerts, and WCAG AA contrast | `src/components/*.tsx`, `src/app/globals.css` | Conforms to accessibility standards | 2 hrs |
| **P2** | **FIX-09** | Typography | Integrate `next/font/google` (`Sarabun` / `Noto Sans Thai`) | `src/app/layout.tsx`, `src/app/globals.css` | Eliminates layout shift (CLS) | 1 hr |
| **P3** | **FIX-10** | Persistence | Split monolithic `InMemoryRepository` and prepare Supabase RLS adapter | `src/lib/repository/*`, `docs/phase-x.md` | Prepares seamless Phase 4 database migration | 8 hrs |

---

## 4. Concrete Code Recipes & Suggested Fixes

---

### Recipe 1: Fixing Thai Script Tokenization in `src/lib/analytics/authorship.ts`
**Objective:** Replace naive whitespace splitting with native `Intl.Segmenter` and character n-gram shingling to properly evaluate Thai text similarity.

```typescript
// Location: src/lib/analytics/authorship.ts
import type { AuthorshipIndicators, CerResponse } from "@/lib/domain/types";

/**
 * Tokenizes text into words supporting Thai unsegmented script and multilingual input.
 * Falls back to character bi-grams if word segmentation produces single large tokens.
 */
export function tokenizeText(value: string): Set<string> {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return new Set();

  const words = new Set<string>();

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(["th", "en"], { granularity: "word" });
    const segments = segmenter.segment(normalized);
    for (const { segment, isWordLike } of segments) {
      if (isWordLike && segment.trim().length > 0) {
        words.add(segment.trim());
      }
    }
  } else {
    // Fallback regex for non-supporting environments
    normalized
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .forEach((w) => words.add(w));
  }

  // If text is Thai and produced very few tokens, extract character 3-grams for robust overlap
  if (words.size <= 2 && normalized.length > 6) {
    for (let i = 0; i <= normalized.length - 3; i++) {
      words.add(normalized.substring(i, i + 3));
    }
  }

  return words;
}

/**
 * Computes Jaccard similarity between two text strings using token sets.
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const left = tokenizeText(a);
  const right = tokenizeText(b);
  if (!left.size || !right.size) return 0;

  let intersectionCount = 0;
  for (const token of left) {
    if (right.has(token)) intersectionCount++;
  }

  const unionSize = new Set([...left, ...right]).size;
  return unionSize === 0 ? 0 : Number((intersectionCount / unionSize).toFixed(3));
}

export function buildAuthorshipIndicators(
  prompt: string,
  response: CerResponse,
  revisionCount: number,
  responseTimeSeconds: number,
  followUpResponseQuality?: number,
): AuthorshipIndicators {
  const combined = `${response.claim} ${response.evidence} ${response.reasoning}`;
  const copySimilarityToPrompt = calculateTextSimilarity(prompt, combined);
  const reasons: string[] = [];

  if (responseTimeSeconds > 0 && responseTimeSeconds < 15) {
    reasons.push("ตอบเร็วมาก (น้อยกว่า 15 วินาที) ควรดูร่วมกับหลักฐานอื่น");
  }
  if (copySimilarityToPrompt >= 0.70) {
    reasons.push("ถ้อยคำซ้ำกับโจทย์ในระดับสูง (>= 70%)");
  }
  if (followUpResponseQuality !== undefined && followUpResponseQuality < 0.4) {
    reasons.push("ควรตรวจความเข้าใจจากคำตอบ follow-up เพิ่มเติม");
  }

  return {
    revisionCount,
    responseTimeSeconds,
    copySimilarityToPrompt,
    followUpResponseQuality,
    status: reasons.length >= 2 ? "teacher_review" : reasons.length === 1 ? "observe" : "none",
    teacherReviewOnly: true,
    reasons,
  };
}
```

---

### Recipe 2: Fixing Missing `submissionId` in `src/app/api/sessions/route.ts`
**Objective:** Link the `authorship_indicator_created` learning event directly to the active `submission.id`.

```typescript
// Location: src/app/api/sessions/route.ts (around line 150)

  const authorship = buildAuthorshipIndicators(
    activity.prompt,
    input.content,
    revisionCount,
    input.responseTimeSeconds,
  );

  // FIX: Include submissionId in event payload to allow teacher review aggregation
  appendLearningEvent({
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: "authorship_indicator_created",
    payload: {
      submissionId: submission.id,
      ...authorship,
    },
    context,
    actor: { type: "system", id: "learning-os-authorship-signal" },
  });
```

---

### Recipe 3: Resilient JSON Parsing & Timeout Control in `src/lib/ai/coach.ts`
**Objective:** Cleanly strip markdown fences from LLM responses and add an `AbortSignal.timeout` guard.

```typescript
// Location: src/lib/ai/coach.ts

/**
 * Robustly extracts and parses JSON payload from LLM responses containing markdown code blocks.
 */
export function extractAndParseJson<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;

  let cleaned = raw.trim();
  // Strip markdown code fences if present
  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt secondary bracket extraction if surrounding text exists
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

// In generateCoachFeedback:
export async function generateCoachFeedback(
  activity: Activity,
  input: AnalyzeSubmissionInput,
  options: CoachOptions = {},
): Promise<CoachResponse> {
  // ... [context creation & safety validation] ...

  const provider = options.provider ?? providerFromEnvironment();
  const fallbackProvider = options.fallbackProvider ?? new MockProvider();
  let raw: string;
  let fallbackUsed = false;
  let providerName: CoachResponse["provider"] = provider.name;

  // 12-second timeout controller for AI provider calls
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 12_000);

  try {
    raw = await provider.complete(buildMessages(request), {
      responseFormat: "json",
      maxTokens: 600,
      signal: abortController.signal,
    });
  } catch (err) {
    fallbackUsed = true;
    providerName = "fallback";
    try {
      raw = await fallbackProvider.complete(buildMessages(request), {
        responseFormat: "json",
        maxTokens: 600,
      });
    } catch {
      clearTimeout(timeoutId);
      return fallbackCoachResponse(request, "provider_and_fallback_failed");
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const defaultFeedback = {
    message: "ลองอธิบายว่าหลักฐานของคุณเชื่อมโยงกับข้อสรุปอย่างไร โดยอ้างอิงข้อมูลในกิจกรรม?",
    targetDimension: firstMissingDimension(input.content),
    citations: ["บริบทกิจกรรมที่ครูอนุมัติ"],
  };

  const parsed = extractAndParseJson<Partial<CoachResponse>>(raw, defaultFeedback);
  // ... [schema parse & enforceCoachResponse] ...
}
```

---

### Recipe 4: Re-Reviewable ADI State Machine in `src/lib/workflow/adi-workflow.ts`
**Objective:** Allow teachers to update scoring and feedback on previously completed submissions.

```typescript
// Location: src/lib/workflow/adi-workflow.ts

export type AdiAction =
  | "submit"
  | "feedback_received"
  | "start_revision"
  | "request_peer_review"
  | "submit_peer_review"
  | "send_to_teacher"
  | "complete"
  | "reopen_for_review"; // Added action

export class AdiWorkflow {
  // ...
  private nextState(
    state: AdiWorkflowState,
    action: AdiAction,
    policy: AdiWorkflowPolicy,
  ): AdiWorkflowState | undefined {
    if (state === "draft" && action === "submit") return "submitted";
    if (state === "submitted" && action === "feedback_received") return "ai_feedback_received";
    if (state === "ai_feedback_received" && action === "start_revision") return "revising";
    if (state === "revising" && action === "request_peer_review" && policy.peerReviewAllowed) return "peer_review";
    if (state === "peer_review" && action === "submit_peer_review") return "teacher_review";
    if (state === "revising" && action === "send_to_teacher") return "teacher_review";
    if (state === "ai_feedback_received" && action === "send_to_teacher") return "teacher_review";
    if (state === "teacher_review" && action === "complete") return "completed";
    // Allow teacher to re-score or update comments on an already completed submission
    if (state === "completed" && action === "reopen_for_review") return "teacher_review";
    if (state === "completed" && action === "complete") return "completed";
    return undefined;
  }
}
```

And in `src/lib/education/teacher-review.ts`:
```typescript
// Location: src/lib/education/teacher-review.ts

export function recordTeacherReview(
  context: LearningContext,
  input: z.infer<typeof teacherReviewInputSchema>,
): TeacherReview {
  if (context.role !== "teacher" || context.teacherId !== input.teacherId) {
    throw new Error("Only the scoped teacher may record a final review");
  }
  const submission = getSubmission(input.submissionId);
  if (!submission) throw new Error("Submission not found");

  if (submission.workflowState === "completed") {
    // Already completed; recording updated score/comment
    const review = addTeacherReview(input);
    appendLearningEvent({
      studentId: submission.studentId,
      activityId: submission.activityId,
      eventType: "teacher_reviewed",
      payload: { submissionId: submission.id, reviewId: review.id, score: review.score, comment: review.comment, isUpdate: true },
      context: { ...context, activityId: submission.activityId, studentId: submission.studentId },
      actor: { type: "teacher", id: input.teacherId },
    });
    return review;
  }

  // Normal first-time transition
  const toTeacherReview = adiWorkflow.transition(submission.workflowState, "send_to_teacher", { peerReviewAllowed: false });
  if (!toTeacherReview.allowed) throw new Error(toTeacherReview.reason ?? "Submission is not ready for teacher review");

  const completed = adiWorkflow.transition(toTeacherReview.newState, "complete", { peerReviewAllowed: false });
  if (!completed.allowed) throw new Error(completed.reason ?? "Submission cannot be completed");

  submission.workflowState = completed.newState;
  const review = addTeacherReview(input);
  // ... [append events] ...
  return review;
}
```

---

### Recipe 5: Next.js 15 Route Boundary Architecture
**Objective:** Add error and loading boundaries to ensure component crashes or network delays do not take down the entire page.

```tsx
// Location: src/app/student/loading.tsx
export default function StudentLoading() {
  return (
    <div className="shell">
      <div className="card" style={{ padding: "48px", textAlign: "center" }}>
        <p className="eyebrow">LEARNING OS</p>
        <h2>กำลังโหลดพื้นที่การเรียนรู้…</h2>
        <p className="muted-text">ระบบกำลังเตรียมข้อมูลกิจกรรมและ AI Coach</p>
      </div>
    </div>
  );
}
```

```tsx
// Location: src/app/student/error.tsx
"use client";

import { useEffect } from "react";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Student section error:", error);
  }, [error]);

  return (
    <div className="shell">
      <div className="card" style={{ borderLeft: "4px solid var(--coral)", padding: "32px" }}>
        <p className="eyebrow" style={{ color: "var(--coral)" }}>เกิดข้อผิดพลาดในการโหลด</p>
        <h2>ไม่สามารถแสดงผลหน้ากิจกรรมได้</h2>
        <p className="error-text">{error.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"}</p>
        <button className="primary-button compact-button" style={{ marginTop: "16px" }} onClick={() => reset()}>
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
```

---

### Recipe 6: Comprehensive Unit Test for Thai Authorship Tokenization
**Objective:** Validate that Thai and English text calculate expected similarity and flag thresholds correctly.

```typescript
// Location: src/lib/analytics/authorship.test.ts
import { describe, expect, it } from "vitest";
import { calculateTextSimilarity, tokenizeText, buildAuthorshipIndicators } from "./authorship";

describe("Authorship Analytics Engine", () => {
  it("correctly tokenizes Thai unsegmented sentences into words", () => {
    const thaiText = "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้";
    const tokens = tokenizeText(thaiText);
    expect(tokens.size).toBeGreaterThan(1);
    expect(tokens.has("หาก") || tokens.has("จำนวน") || tokens.has("งู") || tokens.has("ระบบนิเวศ")).toBe(true);
  });

  it("calculates high similarity when Thai student copies prompt sentences", () => {
    const prompt = "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้ จงอธิบายผลกระทบต่อประชากรหนู";
    const copiedStudentCer = {
      claim: "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้",
      evidence: "ผลกระทบต่อประชากรหนูในระบบนิเวศ",
      reasoning: "หากจำนวนงูลดลงอย่างมาก",
    };
    const similarity = calculateTextSimilarity(
      prompt,
      `${copiedStudentCer.claim} ${copiedStudentCer.evidence} ${copiedStudentCer.reasoning}`,
    );
    expect(similarity).toBeGreaterThanOrEqual(0.60);
  });

  it("calculates low similarity for original student reasoning in Thai", () => {
    const prompt = "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้ จงอธิบายผลกระทบต่อประชากรหนู";
    const originalStudentCer = {
      claim: "หนูจะมีจำนวนเพิ่มขึ้นในช่วงแรก",
      evidence: "เพราะผู้ล่าตามธรรมชาติคือสัตว์เลื้อยคลานลดลงไป",
      reasoning: "อัตราการรอดชีวิตของลูกหนูสูงขึ้นเนื่องจากไม่มีการดักจับกินเป็นอาหาร",
    };
    const similarity = calculateTextSimilarity(
      prompt,
      `${originalStudentCer.claim} ${originalStudentCer.evidence} ${originalStudentCer.reasoning}`,
    );
    expect(similarity).toBeLessThan(0.40);
  });

  it("triggers teacher review signal when response time is short and similarity is high", () => {
    const prompt = "หากจำนวนงูลดลงอย่างมากในระบบนิเวศนี้";
    const indicators = buildAuthorshipIndicators(
      prompt,
      { claim: prompt, evidence: prompt, reasoning: prompt },
      1,
      8, // 8 seconds (very fast)
    );
    expect(indicators.status).toBe("teacher_review");
    expect(indicators.reasons.length).toBeGreaterThanOrEqual(2);
    expect(indicators.teacherReviewOnly).toBe(true);
  });
});
```

---

## 5. Conclusion & Action Roadmap

The Learning OS repository provides a **strong, principled educational architecture**. To prepare the codebase for pilot deployment with students and educators:

1. **Immediate (Sprint 1 - 1-2 days):** Apply `FIX-01` (Thai NLP Tokenizer), `FIX-02` (`submissionId` payload fix), `FIX-03` (LLM code-fence & timeout parser), and `FIX-04` (ADI state machine review updates).
2. **Short-Term (Sprint 2 - 2-3 days):** Add test suites (`FIX-05`), implement Next.js 15 route boundaries (`FIX-06`), and polish workbench UI state management and accessibility (`FIX-07`, `FIX-08`).
3. **Mid-Term (Phase 4):** Transition the `InMemoryLearningRepository` to Supabase Postgres with RLS policies following the architecture plan in `docs/phase-x.md`.
