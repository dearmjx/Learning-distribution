import { describe, expect, it } from "vitest";
import { buildWideResearchDataset } from "@/lib/research/export";
import { buildGrowthSummary } from "@/lib/research/growth";
import type { Submission, TeacherReview } from "@/lib/domain/types";

function sub(id: string, studentId: string, activityId: string, cycle: 1 | 2, version: number, claim: string): Submission {
  return {
    id,
    studentId,
    activityId,
    content: { claim, evidence: "e", reasoning: "r" },
    version,
    submittedAt: `2026-09-0${version}T08:00:00.000Z`,
    hintDepth: "none",
    hintCost: 0,
    responseTimeSeconds: 30,
    workflowState: "submitted",
    cycle,
  };
}

function review(submissionId: string, dims: [number, number, number, number]): TeacherReview {
  return {
    id: `rev-${submissionId}`,
    submissionId,
    teacherId: "t",
    score: 0,
    comment: "",
    syntheticScores: { selectingInfo: dims[0], connectingInfo: dims[1], reconstructingLanguage: dims[2], directAnswering: dims[3] },
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

describe("Pre/post growth summary (LOS-012)", () => {
  const submissions = [
    sub("a1", "40101", "food", 1, 1, "สั้น"),
    sub("a2", "40101", "food", 1, 2, "ยาวขึ้นมาก"),
    sub("a3", "40101", "energy", 2, 1, "x"),
    sub("b1", "40102", "food", 1, 1, "y"),
    sub("b3", "40102", "energy", 2, 1, "z"),
    sub("c1", "40103", "food", 1, 1, "only cycle 1"),
  ];
  const teacherReviews = [
    review("a2", [2, 2, 2, 2]), // 50%
    review("a3", [4, 4, 4, 4]), // 100%
    review("b1", [3, 3, 3, 3]), // 75%
    review("b3", [3, 3, 3, 3]), // 75%
    // c1 unreviewed: must not count as a score
  ];
  const records = buildWideResearchDataset({ submissions, events: [], teacherReviews });
  const summary = buildGrowthSummary(records);

  it("summarizes each cycle without imputing unreviewed students", () => {
    const [c1, c2] = summary.cycles;
    expect(c1.participants).toBe(3);
    expect(c1.reviewed).toBe(2);
    expect(c1.syntheticTotal).toEqual({ mean: 62.5, n: 2 });
    expect(c2.syntheticTotal).toEqual({ mean: 87.5, n: 2 });
    expect(c1.syntheticDims.selectingInfo).toEqual({ mean: 2.5, n: 2 });
  });

  it("pairs only students scored in both cycles", () => {
    expect(summary.paired).toMatchObject({
      pairedN: 2,
      meanCycle1: 62.5,
      meanCycle2: 87.5,
      meanDifference: 25,
      improved: 1,
      unchanged: 1,
      declined: 0,
    });
  });

  it("measures Draft 1 → Final length change in non-space characters", () => {
    const [c1] = summary.cycles;
    // 40101: "ยาวขึ้นมาก" (10) - "สั้น" (4) = +6; single-draft students contribute 0.
    expect(c1.draftLengthChange.n).toBe(3);
    expect(c1.draftLengthChange.mean).toBe(2);
  });
});
