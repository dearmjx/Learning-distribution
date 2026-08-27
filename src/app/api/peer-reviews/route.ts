import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { peerReviewInputSchema } from "@/lib/domain/schemas";
import { getLearningRepository } from "@/lib/repository/index";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedStudentId = url.searchParams.get("studentId") ?? undefined;
  const activityId = url.searchParams.get("activityId") ?? "ecosystem-food-web-01";
  try {
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, requestedStudentId);
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(activityId);
    if (!activity) return Response.json({ error: "ไม่พบกิจกรรมที่ระบุ" }, { status: 404 });
    const studentId = identity.context.studentId!;
    if (!activity.peerReviewAllowed) return Response.json({ peerDraft: null, assignedDraft: null, myReviews: [], peerReviewAllowed: false });

    const peerDraft = await repository.getAssignedPeerReviewDraft(studentId, activityId);
    const myReviews = await repository.listPeerReviews(undefined, studentId);
    if (peerDraft) {
      await appendPersistedLearningEvent(repository, {
        studentId,
        activityId,
        eventType: "peer_review_assigned",
        payload: { assignedDraftId: peerDraft.id, authorAlias: peerDraft.anonymousAuthorAlias, isSynthetic: peerDraft.isSynthetic ?? false },
        context: identity.context,
        actor: { type: "system", id: "peer-review-engine" },
        idempotencyKey: `peer-assignment:${studentId}:${peerDraft.id}`,
      });
    }
    return Response.json({ peerDraft: peerDraft ?? null, assignedDraft: peerDraft ?? null, myReviews, peerReviewAllowed: true });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = peerReviewInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "ข้อมูลการประเมิน peer review ไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  const activityId = parsed.data.activityId;
  try {
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, parsed.data.studentId ?? parsed.data.reviewerStudentId);
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(activityId);
    if (!activity) return Response.json({ error: "ไม่พบกิจกรรมที่ระบุ" }, { status: 404 });
    if (!activity.peerReviewAllowed) return Response.json({ error: "กิจกรรมนี้ไม่ได้เปิด peer review" }, { status: 403 });
    const studentId = identity.context.studentId!;
    const assigned = await repository.getAssignedPeerReviewDraft(studentId, activityId);
    if (!assigned || assigned.submissionId !== parsed.data.submissionId || (parsed.data.peerReviewSubmissionId && assigned.id !== parsed.data.peerReviewSubmissionId)) {
      return Response.json({ error: "ผลงานนี้ไม่ได้ถูกมอบหมายให้ผู้รีวิวคนนี้" }, { status: 403 });
    }

    const review = await repository.addPeerReview({
      submissionId: assigned.submissionId,
      peerReviewSubmissionId: assigned.id,
      reviewerStudentId: studentId,
      authorStudentId: assigned.authorStudentId,
      activityId,
      scores: parsed.data.scores,
      strengths: parsed.data.strengths,
      suggestions: parsed.data.suggestions,
      feedback: parsed.data.feedback || `[จุดเด่น]: ${parsed.data.strengths}\n[ข้อเสนอแนะ]: ${parsed.data.suggestions}`,
    });

    const eventKey = request.headers.get("Idempotency-Key") ?? `peer-review:${studentId}:${assigned.id}`;
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId,
      eventType: "peer_review_submitted",
      payload: { peerReviewId: review.id, submissionId: assigned.submissionId, scores: parsed.data.scores, strengths: parsed.data.strengths, suggestions: parsed.data.suggestions },
      context: identity.context,
      actor: { type: "student", id: studentId },
      idempotencyKey: `${eventKey}:submitted`,
    });

    const studentSubmission = await repository.getSubmission(assigned.submissionId);
    if (studentSubmission && studentSubmission.studentId === studentId) {
      const transition = adiWorkflow.transition(studentSubmission.workflowState, "submit_peer_review", { peerReviewAllowed: activity.peerReviewAllowed });
      if (transition.allowed) {
        await repository.updateSubmissionWorkflow(studentSubmission.id, transition.newState);
        await appendPersistedLearningEvent(repository, {
          studentId,
          activityId,
          eventType: "learning_phase_changed",
          payload: { submissionId: studentSubmission.id, from: transition.previousState, to: transition.newState, action: "submit_peer_review" },
          context: identity.context,
          actor: { type: "system", id: "learning-os-workflow" },
          idempotencyKey: `${eventKey}:phase`,
        });
      }
    }
    return Response.json({ review, success: true });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}
