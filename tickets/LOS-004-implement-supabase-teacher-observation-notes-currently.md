# LOS-004: Implement Supabase teacher observation notes (currently a stub)

- **Status:** done
- **Priority:** P0
- **Area:** data-integrity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

`SupabaseRepository.addTeacherObservationNote` returns an object without writing; `listTeacherObservationNotes` returns `[]`. PAOR reflection evidence is lost in Supabase mode.

## Acceptance criteria

- [x] Table `teacher_observation_notes` with teacher/class-scoped RLS
- [x] Repo insert/list with cycle/activity filters
- [x] Isolation SQL test: teacher A cannot read teacher B's notes

## Resolution (2026-09-25)

Files changed:
- `supabase/migrations/009_teacher_observation_notes.sql` (new) — creates `teacher_observation_notes` table (`id`, `teacher_id`, `teacher_profile_id`, `class_id`, `cycle`, `activity_id`, `phase`, `content`, `created_at`, `updated_at`) with teacher- and class-scoped RLS (`teacher_profile_id = learning_profile_id() AND teacher_id = learning_external_id() AND active_class_member(class_id, 'teacher')`).
- `src/lib/supabase/types.ts` — added `teacher_observation_notes` table definition to `Database`.
- `src/lib/repository/supabase-repository.ts` — added `mapTeacherObservationNote` and implemented `addTeacherObservationNote` and `listTeacherObservationNotes` with server-derived teacher/class scope and `cycle`/`activityId` filters.
- `supabase/tests/phase9_isolation.sql` — added `teacher_b` and pgTAP checks verifying teacher A sees only teacher A's notes, cannot read teacher B's notes, and cannot insert notes spoofing teacher B.
- `src/lib/supabase-repository.test.ts` — added unit test for `addTeacherObservationNote` and `listTeacherObservationNotes` with `cycle`/`activityId` filtering and teacher scope enforcement.

Verification commands and actual results:
- `npm.cmd run typecheck` → passed (0 errors, exit code 0)
- `npm.cmd test` → passed (16 test files / 61 tests passed, exit code 0)
- `npm.cmd run build` → passed (24 routes built cleanly, exit code 0)

