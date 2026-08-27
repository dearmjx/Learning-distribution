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

export interface LlmTelemetry {
  provider: LlmProviderName;
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  timestamp: string;
}

export interface CompletionResult {
  content: string;
  telemetry: LlmTelemetry;
}

export interface LlmProvider {
  name: LlmProviderName;
  complete(messages: ChatMessage[], options?: ProviderOptions): Promise<string>;
  completeWithTelemetry?(messages: ChatMessage[], options?: ProviderOptions): Promise<CompletionResult>;
}
