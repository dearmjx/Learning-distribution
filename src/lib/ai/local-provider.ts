import type { ChatMessage, CompletionResult, LlmProvider, LlmTelemetry, ProviderOptions } from "@/lib/ai/provider";

interface LocalResponse {
  choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  message?: { content?: string; reasoning_content?: string };
  response?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/** OpenAI-compatible local endpoint adapter (Ollama / vLLM / LocalAI). */
export class LocalProvider implements LlmProvider {
  name = "local" as const;

  constructor(
    public readonly baseUrl = "http://localhost:11434/v1",
    public readonly model = "ornith:9b",
  ) {}

  async complete(messages: ChatMessage[], options: ProviderOptions = {}): Promise<string> {
    const result = await this.completeWithTelemetry(messages, options);
    return result.content;
  }

  async completeWithTelemetry(messages: ChatMessage[], options: ProviderOptions = {}): Promise<CompletionResult> {
    const startTime = performance.now();
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        max_tokens: options.maxTokens ?? 1024,
        response_format: options.responseFormat === "json" ? { type: "json_object" } : undefined,
      }),
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(`Local LLM request failed with status ${response.status} (${response.statusText})`);
    }

    const data = (await response.json()) as LocalResponse;
    const rawContent =
      data.choices?.[0]?.message?.content ||
      data.message?.content ||
      data.response ||
      data.choices?.[0]?.message?.reasoning_content ||
      "";

    // Clean potential <think> tags if model generated reasoning
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || rawContent.trim();
    if (!cleaned) throw new Error("Local LLM returned an empty response");

    // Estimate or extract token usage
    const promptTokens = data.usage?.prompt_tokens ?? Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const completionTokens = data.usage?.completion_tokens ?? Math.round(cleaned.length / 4);
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;

    const tokensPerSecond =
      completionTokens > 0 && elapsedMs > 0
        ? Number(((completionTokens / (elapsedMs / 1000))).toFixed(2))
        : undefined;

    const telemetry: LlmTelemetry = {
      provider: this.name,
      model: this.model,
      latencyMs: elapsedMs,
      promptTokens,
      completionTokens,
      totalTokens,
      tokensPerSecond,
      timestamp: new Date().toISOString(),
    };

    return {
      content: cleaned,
      telemetry,
    };
  }
}
