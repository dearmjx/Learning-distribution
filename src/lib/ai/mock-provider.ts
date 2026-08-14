import type { ChatMessage, LlmProvider, ProviderOptions } from "@/lib/ai/provider";

export class MockProvider implements LlmProvider {
  name = "mock" as const;

  async complete(messages: ChatMessage[], _options?: ProviderOptions): Promise<string> {
    const userMessage = messages.findLast((message) => message.role === "user")?.content ?? "";
    const target = userMessage.includes("evidence") ? "evidence" : "reasoning";

    return JSON.stringify({
      message:
        target === "evidence"
          ? "ลองเลือกหลักฐานจากข้อมูลสายใยอาหารในโจทย์ แล้วอธิบายว่าหลักฐานนั้นสนับสนุน claim ของคุณอย่างไร"
          : "ลองเชื่อมโยง claim กับหลักฐานให้เห็นกลไกของการเปลี่ยนแปลงในระบบนิเวศ คุณคาดว่าประชากรใดจะเปลี่ยนก่อน เพราะอะไร",
      targetDimension: target,
      citations: ["เนื้อหากิจกรรม: สายใยอาหารและการถ่ายทอดพลังงาน"],
    });
  }
}
