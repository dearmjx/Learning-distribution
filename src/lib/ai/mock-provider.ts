import type { ChatMessage, CompletionResult, LlmProvider, LlmTelemetry, ProviderOptions } from "@/lib/ai/provider";

export class MockProvider implements LlmProvider {
  name = "mock" as const;

  async complete(messages: ChatMessage[], options?: ProviderOptions): Promise<string> {
    const result = await this.completeWithTelemetry(messages, options);
    return result.content;
  }

  async completeWithTelemetry(messages: ChatMessage[], _options?: ProviderOptions): Promise<CompletionResult> {
    const startTime = performance.now();
    const userMessage = messages.findLast((message) => message.role === "user")?.content ?? "";
    const target = userMessage.includes("evidence") ? "evidence" : "reasoning";

    const content = JSON.stringify({
      message:
        target === "evidence"
          ? "ลองเลือกหลักฐานจากข้อมูลสายใยอาหารในโจทย์ แล้วอธิบายว่าหลักฐานนั้นสนับสนุน claim ของคุณอย่างไร"
          : "ลองเชื่อมโยง claim กับหลักฐานให้เห็นกลไกของการเปลี่ยนแปลงในระบบนิเวศ คุณคาดว่าประชากรใดจะเปลี่ยนก่อน เพราะอะไร",
      targetDimension: target,
      citations: ["เนื้อหากิจกรรม: สายใยอาหารและการถ่ายทอดพลังงาน"],
    });

    const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));
    const promptTokens = Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens = Math.round(content.length / 4);

    const telemetry: LlmTelemetry = {
      provider: this.name,
      model: "mock-fast-simulator",
      latencyMs: elapsedMs,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      tokensPerSecond: Number(((completionTokens / (elapsedMs / 1000))).toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    return { content, telemetry };
  }
}
