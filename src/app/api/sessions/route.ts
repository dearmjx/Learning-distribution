import { z } from "zod";
import { buildAuthorshipIndicators } from "@/lib/analytics/authorship";
import { generateCoachFeedback } from "@/lib/ai/coach";
import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { cerResponseSchema } from "@/lib/domain/schemas";
import type { AnalyzeSubmissionInput, CoachRequest } from "@/lib/domain/types";
import { getLearningRepository } from "@/lib/repository/index";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";

const submissionSchema = z.object({
  studentId: z.string().min(1).optional(),
  activityId: z.string().min(1),
  content: cerResponseSchema,
  hintDepth: z.enum(["none", "shallow", "concept", "deep"]).default("none"),
  responseTimeSeconds: z.number().int().min(0).max(86_400).default(0),
  requestId: z.string().min(1).max(256).optional(),
});

export async function POST(request: Request) {
  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูล submission ไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const identity = await resolveLearningIdentity({ activityId: parsed.data.activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, parsed.data.studentId);
    const repository = await getLearningRepository(identity);
    const studentId = identity.context.studentId!;
    const activity = await repository.getActivity(parsed.data.activityId);
    if (!activity) return Response.json({ error: "ไม่พบ activity หรือกิจกรรมไม่ได้ถูกมอบหมายให้ชั้นเรียนนี้" }, { status: 404 });
    const approvedContext = approvedContextRepository.getApprovedContext(activity.courseId, activity.id);
    if (!approvedContext) return Response.json({ error: "ไม่พบ approved context ของกิจกรรม" }, { status: 409 });

    const requestId = request.headers.get("Idempotency-Key") ?? parsed.data.requestId ?? crypto.randomUUID();
    const input: AnalyzeSubmissionInput = { ...parsed.data, studentId, requestId };
    const previous = await repository.latestSubmission(studentId, input.activityId);
    const revisionCount = (await repository.listSubmissions(studentId, input.activityId)).length;
    const previousState = previous?.workflowState;
    if (previous && previousState !== "revising" && previous.idempotencyKey !== requestId) {
      await repository.updateSubmissionWorkflow(previous.id, "revising");
      await appendPersistedLearningEvent(repository, {
        studentId,
        activityId: input.activityId,
        eventType: "learning_phase_changed",
        payload: { submissionId: previous.id, from: previousState, to: "revising", action: "start_revision" },
        context: identity.context,
        actor: { type: "student", id: studentId },
        idempotencyKey: `${requestId}:start-revision`,
      });
    }

    const submission = await repository.addSubmission({
      studentId,
      activityId: input.activityId,
      content: input.content,
      version: revisionCount + 1,
      hintDepth: input.hintDepth,
      hintCost: input.hintDepth === "none" ? 0 : input.hintDepth === "shallow" ? 1 : input.hintDepth === "concept" ? 2 : 3,
      responseTimeSeconds: input.responseTimeSeconds,
      workflowState: "submitted",
      ...(previous ? { previousDraftId: previous.id } : {}),
      idempotencyKey: requestId,
    });

    await repository.addRevision({
      submissionId: submission.id,
      studentId,
      activityId: input.activityId,
      version: submission.version,
      content: input.content,
      idempotencyKey: `${requestId}:revision`,
    });

    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId: input.activityId,
      eventType: previous ? "student_revised" : "student_submitted",
      payload: { submissionId: submission.id, version: submission.version, hintDepth: input.hintDepth },
      context: identity.context,
      actor: { type: "student", id: studentId },
      idempotencyKey: `${requestId}:submission-event`,
    });

    if (input.hintDepth !== "none") {
      await appendPersistedLearningEvent(repository, {
        studentId,
        activityId: input.activityId,
        eventType: "hint_requested",
        payload: { submissionId: submission.id, hintDepth: input.hintDepth, hintCost: submission.hintCost },
        context: identity.context,
        actor: { type: "student", id: studentId },
        idempotencyKey: `${requestId}:hint`,
      });
    }

    const existingInteraction = previous?.idempotencyKey === requestId
      ? (await repository.listInteractions(studentId, input.activityId)).find((item) => item.request.requestId === requestId)
      : undefined;
    if (existingInteraction?.response) {
      const submissions = await repository.listSubmissions(studentId, input.activityId);
      return Response.json({
        submission,
        feedback: existingInteraction.response,
        authorship: buildAuthorshipIndicators(activity.prompt, input.content, revisionCount, input.responseTimeSeconds),
        submissions,
        revisions: await repository.listRevisions(submission.id),
        events: await repository.listLearningEvents(studentId),
      });
    }
    const feedback = existingInteraction?.response ?? await generateCoachFeedback(activity, { ...input, context: identity.context }, { context: identity.context, approvedContext: approvedContext.text });
    const feedbackTransition = adiWorkflow.transition(submission.workflowState, "feedback_received", {
      peerReviewAllowed: activity.peerReviewAllowed,
    });
    if (!feedbackTransition.allowed) return Response.json({ error: "ADI workflow ไม่อนุญาตให้รับ feedback ในสถานะนี้" }, { status: 409 });
    const updatedSubmission = await repository.updateSubmissionWorkflow(submission.id, feedbackTransition.newState);
    if (updatedSubmission) Object.assign(submission, updatedSubmission);

    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId: input.activityId,
      eventType: "ai_feedback_received",
      payload: { submissionId: submission.id, targetDimension: feedback.targetDimension, provider: feedback.provider, fallbackUsed: feedback.fallbackUsed },
      context: identity.context,
      actor: { type: "system", id: "learning-os-coach" },
      idempotencyKey: `${requestId}:feedback`,
    });
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId: input.activityId,
      eventType: "learning_phase_changed",
      payload: { submissionId: submission.id, from: feedbackTransition.previousState, to: feedbackTransition.newState, action: "feedback_received" },
      context: identity.context,
      actor: { type: "system", id: "learning-os-workflow" },
      idempotencyKey: `${requestId}:feedback-phase`,
    });

    const coachRequest: CoachRequest = {
      requestId: feedback.requestId,
      context: identity.context,
      activity,
      approvedContext: approvedContext.text,
      cer: input.content,
      hintDepth: input.hintDepth,
      currentAdiPhase: activity.adiPhase,
    };
    if (!existingInteraction) {
      const aiSession = await repository.createSession({ studentId, activityId: input.activityId, context: identity.context, provider: feedback.provider });
      await repository.addInteraction({ sessionId: aiSession.id, studentId, activityId: input.activityId, request: coachRequest, response: feedback, fallbackUsed: feedback.fallbackUsed });
    }

    const authorship = buildAuthorshipIndicators(activity.prompt, input.content, revisionCount, input.responseTimeSeconds);
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId: input.activityId,
      eventType: "authorship_indicator_created",
      payload: { ...authorship, submissionId: submission.id },
      context: identity.context,
      actor: { type: "system", id: "learning-os-authorship-signal" },
      idempotencyKey: `${requestId}:authorship`,
    });

    const submissions = await repository.listSubmissions(studentId, input.activityId);
    return Response.json({
      submission,
      feedback,
      authorship,
      submissions,
      revisions: await repository.listRevisions(submission.id),
      events: await repository.listLearningEvents(studentId),
    });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return authErrorResponse(error);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedStudentId = url.searchParams.get("studentId") ?? undefined;
  const activityId = url.searchParams.get("activityId") ?? undefined;
  try {
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, requestedStudentId);
    const repository = await getLearningRepository(identity);
    const studentId = identity.context.studentId!;
    const submissions = await repository.listSubmissions(studentId, activityId);
    return Response.json({
      submissions,
      revisions: (await Promise.all(submissions.map((submission) => repository.listRevisions(submission.id)))).flat(),
      events: await repository.listLearningEvents(studentId, activityId),
    });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return authErrorResponse(error);
  }
}
