import { z } from "zod";
import { chatWithCoach } from "@/lib/ai/coach";
import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";
import { getLearningRepository } from "@/lib/repository/index";

const chatRequestSchema = z.object({
  studentId: z.string().min(1).optional(),
  activityId: z.string().min(1),
  message: z.string().min(1).max(2000),
  studentCer: z
    .object({
      claim: z.string().default(""),
      evidence: z.string().default(""),
      reasoning: z.string().default(""),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(20)
    .default([]),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "ข้อมูลข้อความไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { studentId: requestedStudentId, activityId, message, studentCer, history } = parsed.data;
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, requestedStudentId);
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(activityId);
    if (!activity) {
      return Response.json({ error: "ไม่พบกิจกรรม" }, { status: 404 });
    }

    const approvedDoc = approvedContextRepository.getApprovedContext(activity.courseId, activity.id);
    const approvedContext = approvedDoc?.text ?? activity.context;

    const context = identity.context;
    const studentId = context.studentId!;

    // Log student chat prompt event
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId,
      eventType: "hint_requested",
      payload: {
        chatMessage: message,
        hintDepth: "deep",
        mode: "socratic_chat",
      },
      context,
      actor: { type: "student", id: studentId },
    });

    const result = await chatWithCoach({
      activity,
      approvedContext,
      studentCer,
      message,
      history,
    });

    // Log AI Coach reply event
    await appendPersistedLearningEvent(repository, {
      studentId,
      activityId,
      eventType: "ai_feedback_received",
      payload: {
        coachReply: result.message,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
      },
      context,
      actor: { type: "system", id: "socratic-coach" },
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}
