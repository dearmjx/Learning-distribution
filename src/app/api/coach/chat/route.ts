import { z } from "zod";
import { chatWithCoach } from "@/lib/ai/coach";
import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";
import { getLearningRepository } from "@/lib/repository/index";
import { checkRateLimit, coachRateLimitPerMinute, rateLimitedResponse } from "@/lib/safety/rate-limit";

const chatRequestSchema = z.object({
  studentId: z.string().min(1).optional(),
  activityId: z.string().min(1),
  mode: z.enum(["coach", "opponent"]).default("coach"),
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

    const { studentId: requestedStudentId, activityId, mode, message, studentCer, history } = parsed.data;
    const eventMode = mode === "opponent" ? "opponent_challenge" : "socratic_chat";
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, requestedStudentId);
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(activityId);
    if (!activity) {
      return Response.json({ error: "ไม่พบกิจกรรม" }, { status: 404 });
    }

    // Draft-first research gate: the Coach unlocks only after a Draft 1 baseline exists.
    const baseline = await repository.latestSubmission(identity.context.studentId!, activityId);
    if (!baseline) {
      return Response.json(
        { error: "กรุณาส่ง Draft 1 (Freeze Baseline) ก่อนเริ่มคุยกับ AI Coach", code: "draft1_required" },
        { status: 409 },
      );
    }

    const limit = checkRateLimit(`coach-chat:${identity.context.studentId}`, coachRateLimitPerMinute());
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    const retrievalQuery = [
      message,
      studentCer?.claim,
      studentCer?.evidence,
      studentCer?.reasoning,
    ].filter(Boolean).join("\n");
    const approvedDoc = await approvedContextRepository.getApprovedContext(activity, retrievalQuery);
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
        mode: eventMode,
      },
      context,
      actor: { type: "student", id: studentId },
    });

    const result = await chatWithCoach({
      mode,
      activity,
      approvedContext,
      approvedCitations: approvedDoc?.citations,
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
        mode: eventMode,
        guardrailReplaced: result.guardrailReplaced,
        provider: result.provider,
        ...(typeof result.telemetry?.totalTokens === "number" ? { totalTokens: result.telemetry.totalTokens } : {}),
        fallbackUsed: result.fallbackUsed,
        ragChunkIds: approvedDoc?.chunkIds ?? [],
        citations: result.citations,
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
