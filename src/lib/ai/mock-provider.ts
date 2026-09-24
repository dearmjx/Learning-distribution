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
    const isOpponent = messages[0]?.content.includes("AI Opponent") ?? false;

    const content = JSON.stringify({
      message: isOpponent
        ? "มีอีกคำอธิบายหนึ่งว่าการเปลี่ยนแปลงนี้อาจเกิดจากปัจจัยอื่นในระบบนิเวศ คุณจะใช้หลักฐานใดจากกิจกรรมมาแย้งคำอธิบายนี้ เพราะอะไร?"
        : target === "evidence"
          ? "ลองเลือกหลักฐานหนึ่งส่วนจากข้อมูลในกิจกรรม แล้วอธิบายว่าหลักฐานนั้นสนับสนุน claim ของคุณอย่างไร?"
          : "ลองเชื่อมโยง claim กับหลักฐานให้เห็นกลไกของการเปลี่ยนแปลง คุณคาดว่าสิ่งใดจะเปลี่ยนก่อน เพราะอะไร?",
      targetDimension: target,
      citations: ["บริบทกิจกรรมที่ครูอนุมัติ"],
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
