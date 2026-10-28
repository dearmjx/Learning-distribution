# Security verification — 2026-10-23

## Scope and result

Reviewed the Learning OS repository as checked out on 2026-10-23. This is a Next.js application with Supabase migrations, not the Hono/backend layout named in the work plan. No `backend/Dockerfile`, Hono routes, MCP server/tool registry, Vercel project configuration, or CI workflow is present in this checkout. Findings below therefore describe this repository only; deployed Vercel settings and the live database were not accessible from this workspace.

## Task 1 — Node.js and dependency verification

| Check | Evidence | Result |
|---|---|---|
| CVE fix version | Node.js security release lists fixed lines as 22.23.4, 24.22.1, and 26.12.1. | Used patched Node 24.22.1 for the final build and tests. |
| Local Node and npm | System `node --version` → `v24.15.0`; `npm --version` → `11.12.1`. `npm exec --yes --package=node@24.22.1 -- node --version` → `v24.22.1`. | System-wide Node remains old; patched Node was used temporarily through npm for verification. |
| Project pin | `.nvmrc` now contains `24.22.1`; `package.json` and root lockfile require `^24.22.1`. | Project configuration selects a patched Node 24 release. Upgrade the machine's global Node separately. |
| Application/tool dependencies | `next@15.5.28`, `vitest@5.0.5`, `vite@8.3.5`, resolved `postcss@8.5.31` (override `^8.5.23`). | Updated after audit findings; test suite is compatible. |
| Dependency audit baseline | Initial `npm audit --json` failed while registry DNS was unavailable. Retried with registry access and found 10 advisories (3 critical, 4 high, 3 moderate); the main app finding was Next.js below 15.5.24. | Security dependency updates applied; exact final audit follows. |
| Final dependency audit | `npm audit --json` → 0 info, 0 low, 0 moderate, 0 high, 0 critical; 125 dependency records. | Passed for the current lockfile. |
| Vercel runtime | No `vercel.json`, Vercel project metadata, or linked project is present; connected Vercel search returned no project matching `learning-os`. | Production runtime cannot be confirmed. Configure the actual Vercel project to Node 24.x and verify the deployment runtime after redeploy. |
| Docker/CI runtime | No Dockerfile, `backend/`, or CI workflow exists in the repository. | No container or CI runtime could be checked. |

The CVE affects the bundled Node.js Brotli decoder. The globally installed runtime remains `24.15.0`; final verification used the patched `24.22.1` binary from npm's temporary package execution. No global installer/version manager was used.

## Task 2 — security boundary findings

| Risk | Location | Assessment |
|---|---|---|
| P0 — no confirmed P0 issue in the reviewed source | Auth, repository, route, and migration review | No confirmed cross-tenant access or injection defect found in static review. Existing isolation checks are present, but live Supabase policies were not exercised. |
| P1 — deployed identity/schema remains unverified | `src/lib/auth/supabase-identity.ts:48-145`; `supabase/migrations/006_phase9_rls.sql:1-28, 112-248`; `supabase/tests/phase9_isolation.sql` | API identity resolves from `auth.getUser()` through profile and active membership. Migrations define class-scoped RLS and the SQL test exercises synthetic isolation. The connected Supabase account did not provide a project that could be mapped to this checkout; no live database run or deployment schema/version evidence was available, so production isolation is not confirmed. |
| P1 — Vercel runtime and actual deployment are unverified | `.nvmrc:1`; `package.json:5-7` | Repository pins patched Node 24.22.1, but production setting, deployment build runtime, and running function runtime cannot be observed locally. |
| P1 — in-memory limiter is not shared across serverless instances | `src/lib/safety/rate-limit.ts:1-35`; `src/app/api/coach/chat/route.ts:65-67` | Limiter state is a process-local `Map`; it does not enforce a global per-student limit across Vercel instances. The code documents this local-server limitation. Use a shared limiter before treating it as a production abuse boundary. |
| P2 — dependency audit status unknown | `package-lock.json`; npm audit command result above | Lockfile is available, but registry advisory data could not be fetched. There is no defensible vulnerability count yet. |

### Controls observed

- `src/lib/supabase/server.ts` uses the session cookie and publishable/anon key; `src/lib/supabase/admin.ts` is the only source reference to `SUPABASE_SERVICE_ROLE_KEY`, and it is not imported by routes/repositories in this checkout.
- API routes call `resolveLearningIdentity`; student IDs are compared against the resolved identity. Supabase access uses the session client, leaving row policies active.
- `supabase/migrations/006_phase9_rls.sql` installs class-scoped policies. `013_research_data_hardening.sql` restricts consent writes, pins `search_path` on security-definer functions, and removes direct authenticated update/delete access to learning events.
- Query construction uses the Supabase client methods; no raw SQL execution, shell execution/`child_process`, Hono API, or MCP tool execution was found in application source.
- Coach inputs are schema validated and routed through the server-side Coach gateway. This is a static source observation, not a production prompt-injection or provider test.

### Regression evidence and remaining gates

- Existing relevant automated checks: `src/lib/phase9.test.ts`, `src/lib/los015-hardening.test.ts`, `src/lib/coach-chat-gate.test.ts`, and `supabase/tests/phase9_isolation.sql`.
- No new regression test was added because this review found no confirmed P0 application defect to patch. The live SQL isolation test remains unrun in this session.
- Final verification under Node 24.22.1: `npm run typecheck` passed; `npm test` passed (18 files / 70 tests); `npm run build` passed (25 generated routes/pages).
- Before production release, run `supabase test db` against these migrations and verify the deployed Vercel function runtime reports patched Node 24.x or newer.

## Follow-up — 2026-10-24

- Confirmed system-installed Node remains `v24.15.0` at `C:\Program Files\nodejs\node.exe`.
- Downloaded the official Node.js `v24.22.1` x64 MSI and verified SHA-256 `3bda4baf1ee709b33cf920dd633106ddb23951e322bff9c03ec9f64ab8981b01` against the official `SHASUMS256.txt`.
- System installation did not complete: Windows Installer returned Error 1730, stating an Administrator is required to replace the current system installation. The temporary MSI/log files were removed; no claim is made that the machine runtime was updated.
- Checked the Git remote `https://github.com/dearmjx/Learning-distribution.git` against all connected Vercel projects and repository filters; no matching Vercel project was found. No unrelated Vercel project was changed. The repository's existing `engines.node: ^24.22.1` is the supported Vercel code-level selection and maps to the latest Node 24 release, but the live deployment still requires the correct project to be identified and redeployed.
