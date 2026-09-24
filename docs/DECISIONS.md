# Decision Log

## D-001 — Course scope

**Status:** accepted

Use Biology Grade 10, ecosystem unit. Initial activity coverage is food webs and energy flow.

## D-002 — Outcome priority

**Status:** accepted for scaffold

Analytical thinking is the primary outcome. AI Literacy is secondary/exploratory and should not dominate the system design or claims.

## D-003 — Research design language

**Status:** accepted for scaffold

Use one-group pretest–posttest. Describe pre/post differences and limitations; avoid causal language that requires a control group.

## D-004 — Hint point system

**Status:** open — advisor confirmation required

The scaffold records costs as a separate process metric. It does not yet deduct from academic activity scores.

Open question: should point deduction affect an activity score, a separate AI-independence score, or only be reported descriptively?

## D-005 — Authorship detection

**Status:** accepted as indicators only

Record revision pattern, response time, copy similarity, and follow-up response quality. These indicators surface cases for teacher review and cannot establish authorship on their own.

## D-006 — Peer review

**Status:** accepted for design

Peer review is enabled only when the activity phase explicitly permits it. AI may coach the reviewer, while the teacher remains the final reviewer.

## D-007 — LLM provider

**Status:** accepted for scaffold

Use a server-side provider adapter with DeepSeek V3/R1-compatible configuration and a mock fallback for development. No API key is committed to the repository.

## D-008 — Ethics

**Status:** open — research process

Parent consent and student assent are required. The current research note should state the absence of IRB approval as a limitation until the applicable approval path is confirmed.

## D-009 — Local Ollama LLM Engine

**Status:** accepted and verified

Support local OpenAI-compatible Ollama daemon (`http://localhost:11434/v1`) via `LocalProvider` with reasoning extraction, `<think>` tag sanitization, and fallback to MockProvider on connection errors. Configurable via `LEARNING_LLM_PROVIDER=local` and `LOCAL_LLM_MODEL=ornith:9b`.

## D-010 — 7-Phase ADI Guided Wizard & Structured Reflection

**Status:** accepted and verified

Adopt 7 ADI learning phases (Orientation, Identification, Investigation, Argument, Peer Review, Revision, Reflection). Store phase reflections with structured dimensions (`conceptualLearning`, `inquiryProcessReflection`, `peerReviewExperience`, `confidenceScore`, `keyTakeaway`).

## D-011 — Next milestone: real CAR pilot on Supabase

**Status:** accepted (2026-09-25)

The next "usable version" is a real classroom-action-research pilot with durable student data in Supabase cloud (one project per environment, RLS isolation). No pilot date is fixed; the full ticket list in `tickets/` is in scope, including the AI Opponent and pre/post analytics. Real student data is blocked until tickets LOS-003, LOS-004, LOS-005, LOS-006, LOS-007, and LOS-009 are done.

## D-012 — Teacher rubric: CER and synthetic thinking scored separately

**Status:** accepted (2026-09-25)

Teachers rate CER (claim, evidence, reasoning; 1–4) and the four synthetic-thinking dimensions (selecting, connecting, reconstructing language, direct answering; 1–4) as two independent instruments. The system must not derive CER scores from synthetic-thinking scores. Tracked in LOS-007.
