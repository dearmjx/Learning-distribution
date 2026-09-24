import type { ResearchParticipantRecord } from "@/lib/research/export";

/**
 * Descriptive pre/post summaries for the CAR report. Inferential statistics are
 * left to SPSS/R on the wide CSV; these numbers are for classroom monitoring.
 * Missing values are excluded from each mean and counted in `n`, never imputed.
 */
export interface MeanStat {
  mean: number | null;
  n: number;
}

export interface CycleGrowthSummary {
  cycle: 1 | 2;
  participants: number;
  reviewed: number;
  syntheticDims: {
    selectingInfo: MeanStat;
    connectingInfo: MeanStat;
    reconstructingLanguage: MeanStat;
    directAnswering: MeanStat;
  };
  syntheticTotal: MeanStat;
  /** Final minus Draft 1 length of Claim+Evidence+Reasoning, in non-space characters. */
  draftLengthChange: MeanStat;
  /** Share of AI feedback decisions that were reject or modify (critical evaluation). */
  criticalDecisionRate: MeanStat;
}

export interface PairedCycleGrowth {
  /** Students with a reviewed synthetic-thinking total in both cycles. */
  pairedN: number;
  meanCycle1: number | null;
  meanCycle2: number | null;
  meanDifference: number | null;
  improved: number;
  unchanged: number;
  declined: number;
}

export interface GrowthSummary {
  cycles: CycleGrowthSummary[];
  paired: PairedCycleGrowth;
  unassignedCycleRecords: number;
}

function mean(values: Array<number | null | undefined>): MeanStat {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (present.length === 0) return { mean: null, n: 0 };
  return { mean: Number((present.reduce((sum, value) => sum + value, 0) / present.length).toFixed(2)), n: present.length };
}

function textLength(...parts: string[]): number {
  return parts.join("").replace(/\s/g, "").length;
}

function draftLengthChange(record: ResearchParticipantRecord): number | null {
  if (!record.draft1FrozenAt && !record.draft1Claim) return null;
  if (!record.finalSubmittedAt) return null;
  return (
    textLength(record.finalClaim, record.finalEvidence, record.finalReasoning) -
    textLength(record.draft1Claim, record.draft1Evidence, record.draft1Reasoning)
  );
}

function criticalRate(record: ResearchParticipantRecord): number | null {
  if (record.feedbackDecisionsCount === 0) return null;
  return (record.feedbackRejectedCount + record.feedbackModifiedCount) / record.feedbackDecisionsCount;
}

function summarizeCycle(cycle: 1 | 2, records: ResearchParticipantRecord[]): CycleGrowthSummary {
  return {
    cycle,
    participants: new Set(records.map((record) => record.participantKey)).size,
    reviewed: records.filter((record) => record.teacherReviewed).length,
    syntheticDims: {
      selectingInfo: mean(records.map((record) => record.rubricDim1SelectInfo)),
      connectingInfo: mean(records.map((record) => record.rubricDim2ConnectInfo)),
      reconstructingLanguage: mean(records.map((record) => record.rubricDim3OwnLanguage)),
      directAnswering: mean(records.map((record) => record.rubricDim4DirectAnswer)),
    },
    syntheticTotal: mean(records.map((record) => record.totalRubricScore)),
    draftLengthChange: mean(records.map(draftLengthChange)),
    criticalDecisionRate: mean(records.map(criticalRate)),
  };
}

/** Per-participant mean synthetic total within one cycle (a cycle may hold several activities). */
function totalsByParticipant(records: ResearchParticipantRecord[]): Map<string, number> {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    if (record.totalRubricScore === null) continue;
    grouped.set(record.participantKey, [...(grouped.get(record.participantKey) ?? []), record.totalRubricScore]);
  }
  return new Map([...grouped].map(([key, values]) => [key, values.reduce((sum, value) => sum + value, 0) / values.length]));
}

export function buildGrowthSummary(records: ResearchParticipantRecord[]): GrowthSummary {
  const cycle1 = records.filter((record) => record.cycle === 1);
  const cycle2 = records.filter((record) => record.cycle === 2);

  const totals1 = totalsByParticipant(cycle1);
  const totals2 = totalsByParticipant(cycle2);
  const pairs = [...totals1].filter(([key]) => totals2.has(key)).map(([key, before]) => [before, totals2.get(key)!] as const);
  const differences = pairs.map(([before, after]) => after - before);

  return {
    cycles: [summarizeCycle(1, cycle1), summarizeCycle(2, cycle2)],
    paired: {
      pairedN: pairs.length,
      meanCycle1: mean(pairs.map(([before]) => before)).mean,
      meanCycle2: mean(pairs.map(([, after]) => after)).mean,
      meanDifference: mean(differences).mean,
      improved: differences.filter((difference) => difference > 0).length,
      unchanged: differences.filter((difference) => difference === 0).length,
      declined: differences.filter((difference) => difference < 0).length,
    },
    unassignedCycleRecords: records.filter((record) => record.cycle === null).length,
  };
}
