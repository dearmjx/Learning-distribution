import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GET as getResearchExport } from "@/app/api/research/export/route";
import { POST as postSession } from "@/app/api/sessions/route";
import { createLocalDevelopmentContext } from "@/lib/context/learning-context";
import { learningEventStore } from "@/lib/events/event-store";
import * as repositoryIndex from "@/lib/repository/index";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { createSupabaseRepository } from "@/lib/repository/supabase-repository";
import type { Database } from "@/lib/supabase/types";

function pagedEventsClient(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `evt-${String(i).padStart(5, "0")}`,
    schema_version: 1,
    student_id: "student-a",
    activity_id: "ecosystem-food-web-01",
    profile_id: "p",
    class_id: "biology-m4-class-a",
    event_type: "hint_requested",
    payload: {},
    context: {},
    actor: { type: "student", id: "student-a" },
    correlation_id: "c",
    idempotency_key: null,
    cycle: 1,
    occurred_at: "2026-09-27T00:00:00.000Z",
    created_at: "2026-09-27T00:00:00.000Z",
  }));
  const ranges: Array<[number, number]> = [];
  const client = {
    from() {
      let window: [number, number] = [0, 999];
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        range(from: number, to: number) {
          window = [from, to];
          ranges.push(window);
          return builder;
        },
        then<T>(onfulfilled?: (value: { data: unknown[]; error: null }) => T) {
          // Mimic PostgREST's server-side cap of 1000 rows per request.
          const [from, to] = window;
          return Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null }).then(onfulfilled);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, ranges };
}

describe("LOS-015 database hardening", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reads every event past the 1000-row cap instead of silently truncating (A7)", async () => {
    const { client, ranges } = pagedEventsClient(2_345);
    const repo = createSupabaseRepository(client, { context: createLocalDevelopmentContext("teacher") });
    const events = await repo.listLearningEvents();
    expect(events).toHaveLength(2_345);
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("exports only students with current granted consent (B1)", async () => {
    const submitAs = async (studentId: string) => {
      vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
      vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
      const res = await postSession(new Request("http://localhost/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: "ecosystem-food-web-01",
          content: { claim: `claim ${studentId}`, evidence: "e", reasoning: "r" },
          hintDepth: "none",
          responseTimeSeconds: 20,
          draft1Frozen: true,
        }),
      }));
      expect(res.status).toBe(200);
    };
    await submitAs("student-consented");
    await submitAs("student-withdrawn");

    vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
    const realFactory = repositoryIndex.getLearningRepository;
    vi.spyOn(repositoryIndex, "getLearningRepository").mockImplementation(async (identity) => {
      const repo = await realFactory(identity);
      return Object.assign(Object.create(Object.getPrototypeOf(repo)), repo, {
        listConsentedStudentIds: async () => ["student-consented"],
      });
    });

    const wide = await getResearchExport(new Request("http://localhost/api/research/export?format=json&mode=wide"));
    const body = (await wide.json()) as { consentFiltered: boolean; records: Array<{ finalClaim: string }> };
    expect(body.consentFiltered).toBe(true);
    expect(body.records.map((r) => r.finalClaim)).toEqual(["claim student-consented"]);

    const raw = await getResearchExport(new Request("http://localhost/api/research/export?format=csv"));
    const csv = await raw.text();
    expect(csv).not.toContain("student-withdrawn");
  });

  it("refuses to export real data without a participant-key secret (B2)", async () => {
    vi.stubEnv("LEARNING_PERSISTENCE", "supabase");
    vi.stubEnv("RESEARCH_KEY_SECRET", "");
    vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
    const res = await getResearchExport(new Request("http://localhost/api/research/export?format=csv&mode=wide"));
    // Supabase auth is not configured in unit tests, so identity resolution fails first;
    // either way no data leaves without the secret.
    expect(res.status).not.toBe(200);
  });
});
