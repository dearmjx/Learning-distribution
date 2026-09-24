# LOS-009: Live verification: Ollama + Supabase end-to-end

- **Status:** open
- **Priority:** P1
- **Area:** verification
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

Handoff: live Ollama and live Supabase were never proven. Required before real student data (agent.md Phase 4 rules).

## Acceptance criteria

- [ ] Two synthetic students + one teacher run full 7 phases against live Supabase
- [ ] RLS isolation SQL test passes on live DB
- [ ] Coach answers via local Ollama within target latency
