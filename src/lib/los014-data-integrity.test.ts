import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPeerReviews, POST as postPeerReview } from "@/app/api/peer-reviews/route";
import { POST as postReflection } from "@/app/api/reflections/route";
import { POST as postSession } from "@/app/api/sessions/route";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests, listReflections } from "@/lib/repository/memory-repository";
import { buildWideResearchDataset } from "@/lib/research/export";
import type { PeerReview, PeerReviewSubmission } from "@/lib/domain/types";

const activityId = "ecosystem-energy-flow-01"; // peer review enabled
const json = { "Content-Type": "application/json" };

function asStudent(studentId: string): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
  vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
}

async function submitDraft(studentId: string) {
  asStudent(studentId);
  return postSession(new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: json,
    body: JSON.stringify({
      activityId,
      content: { claim: `claim ${studentId}`, evidence: "e", reasoning: "r" },
      hintDepth: "none",
      responseTimeSeconds: 30,
      draft1Frozen: true,
    }),
  }));
}

async function peerGet() {
  const res = await getPeerReviews(new Request(`http://localhost/api/peer-reviews?activityId=${activityId}`));
  return (await res.json()) as { assignedDraft: PeerReviewSubmission | null; receivedReviews: PeerReview[] };
}

describe("LOS-014 research-data integrity", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("delivers the real peer review to its author with the reviewer anonymized (A3)", async () => {
    expect((await submitDraft("student-a")).status).toBe(200);
    expect((await submitDraft("student-b")).status).toBe(200);

    asStudent("student-b");
    const { assignedDraft } = await peerGet();
    expect(assignedDraft?.authorStudentId).toBe("student-a");
    const posted = await postPeerReview(new Request("http://localhost/api/peer-reviews", {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        activityId,
        submissionId: assignedDraft!.submissionId,
        peerReviewSubmissionId: assignedDraft!.id,
        scores: { claim: 2, evidence: 3, reasoning: 4 },
        strengths: "B เขียนจุดเด่นเอง",
        suggestions: "B เขียนข้อเสนอแนะเอง",
      }),
    }));
    expect(posted.status).toBe(200);

    asStudent("student-a");
    const { receivedReviews } = await peerGet();
    expect(receivedReviews).toHaveLength(1);
    expect(receivedReviews[0].suggestions).toBe("B เขียนข้อเสนอแนะเอง");
    expect(JSON.stringify(receivedReviews)).not.toContain("student-b");
  });

  it("rejects peer reviews without the reviewer's own scores and text (A4)", async () => {
    await submitDraft("student-a");
    asStudent("student-b");
    const { assignedDraft } = await peerGet();
    const res = await postPeerReview(new Request("http://localhost/api/peer-reviews", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ activityId, submissionId: assignedDraft!.submissionId, peerReviewSubmissionId: assignedDraft!.id }),
    }));
    expect(res.status).toBe(400);
  });

  it("requires Draft 1 before a reflection, then stores the self-evaluation as given (A6)", async () => {
    asStudent("student-a");
    const body = {
      activityId,
      analyticalThinkingScore: 2,
      aiLiteracyScore: 5,
      confidenceRating: "low",
      reflectionText: "ข้อความของนักเรียนเอง",
      keyLearnings: [],
    };
    const early = await postReflection(new Request("http://localhost/api/reflections", { method: "POST", headers: json, body: JSON.stringify(body) }));
    expect(early.status).toBe(409);

    await submitDraft("student-a");
    const ok = await postReflection(new Request("http://localhost/api/reflections", { method: "POST", headers: json, body: JSON.stringify(body) }));
    expect(ok.status).toBe(200);
    const [stored] = listReflections("student-a", activityId);
    expect(stored).toMatchObject({ analyticalThinkingScore: 2, aiLiteracyScore: 5, confidenceRating: "low", reflectionText: "ข้อความของนักเรียนเอง" });
    expect(stored.confidenceScore).toBeUndefined();
    expect(stored.submissionId).toBeDefined();
  });

  it("exports blanks for missing freeze time, hint cost, authorship and timing (A9)", () => {
    const [record] = buildWideResearchDataset({
      submissions: [{
        id: "s1", studentId: "x", activityId, content: { claim: "c", evidence: "e", reasoning: "r" },
        version: 1, submittedAt: "", hintDepth: "none", hintCost: undefined as unknown as number,
        responseTimeSeconds: 10, workflowState: "submitted",
      }],
      events: [],
    });
    expect(record.draft1FrozenAt).toBe("");
    expect(record.aiChatHintCost).toBeNull();
    expect(record.authorshipStatus).toBe("");
    expect(record.startTimestamp).toBe("");
    expect(record.totalDurationMinutes).toBeNull();
  });
});
