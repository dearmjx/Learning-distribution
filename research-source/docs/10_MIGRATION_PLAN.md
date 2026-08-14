# 10 — Migration Plan: Factory OS → Learning OS

> ดูเพิ่มเติมที่ Codex prompt ใน Factory OS repository

---

## Summary: What Maps to What

| Factory OS | Learning OS | Action |
|-----------|-------------|--------|
| Factory Operator | Student | Rename + adapt role |
| Factory Timeline | Learning Timeline | Adapt event types |
| Factory Memory | Student Learning Memory | Adapt schema |
| AI Agent | AI Coach + Bot Dear | Split + specialize |
| Factory KPI | Learning KPI | Replace domain |
| Factory Event | Learning Event | Replace domain |
| Human Approval | Teacher Review | Adapt workflow |
| Safety Kernel | AI Guardrail | Adapt rules |
| Factory Knowledge RAG | Course Knowledge RAG | Replace content |
| MES / ERP | [REMOVE] | Factory-specific |
| Machine monitoring | [REMOVE] | Factory-specific |
| OEE Dashboard | Learning Analytics Dashboard | Replace |
| Operator UI | Student UI | Rename + adapt |
| Factory Copilot | AI Learning Coach | Rename + adapt |

---

## Phases (ดูรายละเอียดใน Codex prompt)

```
Phase 0: Repository Analysis → LEARNING_OS_MIGRATION.md
Phase 1: Define Learning OS Architecture
Phase 2: Preserve Reusable Core
Phase 3: Remove Factory Domain (after dependency check)
Phase 4: Build Learning Domain entities
Phase 5: AI Tutor Design → ดู 04_AI_TUTOR_DESIGN.md
Phase 6: Personal Student Memory
Phase 7: Learning Timeline → ดู 09_LEARNING_TIMELINE.md
Phase 8: Human-in-the-Loop (Teacher Review)
Phase 9: AI Guardrail → ดู 06_SECURITY_PDPA.md
Phase 10: RAG → ดู 05_RAG_DESIGN.md
Phase 11: UI adaptation
Phase 12: Testing
Phase 13: Documentation
```

---

## Critical Engineering Rules (Quick Reference)

```
1.  Analyze before modifying
2.  Reuse before rewriting
3.  Refactor before duplicating
4.  Never blindly delete files
5.  Preserve git history
6.  Separate commits per phase
7.  No unnecessary frameworks
8.  No unjustified new dependencies
9.  Keep architecture modular
10. LLM provider-independent
11. LLM behind abstraction layer
12. RAG behind abstraction layer
13. Auth/authz centralized
14. Audit logs immutable
15. Never expose secrets
16. Never hard-code API keys
17. Follow existing project conventions
18. [เพิ่ม] Write test before refactor if no test exists
19. [เพิ่ม] Update docs when renaming domain concepts
20. [เพิ่ม] Stop and summarize if phase incomplete
21. [เพิ่ม] Report circular dependencies before fixing
22. [เพิ่ม] No LLM call without guardrail before deploy
```

---

## Execution Order for Codex

```
Run 1: Phase 0 only
  → output: docs/LEARNING_OS_MIGRATION.md
  → review: architecture map + dependency map

Run 2: Phase 1-3
  → output: migration plan approval
  → review: what will be deleted BEFORE deleting

Run 3: Phase 4-6
  → output: domain model + AI tutor stub

Run 4: Phase 7-11
  → output: timeline + UI adapted

Run 5: Phase 12-13
  → output: tests green + docs complete
```

---

## Risk Register

| ความเสี่ยง | ระดับ | มาตรการ |
|-----------|-------|---------|
| Codex ลบ module ที่ยังมี dependency | สูง | Phase 0 dependency map ก่อน |
| AI Tutor กลายเป็น answer machine | สูง | Guardrail + output filter |
| PDPA violation | สูง | Review 06_SECURITY_PDPA.md ก่อน deploy |
| Context window หมด | กลาง | แยก phase แต่ละ Codex run |
| Peer review de-anonymization | กลาง | Anonymization layer ใน system |
| Teacher authority bypassed by AI | กลาง | HITL enforcement ใน architecture |
