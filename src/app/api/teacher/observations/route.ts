import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";
import { teacherObservationNoteSchema } from "@/lib/domain/schemas";
import { appendPersistedLearningEvent } from "@/lib/events/persistent-event";
import type { PaorCycle } from "@/lib/domain/types";

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const cycleParam = url.searchParams.get("cycle");
    const cycle: PaorCycle | undefined = cycleParam === "1" ? 1 : cycleParam === "2" ? 2 : undefined;
    const activityId = url.searchParams.get("activityId") ?? undefined;

    const notes = await repository.listTeacherObservationNotes(identity.context.teacherId, cycle, activityId);
    return Response.json({ notes }, {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const json = await request.json();
    const parsed = teacherObservationNoteSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "ข้อมูลบันทึกการสังเกตไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const teacherId = identity.context.teacherId;
    if (!teacherId) return Response.json({ error: "Teacher scope required" }, { status: 403 });
    const note = await repository.addTeacherObservationNote({
      teacherId,
      classId: identity.context.classId,
      cycle: parsed.data.cycle,
      activityId: parsed.data.activityId,
      phase: parsed.data.phase,
      content: parsed.data.content,
    });

    await appendPersistedLearningEvent(repository, {
      studentId: teacherId,
      activityId: note.activityId,
      eventType: "teacher_observation_recorded",
      payload: {
        noteId: note.id,
        cycle: note.cycle,
        phase: note.phase,
        content: note.content,
      },
      context: identity.context,
      actor: { type: "teacher", id: teacherId },
      cycle: note.cycle,
    });

    return Response.json({ note }, {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
