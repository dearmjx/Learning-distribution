import { beforeEach, describe, expect, it } from "vitest";
import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { createDemoStudentContext } from "@/lib/context/learning-context";
import { learningEventStore } from "@/lib/events/event-store";
import { buildSeparatedResearchExport } from "@/lib/research/export";
import { generateCoachFeedback } from "@/lib/ai/coach";

describe("Learning OS Phase 3 delivery boundaries", () => {
  beforeEach(() => learningEventStore.clearForTests());

  it("keeps research identity mapping separate from evidence rows", () => {
    const activity = ecosystemActivities[0];
    const context = createDemoStudentContext(activity.id, "corr-export");
    const event = learningEventStore.append({
      schemaVersion: 1,
      context,
      actor: { type: "student", id: "demo-student-01" },
      studentId: "demo-student-01",
      activityId: activity.id,
      eventType: "student_submitted",
      payload: { version: 1 },
      correlationId: context.correlationId,
    });
    const exported = buildSeparatedResearchExport("participant-demo-01", "demo-student-01", [event]);
    expect(exported.identity.studentId).toBe("demo-student-01");
    expect(exported.evidence[0]).not.toHaveProperty("studentId");
    expect(JSON.stringify(exported.evidence)).not.toContain("demo-student-01");
  });

  it("runs the mock provider without an external credential", async () => {
    const activity = ecosystemActivities[0];
    const feedback = await generateCoachFeedback(activity, {
      studentId: "demo-student-01",
      activityId: activity.id,
      content: { claim: "", evidence: "", reasoning: "" },
      hintDepth: "none",
      responseTimeSeconds: 60,
      context: createDemoStudentContext(activity.id),
    });
    expect(feedback.provider).toBe("mock");
    expect(feedback.directAnswerBlocked).toBe(true);
  });
});
