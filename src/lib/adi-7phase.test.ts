import { describe, it, expect } from "vitest";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";
import {
  addPeerReview,
  getPeerReviewDraftForReviewer,
  listPeerReviewsForAuthor,
  addReflection,
  getReflection,
} from "@/lib/repository/memory-repository";

describe("7-Phase ADI Workflow & Peer Review Engine", () => {
  it("supports transitions through ADI workflow actions", () => {
    // 1. Submit initial CER draft
    expect(adiWorkflow.transition("draft", "submit").allowed).toBe(true);

    // 2. Feedback received from Socratic Coach
    expect(adiWorkflow.transition("submitted", "feedback_received", { peerReviewAllowed: true }).allowed).toBe(true);

    // 3. Move to Peer Review
    expect(adiWorkflow.transition("ai_feedback_received", "request_peer_review", { peerReviewAllowed: true }).allowed).toBe(true);

    // 4. Submit Peer Review to Revision
    expect(adiWorkflow.transition("peer_review", "submit_peer_review").allowed).toBe(true);

    // 5. Revision to Reflection
    expect(adiWorkflow.transition("revision", "start_reflection").allowed).toBe(true);

    // 6. Complete Reflection to Teacher Review
    expect(adiWorkflow.transition("reflection", "submit_reflection").allowed).toBe(true);
  });

  it("provides synthetic peer draft fallback when no real peers exist", () => {
    const draft = getPeerReviewDraftForReviewer("test-student-99", "ecosystem-food-web-01");
    expect(draft).toBeDefined();
    expect(draft?.content.claim).toBeDefined();
    expect(draft?.isSynthetic).toBe(true);
  });

  it("records peer reviews and queries them by author", () => {
    const review = addPeerReview({
      submissionId: "sub-123",
      reviewerStudentId: "reviewer-01",
      authorStudentId: "target-student-01",
      activityId: "ecosystem-food-web-01",
      feedback: "Great claim, but check 10% rule energy numbers.",
      scores: { claim: 5, evidence: 4, reasoning: 3 },
      strengths: "Clear claim",
      suggestions: "Add 10% rule",
    });

    expect(review.id).toBeDefined();
    const reviewsForAuthor = listPeerReviewsForAuthor("target-student-01", "ecosystem-food-web-01");
    expect(reviewsForAuthor.length).toBeGreaterThan(0);
    expect(reviewsForAuthor[0].reviewerStudentId).toBe("reviewer-01");
  });

  it("records Phase 7 reflections and queries by student", () => {
    const ref = addReflection({
      studentId: "student-ref-01",
      activityId: "ecosystem-food-web-01",
      conceptualLearning: "Understood trophic cascades and energy loss.",
      inquiryProcessReflection: "Learned how to evaluate evidence systematically.",
      peerReviewExperience: "Peer suggestions helped clarify 10% energy rule.",
      confidenceScore: 5,
      keyTakeaway: "10% Rule in trophic cascades",
    });

    expect(ref.id).toBeDefined();
    const saved = getReflection("student-ref-01", "ecosystem-food-web-01");
    expect(saved).toBeDefined();
    expect(saved?.conceptualLearning).toBe("Understood trophic cascades and energy loss.");
    expect(saved?.confidenceScore).toBe(5);
  });
});
