import { z } from "zod";
import type { LearningContext, TeacherReview } from "@/lib/domain/types";
import { appendLearningEvent } from "@/lib/events/timeline";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { addTeacherReview, getSubmission } from "@/lib/repository/memory-repository";
import type { ScopedLearningRepository } from "@/lib/repository/interfaces";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";

export const teacherReviewInputSchema = z.object({
  submissionId: z.string().min(1),
  /** Ignored by API routes; the server derives the teacher from the session. */
  teacherId: z.string().min(1).optional(),
  score: z.number().min(0).max(100),
  comment: z.string().max(4_000),
  rubricScores: z
    .object({
      claim: z.number().min(0).max(4).optional(),
      evidence: z.number().min(0).max(4).optional(),
      reasoning: z.number().min(0).max(4).optional(),
      selectingInfo: z.number().min(0).max(4).optional(),
      connectingInfo: z.number().min(0).max(4).optional(),
      reconstructingLanguage: z.number().min(0).max(4).optional(),
      directAnswering: z.number().min(0).max(4).optional(),
    })
    .optional(),
  syntheticScores: z
    .object({
      selectingInfo: z.number().int().min(1).max(4),
      connectingInfo: z.number().int().min(1).max(4),
      reconstructingLanguage: z.number().int().min(1).max(4),
      directAnswering: z.number().int().min(1).max(4),
    })
    .optional(),
});

export function recordTeacherReview(
  context: LearningContext,
  input: z.infer<typeof teacherReviewInputSchema>,
): TeacherReview {
  if (context.role !== "teacher" || !context.teacherId || (input.teacherId && context.teacherId !== input.teacherId)) {
    throw new Error("Only the scoped teacher may record a final review");
  }
  const submission = getSubmission(input.submissionId);
  if (!submission) throw new Error("Submission not found");

  const toTeacherReview = adiWorkflow.transition(submission.workflowState, "send_to_teacher", {
    peerReviewAllowed: false,
  });
  if (!toTeacherReview.allowed) throw new Error(toTeacherReview.reason ?? "Submission is not ready for teacher review");
  const completed = adiWorkflow.transition(toTeacherReview.newState, "complete", { peerReviewAllowed: false });
  if (!completed.allowed) throw new Error(completed.reason ?? "Submission cannot be completed");

  submission.workflowState = completed.newState;
  const review = addTeacherReview({
    ...input,
    teacherId: context.teacherId,
    rubricScores: input.rubricScores,
    syntheticScores: input.syntheticScores,
    cycle: submission.cycle,
  });
  const eventContext: LearningContext = { ...context, activityId: submission.activityId, studentId: submission.studentId };
  appendLearningEvent({
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "teacher_reviewed",
    payload: {
      submissionId: submission.id,
      reviewId: review.id,
      score: review.score,
      comment: review.comment,
      rubricScores: review.rubricScores,
      syntheticScores: review.syntheticScores,
    },
    context: eventContext,
    actor: { type: "teacher", id: context.teacherId },
  });
  appendLearningEvent({
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "learning_phase_changed",
    payload: { submissionId: submission.id, from: toTeacherReview.previousState, to: completed.newState, action: "complete" },
    context: eventContext,
    actor: { type: "teacher", id: context.teacherId },
  });
  return review;
}

/** Request-scoped variant used by API routes and Supabase persistence. */
export async function recordTeacherReviewWithRepository(
  context: LearningContext,
  input: z.infer<typeof teacherReviewInputSchema>,
  repository: ScopedLearningRepository,
): Promise<TeacherReview> {
  if (context.role !== "teacher" || !context.teacherId) {
    throw new Error("Only the scoped teacher may record a final review");
  }
  const submission = await repository.getSubmission(input.submissionId);
  if (!submission) throw new Error("Submission not found");

  const activityPeerReviewAllowed = false;
  const toTeacherReview = adiWorkflow.transition(submission.workflowState, "send_to_teacher", {
    peerReviewAllowed: activityPeerReviewAllowed,
  });
  if (!toTeacherReview.allowed) throw new Error(toTeacherReview.reason ?? "Submission is not ready for teacher review");
  const completed = adiWorkflow.transition(toTeacherReview.newState, "complete", { peerReviewAllowed: activityPeerReviewAllowed });
  if (!completed.allowed) throw new Error(completed.reason ?? "Submission cannot be completed");

  await repository.updateSubmissionWorkflow(submission.id, completed.newState);
  const review = await repository.addTeacherReview({
    submissionId: submission.id,
    teacherId: context.teacherId,
    score: input.score,
    comment: input.comment,
    rubricScores: input.rubricScores,
    syntheticScores: input.syntheticScores,
    cycle: submission.cycle,
  });
  const eventContext: LearningContext = { ...context, activityId: submission.activityId, studentId: submission.studentId };
  const eventKey = `teacher-review:${review.id}`;
  await appendPersistedLearningEvent(repository, {
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "teacher_reviewed",
    payload: {
      submissionId: submission.id,
      reviewId: review.id,
      score: review.score,
      comment: review.comment,
      rubricScores: review.rubricScores,
      syntheticScores: review.syntheticScores,
    },
    context: eventContext,
    actor: { type: "teacher", id: context.teacherId },
    idempotencyKey: `${eventKey}:reviewed`,
  });
  await appendPersistedLearningEvent(repository, {
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "learning_phase_changed",
    payload: { submissionId: submission.id, from: toTeacherReview.previousState, to: completed.newState, action: "complete" },
    context: eventContext,
    actor: { type: "teacher", id: context.teacherId },
    idempotencyKey: `${eventKey}:phase`,
  });
  return review;
}
