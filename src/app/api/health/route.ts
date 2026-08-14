export function GET() {
  const configuredProvider = process.env.LEARNING_LLM_PROVIDER ?? "mock";
  return Response.json({
    status: "ok",
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "Learning OS",
    llmProvider: configuredProvider === "local" || configuredProvider === "deepseek" ? configuredProvider : "mock",
    persistence: "in-memory-mvp",
  });
}
