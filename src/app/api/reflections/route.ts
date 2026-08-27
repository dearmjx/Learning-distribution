import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { reflectionInputSchema } from "@/lib/domain/schemas";
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
    const studentId = identity.context.studentId!;
    const reflection = await repository.getReflection(studentId, activityId);
    return Response.json({ reflection: reflection ?? null, reflections: await repository.listReflections(studentId) });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = reflectionInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "ข้อมูลแบบสะท้อนคิดไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  try {
    const identity = await resolveLearningIdentity({ activityId: parsed.data.activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, parsed.data.studentId);
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(parsed.data.activityId);
    if (!activity) return Response.json({ error: "ไม่พบกิจกรรมที่ระบุ" }, { status: 404 });
    const studentId = identity.context.studentId!;
    const reflection = await repository.addReflection({ ...parsed.data, studentId });
    const eventKey = request.headers.get("Idempotency-Key") ?? `reflection:${studentId}:${parsed.data.activityId}`;
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId: parsed.data.activityId,
      eventType: "reflection_completed",
      payload: { reflectionId: reflection.id, ...parsed.data, studentId: undefined },
      context: identity.context,
      actor: { type: "student", id: studentId },
      idempotencyKey: `${eventKey}:completed`,
    });

    if (parsed.data.submissionId) {
      const studentSubmission = await repository.getSubmission(parsed.data.submissionId);
      if (studentSubmission && studentSubmission.studentId === studentId) {
        const transition = adiWorkflow.transition(studentSubmission.workflowState, "submit_reflection", { peerReviewAllowed: activity.peerReviewAllowed });
        if (transition.allowed) {
          await repository.updateSubmissionWorkflow(studentSubmission.id, transition.newState);
          await appendPersistedLearningEvent(repository, {
            studentId,
            activityId: parsed.data.activityId,
            eventType: "learning_phase_changed",
            payload: { submissionId: studentSubmission.id, from: transition.previousState, to: transition.newState, action: "submit_reflection" },
            context: identity.context,
            actor: { type: "system", id: "learning-os-workflow" },
            idempotencyKey: `${eventKey}:phase`,
          });
        }
      }
    }
    return Response.json({ reflection, success: true });
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}
