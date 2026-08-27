import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getTeacherReviews, POST as postTeacherReview } from "@/app/api/teacher/reviews/route";
import { GET as getTeacherRoster } from "@/app/api/teacher/roster/route";
import { GET as getResearchExport } from "@/app/api/research/export/route";
import { POST as postSession } from "@/app/api/sessions/route";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { formatResearchEvidenceCsv } from "@/lib/research/export";
import type { LearningEvent } from "@/lib/domain/types";

const activityId = "ecosystem-food-web-01";

function setLocalTeacher(teacherId = "demo-teacher-01"): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
  vi.stubEnv("LEARNING_LOCAL_TEACHER_ID", teacherId);
  vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
}

function setLocalStudent(studentId = "demo-student-01"): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
  vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
  vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
}

function createSubmissionRequest(studentId: string, requestId: string): Request {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
    body: JSON.stringify({
      studentId,
      activityId,
      content: {
        claim: "เมื่องูลดลงอย่างมาก หนูจะเพิ่มขึ้นชั่วคราว",
        evidence: "หญ้า -> หนู -> งู ในสายใยอาหาร",
        reasoning: "การขาดผู้ล่าส่งผลกระทบต่อประชากรเหยื่อตามหลักนิเวศวิทยา",
      },
      hintDepth: "concept",
      responseTimeSeconds: 120,
    }),
  });
}

describe("Phase 10 Teacher Pilot Operations", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("submits CER rubric scores and records them in the event stream", async () => {
    // 1. Student submits a CER draft
    setLocalStudent("student-01");
    const subRes = await postSession(createSubmissionRequest("student-01", "sub-req-01"));
    const subData = (await subRes.json()) as { submission: { id: string } };
    expect(subData.submission.id).toBeDefined();

    // 2. Teacher evaluates with granular CER Rubrics
    setLocalTeacher("demo-teacher-01");
    const reviewReq = new Request("http://localhost/api/teacher/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: subData.submission.id,
        teacherId: "demo-teacher-01",
        score: 92,
        comment: "ข้ออ้างอิงชัดเจนมากและใช้หลักฐานจากสายใยอาหารได้สมบูรณ์",
        rubricScores: {
          claim: 4,
          evidence: 4,
          reasoning: 3,
        },
      }),
    });

    const reviewRes = await postTeacherReview(reviewReq);
    expect(reviewRes.status).toBe(200);
    const reviewPayload = (await reviewRes.json()) as {
      review: {
        score: number;
        rubricScores?: { claim: number; evidence: number; reasoning: number };
      };
    };
    expect(reviewPayload.review.score).toBe(92);
    expect(reviewPayload.review.rubricScores?.claim).toBe(4);
    expect(reviewPayload.review.rubricScores?.reasoning).toBe(3);

    // 3. Verify event contains rubric breakdown
    const events = learningEventStore.list({ studentId: "student-01", activityId });
    const reviewEvent = events.find((e) => e.eventType === "teacher_reviewed");
    expect(reviewEvent).toBeDefined();
    expect(reviewEvent?.payload.score).toBe(92);
    expect((reviewEvent?.payload.rubricScores as { claim: number })?.claim).toBe(4);
  });

  it("aggregates class roster and ADI phase progress", async () => {
    setLocalStudent("student-alpha");
    await postSession(createSubmissionRequest("student-alpha", "sub-alpha-1"));

    setLocalTeacher("demo-teacher-01");
    const rosterRes = await getTeacherRoster(new Request("http://localhost/api/teacher/roster"));
    expect(rosterRes.status).toBe(200);
    const rosterData = (await rosterRes.json()) as {
      totalStudents: number;
      students: Array<{ studentId: string; currentPhase: string; submissionCount: number }>;
    };

    expect(rosterData.totalStudents).toBeGreaterThanOrEqual(1);
    const alpha = rosterData.students.find((s) => s.studentId === "student-alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.submissionCount).toBe(1);
  });

  it("exports de-identified research evidence in JSON and CSV formats", async () => {
    setLocalStudent("student-beta");
    await postSession(createSubmissionRequest("student-beta", "sub-beta-1"));

    setLocalTeacher("demo-teacher-01");

    // JSON export
    const jsonRes = await getResearchExport(new Request("http://localhost/api/research/export?format=json"));
    expect(jsonRes.status).toBe(200);
    const jsonData = (await jsonRes.json()) as {
      identity: { participantKey: string };
      evidence: Array<{ eventType: string; activityId: string }>;
    };
    expect(jsonData.identity.participantKey).toBe("class-scoped-export");
    expect(jsonData.evidence.length).toBeGreaterThan(0);

    // CSV export
    const csvRes = await getResearchExport(new Request("http://localhost/api/research/export?format=csv"));
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("Content-Type")).toContain("text/csv");
    const csvText = await csvRes.text();
    expect(csvText).toContain("eventId,eventType,activityId,occurredAt,actorType,payloadJson");
    expect(csvText).toContain("ecosystem-food-web-01");
  });

  it("correctly formats CSV evidence rows with escaping", () => {
    const mockEvents: LearningEvent[] = [
      {
        id: "evt-123",
        schemaVersion: 1,
        context: {
          schoolId: "demo-school-01",
          courseId: "biology-m4",
          classId: "biology-m4-class-a",
          activityId: "ecosystem-food-web-01",
          studentId: "anon-student-99",
          adiPhase: "argument",
          role: "student",
          language: "th",
          permissions: [],
          traceId: "tr-1",
          correlationId: "corr-1",
        },
        actor: { type: "student", id: "anon-student-99" },
        studentId: "anon-student-99",
        activityId: "ecosystem-food-web-01",
        eventType: "student_submitted",
        payload: { claim: 'Quote "test" and details', score: 85 },
        correlationId: "corr-1",
        occurredAt: "2026-08-26T10:00:00.000Z",
        createdAt: "2026-08-26T10:00:00.000Z",
      },
    ];

    const csv = formatResearchEvidenceCsv(mockEvents);
    expect(csv).toContain('"evt-123"');
    expect(csv).toContain('"student_submitted"');
    expect(csv).toContain('""claim""');
    expect(csv).toContain('""score"":85');
  });
});
