import { getPersistenceStatus } from "@/lib/repository/index";

interface Check {
  ok: boolean;
  detail: string;
}

async function checkLlm(): Promise<Check> {
  const provider = (process.env.LEARNING_LLM_PROVIDER ?? "mock").toLowerCase();
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_API_KEY
      ? { ok: true, detail: "deepseek configured" }
      : { ok: false, detail: "deepseek selected but DEEPSEEK_API_KEY is missing" };
  }
  if (provider !== "local") return { ok: true, detail: "mock provider" };

  const baseUrl = (process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1").replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(2_000), cache: "no-store" });
    return response.ok
      ? { ok: true, detail: `local LLM reachable (${process.env.LOCAL_LLM_MODEL ?? "local-model"})` }
      : { ok: false, detail: `local LLM returned HTTP ${response.status}` };
  } catch {
    return { ok: false, detail: "local LLM unreachable" };
  }
}

/** Readiness probe: 200 only when persistence and the selected LLM can serve students. */
export async function GET() {
  const persistence = getPersistenceStatus();
  const checks = {
    persistence: {
      ok: persistence.configured,
      detail: persistence.configured ? persistence.mode : `${persistence.mode} selected but not configured`,
    },
    llm: await checkLlm(),
  };
  const ready = Object.values(checks).every((check) => check.ok);
  return Response.json({ ready, checks }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
