import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getSessions, POST as postSession } from "@/app/api/sessions/route";
import { GET as getTeacherReviews, POST as postTeacherReview } from "@/app/api/teacher/reviews/route";
import { GET as getPeerReviews, POST as postPeerReview } from "@/app/api/peer-reviews/route";
import { createLocalDevelopmentContext } from "@/lib/context/learning-context";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { getLearningRepository } from "@/lib/repository/index";

const activityId = "ecosystem-food-web-01";
const peerActivityId = "ecosystem-energy-flow-01";

function setLocalStudent(studentId: string): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
  vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
  vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
}

function submissionRequest(studentId: string, requestId: string, activity = activityId): Request {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
    body: JSON.stringify({
      studentId,
      activityId: activity,
      content: {
        claim: `${studentId} claim`,
        evidence: `${studentId} evidence`,
        reasoning: `${studentId} reasoning`,
      },
      hintDepth: "shallow",
      responseTimeSeconds: 90,
    }),
  });
}

describe("Phase 9 authenticated scope boundary", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("isolates two students' submissions, revisions, AI interactions, and events", async () => {
    setLocalStudent("student-a");
    expect((await (await postSession(submissionRequest("student-a", "student-a-submit-1"))).json() as { submission: { studentId: string } }).submission.studentId).toBe("student-a");

    setLocalStudent("student-b");
    expect((await (await postSession(submissionRequest("student-b", "student-b-submit-1"))).json() as { submission: { studentId: string } }).submission.studentId).toBe("student-b");

    const studentBView = await getSessions(new Request("http://localhost/api/sessions?studentId=student-b&activityId=ecosystem-food-web-01"));
    const bData = await studentBView.json() as { submissions: Array<{ studentId: string }>; events: Array<{ studentId: string }> };
    expect(bData.submissions).toHaveLength(1);
    expect(bData.submissions[0].studentId).toBe("student-b");
    expect(bData.events.every((event) => event.studentId === "student-b")).toBe(true);

    setLocalStudent("student-a");
    const studentAView = await getSessions(new Request("http://localhost/api/sessions?studentId=student-a&activityId=ecosystem-food-web-01"));
    const aData = await studentAView.json() as { submissions: Array<{ studentId: string }>; events: Array<{ studentId: string }> };
    expect(aData.submissions).toHaveLength(1);
    expect(aData.submissions[0].studentId).toBe("student-a");
    expect(aData.events.every((event) => event.studentId === "student-a")).toBe(true);

    const repoA = await getLearningRepository({ context: createLocalDevelopmentContext("student", activityId) });
    expect((await repoA.listInteractions("student-a", activityId))).toHaveLength(1);
    await expect(repoA.listInteractions("student-b", activityId)).rejects.toThrow(/scope denied/i);
  });

  it("rejects tampered student and reviewer IDs", async () => {
    setLocalStudent("student-a");
    const tamperedSubmission = await postSession(submissionRequest("student-b", "tampered-submit"));
    expect(tamperedSubmission.status).toBe(403);

    const tamperedTimeline = await getSessions(new Request("http://localhost/api/sessions?studentId=student-b"));
    expect(tamperedTimeline.status).toBe(403);

    const peerAssignment = await getPeerReviews(new Request(`http://localhost/api/peer-reviews?studentId=student-a&activityId=${peerActivityId}`));
    const assignment = await peerAssignment.json() as { peerDraft: { submissionId: string; id: string } };
    const tamperedPeer = await postPeerReview(new Request("http://localhost/api/peer-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "student-b",
        reviewerStudentId: "student-b",
        submissionId: assignment.peerDraft.submissionId,
        peerReviewSubmissionId: assignment.peerDraft.id,
        authorStudentId: "student-a",
        activityId: peerActivityId,
        scores: { claim: 3, evidence: 3, reasoning: 3 },
        strengths: "x",
        suggestions: "y",
      }),
    }));
    expect(tamperedPeer.status).toBe(403);
  });

  it("limits teacher access to the configured class and ignores a tampered teacher ID", async () => {
    setLocalStudent("student-a");
    const submission = await postSession(submissionRequest("student-a", "teacher-scope-submit"));
    const submissionId = (await submission.json() as { submission: { id: string } }).submission.id;

    vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
    vi.stubEnv("LEARNING_LOCAL_TEACHER_ID", "teacher-a");
    const teacherView = await getTeacherReviews(new Request("http://localhost/api/teacher/reviews"));
    expect(teacherView.status).toBe(200);
    const teacherData = await teacherView.json() as { submissions: Array<{ id: string }> };
    expect(teacherData.submissions.some((item) => item.id === submissionId)).toBe(true);

    const tamperedTeacher = await postTeacherReview(new Request("http://localhost/api/teacher/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, teacherId: "teacher-from-browser", score: 84, comment: "Scoped teacher review" }),
    }));
    expect(tamperedTeacher.status).toBe(200);

    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "unauthorized-class");
    const unauthorizedClass = await getTeacherReviews(new Request("http://localhost/api/teacher/reviews"));
    expect(unauthorizedClass.status).toBe(403);
  });

  it("does not duplicate accepted learning events when the same request is retried", async () => {
    setLocalStudent("student-a");
    const first = await postSession(submissionRequest("student-a", "retryable-submit"));
    expect(first.status).toBe(200);
    const firstEvents = learningEventStore.list({ studentId: "student-a", limit: 100 }).length;
    const second = await postSession(submissionRequest("student-a", "retryable-submit"));
    expect(second.status).toBe(200);
    const secondEvents = learningEventStore.list({ studentId: "student-a", limit: 100 }).length;
    expect(secondEvents).toBe(firstEvents);
    const submissions = (await (await getSessions(new Request("http://localhost/api/sessions?studentId=student-a"))).json() as { submissions: unknown[] }).submissions;
    expect(submissions).toHaveLength(1);
  });
});
