import { z } from "zod";
import type { LearningContext, TeacherReview } from "@/lib/domain/types";
import { appendLearningEvent } from "@/lib/events/timeline";
import { addTeacherReview, getSubmission } from "@/lib/repository/memory-repository";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";

export const teacherReviewInputSchema = z.object({
  submissionId: z.string().min(1),
  teacherId: z.string().min(1),
  score: z.number().min(0).max(100),
  comment: z.string().max(4_000),
});

export function recordTeacherReview(
  context: LearningContext,
  input: z.infer<typeof teacherReviewInputSchema>,
): TeacherReview {
  if (context.role !== "teacher" || context.teacherId !== input.teacherId) {
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
  const review = addTeacherReview(input);
  const eventContext: LearningContext = { ...context, activityId: submission.activityId, studentId: submission.studentId };
  appendLearningEvent({
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "teacher_reviewed",
    payload: { submissionId: submission.id, reviewId: review.id, score: review.score, comment: review.comment },
    context: eventContext,
    actor: { type: "teacher", id: input.teacherId },
  });
  appendLearningEvent({
    studentId: submission.studentId,
    activityId: submission.activityId,
    eventType: "learning_phase_changed",
    payload: { submissionId: submission.id, from: toTeacherReview.previousState, to: completed.newState, action: "complete" },
    context: eventContext,
    actor: { type: "teacher", id: input.teacherId },
  });
  return review;
}
