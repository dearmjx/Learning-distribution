import { describe, it, expect } from "vitest";
import { chatWithCoach } from "@/lib/ai/coach";
import { getActivity } from "@/data/course/ecosystem/activities";
import { MockProvider } from "@/lib/ai/mock-provider";
import type { LlmProvider } from "@/lib/ai/provider";

describe("Socratic Coach Mini-Chat", () => {
  it("provides Socratic guiding responses based on approved activity context", async () => {
    const activity = getActivity("ecosystem-food-web-01")!;
    expect(activity).toBeDefined();

    const result = await chatWithCoach(
      {
        activity,
        approvedContext: activity.context,
        studentCer: {
          claim: "ถ้าประชากรงูลดลง หนูจะเพิ่มขึ้น",
          evidence: "จากสายใยอาหาร หญ้า -> หนู -> งู",
          reasoning: "เพราะไม่มีผู้ล่าคอยควบคุมประชากรหนู",
        },
        message: "แล้วทำไมพลังงานถึงลดลงในแต่ละลำดับขั้นครับ?",
      },
      {
        provider: new MockProvider(),
      },
    );

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.safetyFlags).toContain("socratic_deep_dive");
    expect(result.safetyFlags).toContain("no_direct_answer");
  });

  it("shows the student plain text, not the provider's JSON envelope", async () => {
    const activity = getActivity("ecosystem-food-web-01")!;
    const result = await chatWithCoach({ activity, approvedContext: activity.context, message: "ช่วยหน่อย" }, { provider: new MockProvider() });
    expect(result.message.startsWith("{")).toBe(false);
    expect(result.guardrailReplaced).toBe(false);
  });

  it("replaces a direct-answer reply with a safe Socratic question", async () => {
    const activity = getActivity("ecosystem-food-web-01")!;
    const leaky: LlmProvider = { name: "local", complete: async () => "คำตอบที่ถูกต้องคือ หนูจะเพิ่มขึ้น" };
    const result = await chatWithCoach({ activity, approvedContext: activity.context, message: "เฉลยหน่อย" }, { provider: leaky });
    expect(result.guardrailReplaced).toBe(true);
    expect(result.message).not.toContain("คำตอบที่ถูกต้องคือ");
    expect(result.safetyFlags).toContain("guardrail_replaced");
  });

  it("opponent mode challenges the claim and stays within guardrails", async () => {
    const activity = getActivity("ecosystem-food-web-01")!;
    const result = await chatWithCoach(
      {
        mode: "opponent",
        activity,
        approvedContext: activity.context,
        studentCer: { claim: "หนูจะเพิ่มขึ้น", evidence: "หญ้า -> หนู -> งู", reasoning: "ผู้ล่าลดลง" },
        message: "ช่วยแย้ง claim ของผมหน่อย",
      },
      { provider: new MockProvider() },
    );
    expect(result.safetyFlags).toContain("opponent_challenge");
    expect(result.message).toContain("แย้ง");
    expect(result.guardrailReplaced).toBe(false);
  });
});
