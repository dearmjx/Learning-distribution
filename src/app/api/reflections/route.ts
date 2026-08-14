import { getActivity } from "@/data/course/ecosystem/activities";
import { assertStudentScope, createDemoStudentContext } from "@/lib/context/learning-context";
import { reflectionInputSchema } from "@/lib/domain/schemas";
import { appendLearningEvent } from "@/lib/events/timeline";
import {
  addReflection,
  getReflection,
  getSubmission,
  listReflections,
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

  const reflection = getReflection(studentId, activityId);
  const allStudentReflections = listReflections(studentId);

  return Response.json({
    reflection: reflection ?? null,
    reflections: allStudentReflections,
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = reflectionInputSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "ข้อมูลแบบสะท้อนคิดไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      studentId,
      activityId,
      submissionId,
      conceptualLearning,
      inquiryProcessReflection,
      peerReviewExperience,
      confidenceScore,
      keyTakeaway,
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

    const reflection = addReflection(parsed.data);

    // Log reflection_completed event
    appendLearningEvent({
      studentId,
      activityId,
      eventType: "reflection_completed",
      payload: {
        reflectionId: reflection.id,
        confidenceScore: parsed.data.confidenceScore,
        conceptualLearning: parsed.data.conceptualLearning,
        inquiryProcessReflection: parsed.data.inquiryProcessReflection,
        peerReviewExperience: parsed.data.peerReviewExperience,
        keyTakeaway: parsed.data.keyTakeaway,
        analyticalThinkingScore: parsed.data.analyticalThinkingScore,
        aiLiteracyScore: parsed.data.aiLiteracyScore,
        reflectionText: parsed.data.reflectionText,
        keyLearnings: parsed.data.keyLearnings,
        confidenceRating: parsed.data.confidenceRating,
      },
      context,
      actor: { type: "student", id: studentId },
    });

    // Advance workflow state if active submission exists
    if (submissionId) {
      const studentSubmission = getSubmission(submissionId);
      if (studentSubmission && studentSubmission.studentId === studentId) {
        const transition = adiWorkflow.transition(
          studentSubmission.workflowState,
          "submit_reflection",
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
              action: "submit_reflection",
            },
            context,
            actor: { type: "system", id: "learning-os-workflow" },
          });
        }
      }
    }

    return Response.json({ reflection, success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกแบบสะท้อนคิด";
    return Response.json({ error: message }, { status: 500 });
  }
}
