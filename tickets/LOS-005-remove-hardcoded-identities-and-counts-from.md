# LOS-005: Remove hardcoded identities and counts from teacher/student UI

- **Status:** done
- **Priority:** P1
- **Area:** correctness
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

`teacher-review-dashboard.tsx` sends `teacherId: "demo-teacher-01"`, `classId: "biology-m4-class-a"`, maps cycle→activity by hardcoded IDs, and shows "Roster (57 คน)". `student-workbench.tsx` hardcodes class options. Server already derives identity, so these are misleading and wrong for any real class.

## Acceptance criteria

- [x] Client no longer sends teacherId/classId (make them optional in schema; server sets them)
- [x] Observation activity picked from activity list, not hardcoded
- [x] Roster count comes from `/api/teacher/roster`

## Resolution (2026-09-25)

Client no longer sends teacherId/classId; review and observation schemas make them optional and routes use the server identity only. The observation activity is picked from the course activity list, and the hardcoded "57 คน" was removed. Tests: `src/lib/research-integrity.test.ts`.

**Remaining, deferred to the Supabase test:** `/api/teacher/roster` still invents a 29/28-student roster (IDs 401xx/402xx), and `student-workbench.tsx` has a demo class/student picker. Both should read real `memberships` once Supabase auth is verified.
