import { describe, it, expect } from "vitest";
import { chatWithCoach } from "@/lib/ai/coach";
import { getActivity } from "@/data/course/ecosystem/activities";
import { MockProvider } from "@/lib/ai/mock-provider";

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
});
