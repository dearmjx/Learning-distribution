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
- [x] `/api/teacher/roster` builds roster from real `memberships` in Supabase mode (keeps synthetic 29/28 roster only for memory/demo mode)
- [x] `student-workbench.tsx` hides the class/student picker in Supabase mode; student identity comes from the session

## Resolution (2026-09-25)

Client no longer sends teacherId/classId; review and observation schemas make them optional and routes use the server identity only. The observation activity is picked from the course activity list, and the hardcoded "57 คน" was removed. Tests: `src/lib/research-integrity.test.ts`.

## Resolution (2026-09-26) — Remainder

Files changed:
- `supabase/migrations/010_teacher_class_roster_rls.sql` (new) — adds `SECURITY DEFINER` function `teacher_can_view_class_profile` and RLS policy `profiles_teacher_class_select` on `learning_profiles` so teachers can read student profile names/IDs for active members in their assigned class.
- `src/app/api/teacher/roster/route.ts` — in Supabase mode, builds the class roster from real active `memberships` and `learning_profiles` (plus `classes`/`courses` metadata) using the server-derived `classId`, keeping the synthetic 29/28 (`401xx`/`402xx`) roster only for memory/demo mode; derives PAOR `cycle` from `submission.cycle` then `activity.cycle` instead of `activityId` text.
- `src/app/api/activities/route.ts` — includes `persistence` mode and server-resolved `session` (`studentId`, `classId`, `courseId`) in the response.
- `src/components/student-workbench.tsx` — hides the classroom and student ID pickers when `persistence === "supabase"` and sets `studentId`/`classId` from the server session rather than `localStorage`.
- `src/components/student-timeline.tsx` — fetches `/api/sessions` without hardcoded `studentId=demo-student-01`.
- `src/lib/domain/schemas.ts` — makes `studentId` optional in `reflectionInputSchema` so the server session controls student identity.
- `src/lib/teacher-pilot.test.ts` — added unit tests verifying real-membership roster construction in Supabase mode and session metadata on `GET /api/activities`.

Verification commands and actual results:
- `npm.cmd run typecheck` → passed (0 errors, exit code 0)
- `npm.cmd test` → passed (16 test files / 63 tests passed, exit code 0)
- `npm.cmd run build` → passed (24 routes compiled cleanly, exit code 0)

