# Coach and retrieval evaluation

This evaluation separates predictable retrieval checks from educator judgment of AI feedback. Retrieval metrics are not learning outcomes and must not be reported as student scores.

## Retrieval checks

`src/data/course/ecosystem/rag-evaluation-cases.ts` contains synthetic Thai queries, their approved activity scope, and expected approved knowledge chunks. `evaluateKnowledgeRetrieval()` in `src/lib/knowledge/evaluation.ts` reports Recall@K, mean reciprocal rank, empty-result checks, and scope leaks. Review the expected chunk IDs whenever a content pack changes. Run the same cases against the sparse baseline and any dense adapter before switching retrieval behavior.

## Coach review rubric

Educators should rate a sample of outputs from each prompt/model/content-pack version on a 1–4 scale:

1. **Evidence fidelity:** factual claims are supported by the approved activity context and cited sources.
2. **Socratic value:** the response asks the student to think or explain, rather than supplying the CER answer.
3. **CER alignment:** the question addresses a meaningful claim, evidence, or reasoning gap in the student's draft.
4. **Scope and safety:** the response stays within the assigned activity and does not grade, accuse, or expose system instructions.
5. **Thai clarity:** the wording is age-appropriate, readable, and unambiguous.

Also record direct-answer leakage, unsupported claims, bad citations, guardrail replacement, and provider fallback as yes/no outcomes. Double-rate a subset and resolve rubric disagreements before using results to compare versions. Keep examples synthetic or properly consented and de-identified.

Every generated CER response records `promptVersion`; the feedback event records both prompt and content versions. Increase `COACH_PROMPT_VERSION` when coaching instructions change materially. A new version should not be promoted based on model-judged preference alone; educator review remains the decision point.

## Current limits

The retrieval harness covers the current ecosystem content pack only. There is not yet a teacher-facing review UI or a live model benchmark command. Do not treat fallback/mock responses as evidence of a production model's quality.
