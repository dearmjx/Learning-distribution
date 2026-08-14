export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type LlmProviderName = "mock" | "local" | "deepseek" | "fallback";

export interface ProviderOptions {
  signal?: AbortSignal;
  maxTokens?: number;
  responseFormat?: "json" | "text";
}

export interface LlmProvider {
  name: LlmProviderName;
  complete(messages: ChatMessage[], options?: ProviderOptions): Promise<string>;
}
