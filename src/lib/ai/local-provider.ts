import type { ChatMessage, LlmProvider, ProviderOptions } from "@/lib/ai/provider";

interface LocalResponse {
  choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  message?: { content?: string; reasoning_content?: string };
  response?: string;
}

/** OpenAI-compatible local endpoint adapter (Ollama / vLLM / LocalAI). */
export class LocalProvider implements LlmProvider {
  name = "local" as const;

  constructor(
    private readonly baseUrl = "http://localhost:11434/v1",
    private readonly model = "ornith:9b",
  ) {}

  async complete(messages: ChatMessage[], options: ProviderOptions = {}): Promise<string> {
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

    if (!response.ok) throw new Error(`Local LLM request failed with status ${response.status}`);
    const data = (await response.json()) as LocalResponse;
    const rawContent = data.choices?.[0]?.message?.content || data.message?.content || data.response || data.choices?.[0]?.message?.reasoning_content || "";
    // Clean potential <think> tags if model generated reasoning
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || rawContent.trim();
    if (!cleaned) throw new Error("Local LLM returned an empty response");
    return cleaned;
  }
}
