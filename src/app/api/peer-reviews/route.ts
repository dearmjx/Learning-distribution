import { getActivity } from "@/data/course/ecosystem/activities";
import { assertStudentScope, createDemoStudentContext } from "@/lib/context/learning-context";
import { peerReviewInputSchema } from "@/lib/domain/schemas";
import { appendLearningEvent } from "@/lib/events/timeline";
import {
  addPeerReview,
  getAssignedPeerReviewDraft,
  getSubmission,
  listPeerReviews,
} from "@/lib/repository/memory-repository";
import { adiWorkflow } from "@/lib/workflow/adi-workflow";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId") ?? "demo-student-01";
  const activityId = url.searchParams.get("activityId") ?? "ecosystem-food-web-01";

  const activity = getActivity(activityId);
  if (!activity) {
    return Response.json({ error: "ไม่พบกิจกรรมที่ระบุ" }, { status: 404 });
  }

  const context = createDemoStudentContext(activityId);
  try {
    assertStudentScope(context, studentId);
  } catch {
    return Response.json({ error: "ไม่อนุญาตให้เข้าถึงข้อมูลของนักเรียนคนอื่น" }, { status: 403 });
  }

  const peerDraft = getAssignedPeerReviewDraft(studentId, activityId);
  const myReviews = listPeerReviews(undefined, studentId);

  if (peerDraft) {
    appendLearningEvent({
      studentId,
      activityId,
      eventType: "peer_review_assigned",
      payload: {
        assignedDraftId: peerDraft.id,
        authorAlias: peerDraft.anonymousAuthorAlias,
        isSynthetic: peerDraft.isSynthetic ?? false,
      },
      context,
      actor: { type: "system", id: "peer-review-engine" },
    });
  }

  return Response.json({
    peerDraft: peerDraft ?? null,
    myReviews,
    peerReviewAllowed: activity.peerReviewAllowed,
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = peerReviewInputSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "ข้อมูลการประเมิน peer review ไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      studentId,
      activityId,
      submissionId,
      peerReviewSubmissionId,
      scores,
      strengths,
      suggestions,
      feedback,
    } = parsed.data;

    const activity = getActivity(activityId);
    if (!activity) {
      return Response.json({ error: "ไม่พบกิจกรรมที่ระบุ" }, { status: 404 });
    }

    const context = createDemoStudentContext(activityId);
    try {
      assertStudentScope(context, studentId);
    } catch {
      return Response.json({ error: "ไม่อนุญาตให้เข้าถึงข้อมูลของนักเรียนคนอื่น" }, { status: 403 });
    }

    // Resolve author student ID (real or synthetic)
    let authorStudentId = parsed.data.authorStudentId;
    if (!authorStudentId) {
      const realSub = getSubmission(submissionId);
      if (realSub) {
        authorStudentId = realSub.studentId;
      } else {
        const assigned = getAssignedPeerReviewDraft(studentId, activityId);
        authorStudentId = assigned?.authorStudentId ?? "anonymous-peer";
      }
    }

    // Prevent self-review
    if (authorStudentId === studentId) {
      return Response.json({ error: "ไม่อนุญาตให้ประเมินผลงานของตนเอง" }, { status: 400 });
    }

    const formattedFeedback =
      feedback || `[จุดเด่น]: ${strengths}\n[ข้อเสนอแนะ]: ${suggestions}`;

    const review = addPeerReview({
      submissionId,
      peerReviewSubmissionId,
      reviewerStudentId: studentId,
      authorStudentId,
      activityId,
      scores,
      strengths,
      suggestions,
      feedback: formattedFeedback,
    });

    // Log peer_review_submitted event
    appendLearningEvent({
      studentId,
      activityId,
      eventType: "peer_review_submitted",
      payload: {
        peerReviewId: review.id,
        submissionId,
        authorStudentId,
        scores,
        strengths,
        suggestions,
      },
      context,
      actor: { type: "student", id: studentId },
    });

    // Advance workflow state if student had an active submission
    const studentSubmission = getSubmission(submissionId);
    if (studentSubmission && studentSubmission.studentId === studentId) {
      const transition = adiWorkflow.transition(
        studentSubmission.workflowState,
        "submit_peer_review",
        { peerReviewAllowed: activity.peerReviewAllowed },
      );
      if (transition.allowed) {
        studentSubmission.workflowState = transition.newState;
        appendLearningEvent({
          studentId,
          activityId,
          eventType: "learning_phase_changed",
          payload: {
            submissionId: studentSubmission.id,
            from: transition.previousState,
            to: transition.newState,
            action: "submit_peer_review",
          },
          context,
          actor: { type: "system", id: "learning-os-workflow" },
        });
      }
    }

    return Response.json({ review, success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึก Peer Review";
    return Response.json({ error: message }, { status: 500 });
  }
}
