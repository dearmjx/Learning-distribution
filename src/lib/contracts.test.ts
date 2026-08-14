import { describe, expect, it, beforeEach } from "vitest";
import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { createDemoStudentContext, assertStudentScope } from "@/lib/context/learning-context";
import { generateCoachFeedback } from "@/lib/ai/coach";
import type { ChatMessage, LlmProvider } from "@/lib/ai/provider";
import { learningEventStore } from "@/lib/events/event-store";
import { fallbackCoachResponse, enforceCoachResponse } from "@/lib/safety/education-policy";
import type { CoachRequest } from "@/lib/domain/types";

const activity = ecosystemActivities[0];

class FailingProvider implements LlmProvider {
  name = "local" as const;

  async complete(_messages: ChatMessage[]): Promise<string> {
    throw new Error("provider unavailable");
  }
}

function request(): CoachRequest {
  const context = createDemoStudentContext(activity.id, "corr-test");
  return {
    requestId: "request-test",
    context,
    activity,
    approvedContext: activity.context,
    cer: { claim: "งูลดลง", evidence: "", reasoning: "" },
    hintDepth: "shallow",
    currentAdiPhase: activity.adiPhase,
  };
}

describe("Learning OS Phase 1 contracts", () => {
  beforeEach(() => learningEventStore.clearForTests());

  it("creates an education context and rejects cross-student scope", () => {
    const context = createDemoStudentContext(activity.id);
    expect(context.schoolId).toBe("demo-school-01");
    expect(context.classId).toBe("biology-m4-class-a");
    expect(() => assertStudentScope(context, "another-student")).toThrow(/scope denied/i);
  });

  it("appends and queries a versioned learning event", () => {
    const context = createDemoStudentContext(activity.id, "corr-event");
    const event = learningEventStore.append({
      schemaVersion: 1,
      context,
      actor: { type: "student", id: context.studentId! },
      studentId: context.studentId!,
      activityId: activity.id,
      eventType: "student_submitted",
      payload: { version: 1 },
      correlationId: context.correlationId,
    });

    expect(event.schemaVersion).toBe(1);
    expect(learningEventStore.list({ studentId: context.studentId })).toHaveLength(1);
    expect(learningEventStore.byCorrelation(context.correlationId)).toHaveLength(1);
  });

  it("converts non-Socratic provider output to a safe fallback", () => {
    const current = request();
    const unsafe = {
      ...fallbackCoachResponse(current, "test"),
      message: "คำตอบคือ งูจะเพิ่มขึ้น",
    };
    const safe = enforceCoachResponse(current, unsafe);
    expect(safe.directAnswerBlocked).toBe(true);
    expect(safe.provider).toBe("fallback");
    expect(safe.message).toMatch(/[?]|อย่างไร|เพราะอะไร/);
  });

  it("uses the mock fallback when the configured provider fails", async () => {
    const input = {
      studentId: "demo-student-01",
      activityId: activity.id,
      content: { claim: "งูลดลง", evidence: "ห่วงโซ่อาหาร", reasoning: "ยังต้องอธิบาย" },
      hintDepth: "concept" as const,
      responseTimeSeconds: 90,
      context: createDemoStudentContext(activity.id),
    };
    const feedback = await generateCoachFeedback(activity, input, {
      context: input.context,
      provider: new FailingProvider(),
    });
    expect(feedback.directAnswerBlocked).toBe(true);
    expect(feedback.fallbackUsed).toBe(true);
    expect(feedback.provider).toBe("fallback");
    expect(feedback.hintCost).toBe(2);
  });
});
