# LOS-009: Live verification: Ollama + Supabase end-to-end

- **Status:** in-progress
- **Priority:** P1
- **Area:** verification
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

Handoff: live Ollama and live Supabase were never proven. Required before real student data (agent.md Phase 4 rules).

## Acceptance criteria

- [ ] Two synthetic students + one teacher run full 7 phases against live Supabase
- [ ] RLS isolation SQL test passes on live DB
- [ ] Coach answers via local Ollama within target latency

## Blocker check (2026-09-26)

Live verification attempted and stopped per truthfulness rules:
1. **Local Ollama (`http://localhost:11434/v1/models`):** failed with `ECONNREFUSED` (and MCP `ollama_list_models` returned `Failed to connect to Ollama`). The local Ollama daemon (`ornith:9b`) is not running.
2. **Live Supabase (`NEXT_PUBLIC_SUPABASE_URL` in `.env.local`):** REST probe (`/rest/v1/schools?select=id&limit=1`) failed with `ENOTFOUND` (DNS resolution failed for the configured Supabase project hostname, or network/project is unavailable).
3. **Supabase CLI (`supabase test db`):** `supabase` CLI is not installed on PATH (`Get-Command supabase` returned no matches) and `supabase/config.toml` is not present.

`LEARNING_PERSISTENCE=memory` remains the default in `.env.local`.

