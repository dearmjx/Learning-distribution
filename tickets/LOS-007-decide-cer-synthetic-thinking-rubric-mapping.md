# LOS-007: Score CER and synthetic-thinking rubrics separately

- **Status:** done
- **Priority:** P1
- **Area:** research-design
- **Source:** audit 2026-09-25 (`audit/RESEARCH_ALIGNMENT_AUDIT.md` + code review)

## Problem

Teacher review saves `claim=directAnswering`, `evidence=selectingInfo`, `reasoning=connectingInfo`. This fabricates CER scores from a different instrument; an examiner will question it (audit §18.2).

## Acceptance criteria

- [x] Researcher decision recorded in `docs/DECISIONS.md` (D-012: score separately)
- [x] Teacher review UI has independent CER (1–4 ×3) and synthetic (1–4 ×4) inputs
- [x] `saveReview` no longer copies synthetic scores into claim/evidence/reasoning
- [x] Wide export has separate CER and synthetic columns; test covers both

## Notes

Decision 2026-09-25: score both separately (D-012).

## Resolution (2026-09-25)

The dashboard has independent CER (1–4 ×3) and 4-dimension inputs. `rubricScores` carries CER only and `syntheticScores` the 4 dimensions (now actually persisted, along with `cycle`). The export adds `Teacher_Reviewed` and `Teacher_CER_*` columns and **no longer imputes missing values**: it previously filled rubric 3s, reflection 4/"high", response time 60, copy-similarity 0.15, and fake token counts, and let participant keys collide (50-bucket hash). Missing values are now blank, and keys use FNV-1a.
