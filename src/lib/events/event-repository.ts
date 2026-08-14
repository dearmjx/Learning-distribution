import type { LearningEvent } from "@/lib/domain/types";
import type { LearningEventRepository } from "@/lib/repository/interfaces";
import { learningEventStore } from "@/lib/events/event-store";

/** Repository adapter over the append-only education event store. */
export class EventStoreLearningEventRepository implements LearningEventRepository {
  append(event: LearningEvent): LearningEvent {
    return learningEventStore.append(event);
  }

  list(studentId?: string, activityId?: string): LearningEvent[] {
    return learningEventStore.list({ studentId, activityId, limit: 10_000 });
  }
}

export const learningEventRepository = new EventStoreLearningEventRepository();
