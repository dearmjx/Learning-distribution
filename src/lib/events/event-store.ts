import { parseLearningEvent } from "@/lib/domain/schemas";
import type { LearningEvent, LearningEventType } from "@/lib/domain/types";

export type LearningEventInput = Omit<LearningEvent, "id" | "occurredAt" | "createdAt"> & {
  occurredAt?: string;
};

export interface LearningEventFilters {
  studentId?: string;
  activityId?: string;
  eventType?: LearningEventType;
  correlationId?: string;
  limit?: number;
}

export type LearningEventHandler = (event: LearningEvent) => void | Promise<void>;

/**
 * Education-owned append-only event store. It follows the source platform's
 * event-store pattern but has no industrial context, table, or data coupling.
 */
export class LearningEventStore {
  private readonly events: LearningEvent[] = [];
  private readonly subscribers = new Map<string, Set<LearningEventHandler>>();

  append(input: LearningEventInput): LearningEvent {
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const event = parseLearningEvent({
      ...input,
      id: crypto.randomUUID(),
      occurredAt,
      createdAt: occurredAt,
    });
    this.events.push(event);
    this.notify(event);
    return event;
  }

  list(filters: LearningEventFilters = {}): LearningEvent[] {
    const limit = filters.limit ?? 100;
    return this.events
      .filter((event) =>
        (!filters.studentId || event.studentId === filters.studentId) &&
        (!filters.activityId || event.activityId === filters.activityId) &&
        (!filters.eventType || event.eventType === filters.eventType) &&
        (!filters.correlationId || event.correlationId === filters.correlationId),
      )
      .slice()
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }

  byCorrelation(correlationId: string): LearningEvent[] {
    return this.list({ correlationId, limit: 10_000 });
  }

  async replay(fromIso: string, handler: LearningEventHandler): Promise<number> {
    const events = this.events
      .filter((event) => event.occurredAt >= fromIso)
      .slice()
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    for (const event of events) await handler(event);
    return events.length;
  }

  subscribe(eventType: LearningEventType | "*", handler: LearningEventHandler): () => void {
    const handlers = this.subscribers.get(eventType) ?? new Set<LearningEventHandler>();
    handlers.add(handler);
    this.subscribers.set(eventType, handlers);
    return () => handlers.delete(handler);
  }

  clearForTests(): void {
    this.events.length = 0;
    this.subscribers.clear();
  }

  private notify(event: LearningEvent): void {
    const handlers = [
      ...(this.subscribers.get(event.eventType) ?? []),
      ...(this.subscribers.get("*") ?? []),
    ];
    for (const handler of handlers) void Promise.resolve(handler(event)).catch(() => undefined);
  }
}

export const learningEventStore = new LearningEventStore();
