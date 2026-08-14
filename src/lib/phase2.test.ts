import { beforeEach, describe, expect, it } from "vitest";
import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { POST } from "@/app/api/sessions/route";
import { createDemoTeacherContext } from "@/lib/context/learning-context";
import { recordTeacherReview } from "@/lib/education/teacher-review";
import { learningEventStore } from "@/lib/events/event-store";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";

const activity = ecosystemActivities[0];

async function submit(version: number, studentId = "demo-student-01") {
  return POST(new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      activityId: activity.id,
      content: {
        claim: version === 1 ? "งูลดลง" : "งูลดลงทำให้หนูอาจเพิ่มขึ้น",
        evidence: "งูเป็นผู้บริโภคระดับสูงในบริบทกิจกรรม",
        reasoning: "การเปลี่ยนแปลงผู้ล่ากระทบประชากรระดับถัดไป",
      },
      hintDepth: version === 1 ? "shallow" : "none",
      responseTimeSeconds: 90,
    }),
  }));
}

describe("Learning OS Phase 2 domain flow", () => {
  beforeEach(() => {
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  it("supports the ADI path and rejects peer review when the activity disables it", () => {
    expect(adiWorkflow.transition("draft", "submit", { peerReviewAllowed: false }).newState).toBe("submitted");
    expect(adiWorkflow.transition("submitted", "feedback_received", { peerReviewAllowed: false }).newState).toBe("ai_feedback_received");
    expect(adiWorkflow.transition("revising", "request_peer_review", { peerReviewAllowed: false }).allowed).toBe(false);
    expect(adiWorkflow.transition("revising", "request_peer_review", { peerReviewAllowed: true }).newState).toBe("peer_review");
  });

  it("records submission, hint, feedback, revision, workflow, and AI interaction evidence", async () => {
    const first = await submit(1);
    expect(first.status).toBe(200);
    const firstData = await first.json() as { submission: { id: string; workflowState: string }; feedback: { directAnswerBlocked: boolean; fallbackUsed: boolean } };
    expect(firstData.submission.workflowState).toBe("ai_feedback_received");
    expect(firstData.feedback.directAnswerBlocked).toBe(true);

    const second = await submit(2);
    expect(second.status).toBe(200);
    const types = learningEventStore.list({ studentId: "demo-student-01", limit: 100 }).map((event) => event.eventType);
    expect(types).toEqual(expect.arrayContaining([
      "student_submitted",
      "student_revised",
      "hint_requested",
      "ai_feedback_received",
      "authorship_indicator_created",
      "learning_phase_changed",
    ]));
    expect(second.status).toBe(200);
  });

  it("denies cross-student submission access", async () => {
    const response = await submit(1, "other-student");
    expect(response.status).toBe(403);
  });

  it("allows only the scoped teacher to assign the final score", async () => {
    const response = await submit(1);
    const data = await response.json() as { submission: { id: string } };
    const teacherContext = createDemoTeacherContext(activity.id);
    const review = recordTeacherReview(teacherContext, {
      submissionId: data.submission.id,
      teacherId: "demo-teacher-01",
      score: 84,
      comment: "ตรวจสอบการเชื่อมโยง evidence กับ reasoning เพิ่มเติม",
    });
    expect(review.score).toBe(84);
    expect(learningEventStore.list({ eventType: "teacher_reviewed" })).toHaveLength(1);
    expect(() => recordTeacherReview(createDemoTeacherContext(activity.id), {
      submissionId: data.submission.id,
      teacherId: "another-teacher",
      score: 100,
      comment: "ไม่ควรผ่าน scope",
    })).toThrow(/scoped teacher/i);
  });
});
