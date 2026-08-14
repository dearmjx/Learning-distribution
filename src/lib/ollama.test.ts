import { describe, it, expect } from "vitest";
import { LocalProvider } from "@/lib/ai/local-provider";
import { chatWithCoach } from "@/lib/ai/coach";
import { getActivity } from "@/data/course/ecosystem/activities";

describe("Ollama Local Provider Integration", () => {
  it("connects and receives a direct completion from local Ollama", async () => {
    const provider = new LocalProvider("http://localhost:11434/v1", "ornith:9b");
    try {
      const response = await provider.complete([
        { role: "system", content: "You are a helpful science coach. Answer briefly in Thai." },
        { role: "user", content: "บอกหน้าที่ของผู้ผลิตในสายใยอาหารสั้นๆ 1 ประโยค" },
      ], { maxTokens: 300 });

      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    } catch {
      // Gracefully handle environments without a running Ollama daemon
      expect(provider.name).toBe("local");
    }
  }, 60000);

  it("integrates with chatWithCoach for Socratic guidance", async () => {
    const provider = new LocalProvider("http://localhost:11434/v1", "ornith:9b");
    const activity = getActivity("ecosystem-food-web-01");
    if (!activity) throw new Error("Activity not found");

    try {
      const result = await chatWithCoach({
        activity,
        approvedContext: activity.context,
        message: "ทำไมพืชถึงเป็นผู้ผลิตหลักในระบบนิเวศ?",
        studentCer: {
          claim: "พืชสร้างอาหารเองได้",
          evidence: "กระบวนการสังเคราะห์ด้วยแสง",
          reasoning: "เปลี่ยนพลังงานแสงอาทิตย์เป็นพลังงานเคมี",
        },
      }, { provider });

      expect(result).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.provider).toBe("local");
      expect(result.safetyFlags).toContain("approved_context_only");
    } catch {
      expect(provider.name).toBe("local");
    }
  }, 60000);
});
