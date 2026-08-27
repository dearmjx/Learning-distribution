import type { LearningContext, LearningEvent, LearningEventActor, LearningEventType } from "@/lib/domain/types";
import { createLearningEvent } from "@/lib/events/event-store";
import type { ScopedLearningRepository } from "@/lib/repository/interfaces";

export async function appendPersistedLearningEvent(
  repository: ScopedLearningRepository,
  input: {
    studentId: string;
    activityId: string;
    eventType: LearningEventType;
    payload: Record<string, unknown>;
    context: LearningContext;
    actor: LearningEventActor;
    correlationId?: string;
    idempotencyKey?: string;
  },
): Promise<LearningEvent> {
  const event = createLearningEvent({
    schemaVersion: 1,
    studentId: input.studentId,
    activityId: input.activityId,
    eventType: input.eventType,
    payload: input.payload,
    context: input.context,
    actor: input.actor,
    correlationId: input.correlationId ?? input.context.correlationId,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });
  return repository.appendLearningEvent(event);
}
