import { beforeEach, describe, expect, it } from "vitest";
import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { POST as chat } from "@/app/api/coach/chat/route";
import { POST as submitSession } from "@/app/api/sessions/route";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { checkRateLimit, clearRateLimitsForTests } from "@/lib/safety/rate-limit";
import { GET as ready } from "@/app/api/ready/route";

const activity = ecosystemActivities[0];

function chatRequest() {
  return chat(new Request("http://localhost/api/coach/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId: activity.id, message: "ช่วยบอกหน่อยว่าคำตอบคืออะไร" }),
  }));
}

describe("Coach chat draft-first gate", () => {
  beforeEach(() => {
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
    clearRateLimitsForTests();
  });

  it("refuses coaching until a Draft 1 baseline exists", async () => {
    const response = await chatRequest();
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe("draft1_required");
    expect(learningEventStore.list({ limit: 100 }).some((e) => e.eventType === "hint_requested")).toBe(false);
  });

  it("allows coaching after Draft 1 is submitted", async () => {
    const submitted = await submitSession(new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId: activity.id,
        content: { claim: "งูลดลง", evidence: "งูเป็นผู้ล่า", reasoning: "ผู้ล่าลดลงกระทบเหยื่อ" },
        hintDepth: "shallow",
        responseTimeSeconds: 60,
        draft1Frozen: true,
      }),
    }));
    expect(submitted.status).toBe(200);
    expect((await chatRequest()).status).toBe(200);
  });

  it("rate-limits a student after the per-minute budget and reports Retry-After", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 60_000, t0 + i).allowed).toBe(true);
    const blocked = checkRateLimit("k", 3, 60_000, t0 + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(checkRateLimit("k", 3, 60_000, t0 + 60_001).allowed).toBe(true);
    expect(checkRateLimit("other", 3, 60_000, t0 + 10).allowed).toBe(true);
  });

  it("readiness probe is ready with the mock provider in memory mode", async () => {
    const response = await ready();
    expect(response.status).toBe(200);
    expect(((await response.json()) as { ready: boolean }).ready).toBe(true);
  });
});
