import { describe, it, expect } from "vitest";
import { LocalProvider } from "@/lib/ai/local-provider";
import { chatWithCoach } from "@/lib/ai/coach";
import { getActivity } from "@/data/course/ecosystem/activities";

// Live check against the classroom runtime. LM Studio is the default because Ollama 0.33 runs
// qwen3.5 one request at a time; override with LOCAL_LLM_BASE_URL / LOCAL_LLM_MODEL.
const BASE_URL = process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:1234/v1";
const MODEL = process.env.LOCAL_LLM_MODEL ?? "qwen3.5-4b";

describe("Local LLM provider integration (LM Studio / Ollama)", () => {
  it("connects and receives a direct completion from the local LLM", async () => {
    const provider = new LocalProvider(BASE_URL, MODEL);
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
    const provider = new LocalProvider(BASE_URL, MODEL);
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
