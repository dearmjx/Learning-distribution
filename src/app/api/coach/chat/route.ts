import { z } from "zod";
import { getActivity } from "@/data/course/ecosystem/activities";
import { chatWithCoach } from "@/lib/ai/coach";
import { assertStudentScope, createDemoStudentContext } from "@/lib/context/learning-context";
import { appendLearningEvent } from "@/lib/events/timeline";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";

const chatRequestSchema = z.object({
  studentId: z.string().min(1).default("demo-student-01"),
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

    const { studentId, activityId, message, studentCer, history } = parsed.data;
    const activity = getActivity(activityId);
    if (!activity) {
      return Response.json({ error: "ไม่พบกิจกรรม" }, { status: 404 });
    }

    const approvedDoc = approvedContextRepository.getApprovedContext(activity.courseId, activity.id);
    const approvedContext = approvedDoc?.text ?? activity.context;

    const context = createDemoStudentContext(activity.id);
    try {
      assertStudentScope(context, studentId);
    } catch {
      return Response.json({ error: "ไม่อนุญาตให้เข้าถึงข้อมูลนักเรียนคนอื่น" }, { status: 403 });
    }

    // Log student chat prompt event
    appendLearningEvent({
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
    appendLearningEvent({
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
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสนทนากับ AI Coach";
    return Response.json({ error: message }, { status: 500 });
  }
}
