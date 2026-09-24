import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getTeacherReviews, POST as postTeacherReview } from "@/app/api/teacher/reviews/route";
import { POST as postObservation } from "@/app/api/teacher/observations/route";
import { POST as postSession } from "@/app/api/sessions/route";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { buildWideResearchDataset, deidentifyStudentKey, formatResearchWideDatasetCsv } from "@/lib/research/export";
import type { Submission, TeacherReview } from "@/lib/domain/types";

const activityId = "ecosystem-food-web-01";

function asTeacher(): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
  vi.stubEnv("LEARNING_LOCAL_TEACHER_ID", "demo-teacher-01");
}

function asStudent(studentId: string): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
  vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
}

const submission: Submission = {
  id: "sub-a",
  studentId: "student-no-review",
  activityId,
  content: { claim: "c", evidence: "e", reasoning: "r" },
  version: 1,
  submittedAt: "2026-09-01T08:00:00.000Z",
  hintDepth: "none",
  hintCost: 0,
  responseTimeSeconds: 30,
  workflowState: "submitted",
};

describe("Research data integrity (LOS-005/006/007)", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("exports blanks instead of imputed values for unreviewed, unreflected students", () => {
    const [record] = buildWideResearchDataset({ submissions: [submission], events: [] });
    expect(record.teacherReviewed).toBe(false);
    expect(record.rubricDim1SelectInfo).toBeNull();
    expect(record.totalRubricScore).toBeNull();
    expect(record.teacherCerClaim).toBeNull();
    expect(record.reflectionSelfScoreAnalytical).toBeNull();
    expect(record.reflectionConfidence).toBe("");
    expect(record.authorshipCopySimilarity).toBeNull();
    expect(record.aiChatTotalTokens).toBeNull();
    expect(record.cycle).toBeNull();

    const row = formatResearchWideDatasetCsv([record]).split("\n")[1];
    expect(row).not.toMatch(/,3,3,3,3,/);
  });

  it("takes cycle from data, never from the activity id text", () => {
    const energy = { ...submission, activityId: "ecosystem-energy-flow-01" };
    const [unassigned] = buildWideResearchDataset({ submissions: [energy], events: [] });
    expect(unassigned.cycle).toBeNull();
    const [fromActivity] = buildWideResearchDataset({
      submissions: [energy],
      events: [],
      activityCycles: { "ecosystem-energy-flow-01": 2 },
    });
    expect(fromActivity.cycle).toBe(2);
  });

  it("keeps CER and synthetic-thinking scores as separate columns", () => {
    const review: TeacherReview = {
      id: "rev-1",
      submissionId: submission.id,
      teacherId: "demo-teacher-01",
      score: 50,
      comment: "",
      rubricScores: { claim: 4, evidence: 1, reasoning: 2 },
      syntheticScores: { selectingInfo: 1, connectingInfo: 2, reconstructingLanguage: 3, directAnswering: 2 },
      createdAt: "2026-09-01T09:00:00.000Z",
    };
    const [record] = buildWideResearchDataset({ submissions: [submission], events: [], teacherReviews: [review] });
    expect(record.teacherCerClaim).toBe(4);
    expect(record.rubricDim4DirectAnswer).toBe(2);
    expect(record.totalRubricScore).toBe(50);
  });

  it("gives distinct participant keys to non-numeric student ids", () => {
    const keys = new Set(Array.from({ length: 200 }, (_, i) => deidentifyStudentKey(`student-${String.fromCharCode(97 + (i % 26))}${i}`)));
    expect(keys.size).toBe(200);
  });

  it("persists synthetic scores and CER independently through the review API", async () => {
    asStudent("student-01");
    const sub = await postSession(new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId,
        content: { claim: "c", evidence: "e", reasoning: "r" },
        hintDepth: "none",
        responseTimeSeconds: 40,
      }),
    }));
    const { submission: created } = (await sub.json()) as { submission: { id: string } };

    asTeacher();
    const res = await postTeacherReview(new Request("http://localhost/api/teacher/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: created.id,
        score: 75,
        comment: "",
        rubricScores: { claim: 2, evidence: 3, reasoning: 4 },
        syntheticScores: { selectingInfo: 3, connectingInfo: 3, reconstructingLanguage: 3, directAnswering: 3 },
      }),
    }));
    expect(res.status).toBe(200);
    const { review } = (await res.json()) as { review: TeacherReview };
    expect(review.teacherId).toBe("demo-teacher-01");
    expect(review.rubricScores).toEqual({ claim: 2, evidence: 3, reasoning: 4 });
    expect(review.syntheticScores?.directAnswering).toBe(3);
    expect(review.cycle).toBe(1);

    const snapshot = (await (await getTeacherReviews(new Request("http://localhost/api/teacher/reviews"))).json()) as { activities: { id: string; cycle?: number }[] };
    expect(snapshot.activities.find((a) => a.id === "ecosystem-energy-flow-01")?.cycle).toBe(2);
  });

  it("records observation notes without trusting client teacher/class ids", async () => {
    asTeacher();
    const res = await postObservation(new Request("http://localhost/api/teacher/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: "someone-else", classId: "other-class", cycle: 1, activityId, phase: "observe", content: "note" }),
    }));
    expect(res.status).toBe(200);
    const { note } = (await res.json()) as { note: { teacherId: string; classId: string } };
    expect(note.teacherId).toBe("demo-teacher-01");
    expect(note.classId).toBe("biology-m4-class-a");
  });
});
