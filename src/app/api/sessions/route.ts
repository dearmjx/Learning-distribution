import { z } from "zod";
import { getActivity } from "@/data/course/ecosystem/activities";
import { buildAuthorshipIndicators } from "@/lib/analytics/authorship";
import { generateCoachFeedback } from "@/lib/ai/coach";
import { assertStudentScope, createDemoStudentContext } from "@/lib/context/learning-context";
import { appendLearningEvent, listLearningEvents } from "@/lib/events/timeline";
import { cerResponseSchema } from "@/lib/domain/schemas";
import type { AnalyzeSubmissionInput, CoachRequest } from "@/lib/domain/types";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";
import { addAiInteraction, addAiSession, addRevision, addSubmission, latestSubmission, listRevisions, listSubmissions } from "@/lib/repository/memory-repository";

const submissionSchema = z.object({
  studentId: z.string().min(1),
  activityId: z.string().min(1),
  content: cerResponseSchema,
  hintDepth: z.enum(["none", "shallow", "concept", "deep"]).default("none"),
  responseTimeSeconds: z.number().int().min(0).max(86_400).default(0),
});

export async function POST(request: Request) {
  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูล submission ไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const input: AnalyzeSubmissionInput = parsed.data;
  const activity = getActivity(input.activityId);
  if (!activity) return Response.json({ error: "ไม่พบ activity" }, { status: 404 });
  const approvedContext = approvedContextRepository.getApprovedContext(activity.courseId, activity.id);
  if (!approvedContext) return Response.json({ error: "ไม่พบ approved context ของกิจกรรม" }, { status: 409 });

  const context = createDemoStudentContext(activity.id);
  try {
    assertStudentScope(context, input.studentId);
  } catch {
    return Response.json({ error: "ไม่อนุญาตให้เข้าถึงข้อมูลของนักเรียนคนอื่น" }, { status: 403 });
  }

  const previous = latestSubmission(input.studentId, input.activityId);
  const revisionCount = listSubmissions(input.studentId, input.activityId).length;
  const previousState = previous?.workflowState;
  if (previous) previous.workflowState = "revising";
  const submission = addSubmission({
    studentId: input.studentId,
    activityId: input.activityId,
    content: input.content,
    version: revisionCount + 1,
    hintDepth: input.hintDepth,
    hintCost: input.hintDepth === "none" ? 0 : input.hintDepth === "shallow" ? 1 : input.hintDepth === "concept" ? 2 : 3,
    responseTimeSeconds: input.responseTimeSeconds,
    workflowState: "submitted",
    ...(previous ? { previousDraftId: previous.id } : {}),
  });

  if (previous && previousState && previousState !== "revising") {
    appendLearningEvent({
      studentId: input.studentId,
      activityId: input.activityId,
      eventType: "learning_phase_changed",
      payload: { submissionId: previous.id, from: previousState, to: "revising", action: "start_revision" },
      context,
      actor: { type: "student", id: input.studentId },
    });
  }

  addRevision({
    submissionId: submission.id,
    studentId: input.studentId,
    activityId: input.activityId,
    version: submission.version,
    content: input.content,
  });

  appendLearningEvent({
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: previous ? "student_revised" : "student_submitted",
    payload: { submissionId: submission.id, version: submission.version, hintDepth: input.hintDepth },
    context,
    actor: { type: "student", id: input.studentId },
  });

  if (input.hintDepth !== "none") {
    appendLearningEvent({
      studentId: input.studentId,
      activityId: input.activityId,
      eventType: "hint_requested",
      payload: { submissionId: submission.id, hintDepth: input.hintDepth, hintCost: submission.hintCost },
      context,
      actor: { type: "student", id: input.studentId },
    });
  }

  const feedback = await generateCoachFeedback(activity, { ...input, context }, { context, approvedContext: approvedContext.text });
  const feedbackTransition = adiWorkflow.transition(submission.workflowState, "feedback_received", {
    peerReviewAllowed: activity.peerReviewAllowed,
  });
  if (!feedbackTransition.allowed) {
    return Response.json({ error: "ADI workflow ไม่อนุญาตให้รับ feedback ในสถานะนี้" }, { status: 409 });
  }
  submission.workflowState = feedbackTransition.newState;
  appendLearningEvent({
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: "ai_feedback_received",
    payload: { submissionId: submission.id, targetDimension: feedback.targetDimension, provider: feedback.provider, fallbackUsed: feedback.fallbackUsed },
    context,
    actor: { type: "system", id: "learning-os-coach" },
  });

  appendLearningEvent({
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: "learning_phase_changed",
    payload: {
      submissionId: submission.id,
      from: feedbackTransition.previousState,
      to: feedbackTransition.newState,
      action: "feedback_received",
    },
    context,
    actor: { type: "system", id: "learning-os-workflow" },
  });

  const aiSession = addAiSession({
    studentId: input.studentId,
    activityId: input.activityId,
    context,
    provider: feedback.provider,
  });
  const coachRequest: CoachRequest = {
    requestId: feedback.requestId,
    context,
    activity,
    approvedContext: approvedContext.text,
    cer: input.content,
    hintDepth: input.hintDepth,
    currentAdiPhase: activity.adiPhase,
  };
  addAiInteraction({
    sessionId: aiSession.id,
    studentId: input.studentId,
    activityId: input.activityId,
    request: coachRequest,
    response: feedback,
    fallbackUsed: feedback.fallbackUsed,
  });

  const authorship = buildAuthorshipIndicators(
    activity.prompt,
    input.content,
    revisionCount,
    input.responseTimeSeconds,
  );
  appendLearningEvent({
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: "authorship_indicator_created",
    payload: { ...authorship },
    context,
    actor: { type: "system", id: "learning-os-authorship-signal" },
  });

  return Response.json({
    submission,
    feedback,
    authorship,
    submissions: listSubmissions(input.studentId, input.activityId),
    revisions: listRevisions(submission.id),
    events: listLearningEvents(input.studentId),
  });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const requestedStudentId = url.searchParams.get("studentId") ?? "demo-student-01";
  const activityId = url.searchParams.get("activityId") ?? undefined;
  const context = createDemoStudentContext(activityId ?? "ecosystem-food-web-01");
  try {
    assertStudentScope(context, requestedStudentId);
  } catch {
    return Response.json({ error: "ไม่อนุญาตให้เข้าถึงข้อมูลของนักเรียนคนอื่น" }, { status: 403 });
  }
  return Response.json({
    submissions: listSubmissions(requestedStudentId, activityId),
    revisions: listSubmissions(requestedStudentId, activityId).flatMap((submission) => listRevisions(submission.id)),
    events: listLearningEvents(requestedStudentId, activityId),
  });
}
