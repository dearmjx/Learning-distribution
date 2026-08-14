import type { LearningContext, LearningEvent, LearningEventActor, LearningEventType } from "@/lib/domain/types";
import { createLearningContext } from "@/lib/context/learning-context";
import { learningEventStore } from "@/lib/events/event-store";

export function appendLearningEvent(
  event: Omit<LearningEvent, "id" | "occurredAt" | "createdAt" | "schemaVersion" | "correlationId" | "context" | "actor"> & {
    context?: LearningContext;
    actor?: LearningEventActor;
    schemaVersion?: 1;
    correlationId?: string;
  },
): LearningEvent {
  const context = event.context ?? createLearningContext({ activityId: event.activityId, studentId: event.studentId });
  return learningEventStore.append({
    ...event,
    context,
    actor: event.actor ?? { type: "student", id: event.studentId },
    schemaVersion: 1,
    correlationId: event.correlationId ?? context.correlationId,
  });
}

export function listLearningEvents(studentId?: string, activityId?: string): LearningEvent[] {
  return learningEventStore.list({ studentId, activityId, limit: 10_000 });
}

export function subscribeToLearningEvents(eventType: LearningEventType | "*", handler: (event: LearningEvent) => void | Promise<void>): () => void {
  return learningEventStore.subscribe(eventType, handler);
}

export function clearLearningEventsForTests(): void {
  learningEventStore.clearForTests();
}
