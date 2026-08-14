import type { ChatMessage, LlmProvider, ProviderOptions } from "@/lib/ai/provider";

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class DeepSeekProvider implements LlmProvider {
  name = "deepseek" as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.deepseek.com",
    private readonly model = "deepseek-chat",
  ) {}

  async complete(messages: ChatMessage[], options: ProviderOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: options.signal,
      body: JSON.stringify({ model: this.model, messages, temperature: 0.2, max_tokens: options.maxTokens, response_format: options.responseFormat === "json" ? { type: "json_object" } : undefined }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned an empty response");
    return content;
  }
}
