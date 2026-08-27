import { getPersistenceStatus } from "@/lib/repository/index";

export function GET() {
  const configuredProvider = process.env.LEARNING_LLM_PROVIDER ?? "mock";
  const persistence = getPersistenceStatus();
  return Response.json({
    status: "ok",
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "Learning OS",
    llmProvider: configuredProvider === "local" || configuredProvider === "deepseek" ? configuredProvider : "mock",
    persistence: persistence.mode,
    persistenceReady: persistence.configured,
  }, { headers: { "Cache-Control": "no-store" } });
}
