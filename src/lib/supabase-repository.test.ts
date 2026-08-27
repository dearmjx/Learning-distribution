import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalDevelopmentContext } from "@/lib/context/learning-context";
import { getLearningRepository, getPersistenceMode, getPersistenceStatus } from "@/lib/repository/index";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";

describe("Learning persistence factory", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", "test-student-supa-01");
    clearMemoryRepositoriesForTests();
  });

  it("keeps memory mode explicit and reports its actual status", () => {
    expect(getPersistenceMode()).toBe("memory");
    expect(getPersistenceStatus()).toEqual({ mode: "memory", configured: true });
  });

  it("uses the scoped memory rollback without accepting a second student identity", async () => {
    const identity = { context: createLocalDevelopmentContext("student", "ecosystem-food-web-01") };
    const repository = await getLearningRepository(identity);
    const submission = await repository.addSubmission({
      studentId: "test-student-supa-01",
      activityId: "ecosystem-food-web-01",
      version: 1,
      content: { claim: "ผู้ผลิตมีความสำคัญสูงสุด", evidence: "สร้างพลังงานเริ่มต้น", reasoning: "พืชสังเคราะห์ด้วยแสง" },
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 120,
      workflowState: "submitted",
    });

    expect(submission.id).toBeDefined();
    await expect(repository.listSubmissions("student-b", "ecosystem-food-web-01")).rejects.toThrow(/scope denied/i);
    expect((await repository.getSubmission(submission.id))?.studentId).toBe("test-student-supa-01");
  });

  it("does not silently switch to memory when Supabase mode is unconfigured", async () => {
    vi.stubEnv("LEARNING_PERSISTENCE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getPersistenceStatus()).toEqual({ mode: "supabase", configured: false });
    await expect(getLearningRepository({ context: createLocalDevelopmentContext("student") })).rejects.toThrow(/Supabase persistence is configured/i);
  });
});
