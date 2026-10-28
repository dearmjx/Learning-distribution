import { assertRequestedStudentMatchesContext, authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { adiWizardStateSchema } from "@/lib/domain/schemas";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import { getLearningRepository } from "@/lib/repository/index";
import { z } from "zod";

const progressInputSchema = z.object({
  activityId: z.string().min(1).max(128),
  saveId: z.string().uuid(),
  state: adiWizardStateSchema,
});

function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const activityId = url.searchParams.get("activityId");
  const requestedStudentId = url.searchParams.get("studentId") ?? undefined;
  if (!activityId) return badRequest("activityId is required");

  try {
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    assertRequestedStudentMatchesContext(identity.context, requestedStudentId);
    const repository = await getLearningRepository(identity);
    const events = await repository.listLearningEvents(identity.context.studentId!, activityId);
    const latest = events.find((event) => event.eventType === "wizard_progress_saved");
    const parsedState = latest ? adiWizardStateSchema.safeParse(latest.payload.state) : undefined;
    const [submission, interactions] = await Promise.all([
      repository.latestSubmission(identity.context.studentId!, activityId),
      repository.listInteractions(identity.context.studentId!, activityId),
    ]);
    const latestFeedback = interactions
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .find((interaction) => interaction.response)?.response;
    return Response.json(
      {
        state: parsedState?.success ? parsedState.data : null,
        savedAt: latest?.occurredAt ?? null,
        submission: submission ?? null,
        feedback: latestFeedback ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }
  const parsed = progressInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Learning progress is invalid", details: parsed.error.flatten() },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { activityId, saveId, state } = parsed.data;
    const identity = await resolveLearningIdentity({ activityId, requiredRole: "student" });
    const repository = await getLearningRepository(identity);
    const activity = await repository.getActivity(activityId);
    if (!activity) return Response.json({ error: "Activity not found" }, { status: 404 });

    const studentId = identity.context.studentId!;
    const event = await appendPersistedLearningEvent(repository, {
      studentId,
      activityId,
      eventType: "wizard_progress_saved",
      payload: { state, contentVersion: "adi-wizard-1" },
      context: { ...identity.context, activityId, adiPhase: state.currentPhase },
      actor: { type: "student", id: studentId },
      correlationId: saveId,
      idempotencyKey: `wizard-progress:${saveId}`,
    });

    return Response.json(
      { saved: true, savedAt: event.occurredAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && /scope denied|identity is controlled|Student scope required/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return authErrorResponse(error);
  }
}
