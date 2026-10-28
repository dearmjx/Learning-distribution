# Improvement sequence

This roadmap tracks the review items from October 14, 2026. It is implementation status, not approval to use real student data.

## 1. Pilot safety gate

**Implemented in code; operational gate remains open.** Production identity resolution now fails closed when persistence is in memory. The only production memory exception requires both `LEARNING_ALLOW_MEMORY_PRODUCTION=true` and the demo password gate. `/api/ready` reports memory persistence as not ready in production. Real student use still requires approved authentication/roster, consent, retention/deletion, data residency, and live two-student/teacher RLS and route verification.

## 2. Thai authorship similarity

**Implemented in code.** Authorship indicators now use Thai word segmentation and grapheme n-gram overlap as a fallback. They remain teacher-only review signals; they do not establish plagiarism or authorship.

## 3. Coach and RAG evaluation

**Evaluation scaffold implemented.** The project now has synthetic retrieval cases and Recall@K/MRR/scope-leak reporting, plus a teacher review rubric. Responses and feedback events carry prompt/content version identifiers. Educator review and live-provider evaluations remain to be completed before promoting a prompt or model.

## 4. Resumable learner progress

**Implemented for the seven-phase workbench.** Current phase, completed phases, variable notes, and CER draft are saved through the authenticated, class-scoped repository as idempotent learning events. The workbench restores the latest state and shows save status. These event snapshots contain student draft data, so retention/deletion controls remain part of the pilot gate. In-memory mode still loses progress when the process restarts; durable restart recovery requires the Supabase gate to pass.

## 5. Reusable course content

**Implemented as static versioned packs.** Ecosystem activities and approved knowledge are grouped and validated in a course content pack. Browser-based teacher authoring and database-managed content versioning remain future work.

## 6. Audit/documentation freshness

**Implemented.** The August 14 audit is labeled historical and points to this sequence. README links direct contributors to the content-pack guide, evaluation rubric, and current roadmap.

## Verification

Typecheck/build verification is recorded in the handoff. No test suite was added or run for this sequence. Live Supabase, production provider quality, school policy decisions, and restart durability are not claimed as verified.
