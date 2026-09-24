# LOS-004: Implement Supabase teacher observation notes (currently a stub)

- **Status:** open
- **Priority:** P0
- **Area:** data-integrity
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

`SupabaseRepository.addTeacherObservationNote` returns an object without writing; `listTeacherObservationNotes` returns `[]`. PAOR reflection evidence is lost in Supabase mode.

## Acceptance criteria

- [ ] Table `teacher_observation_notes` with teacher/class-scoped RLS
- [ ] Repo insert/list with cycle/activity filters
- [ ] Isolation SQL test: teacher A cannot read teacher B's notes
