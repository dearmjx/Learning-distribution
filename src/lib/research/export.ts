import type { LearningEvent } from "@/lib/domain/types";

export interface SeparatedResearchExport {
  identity: {
    participantKey: string;
    studentId: string;
  };
  evidence: Array<{
    eventId: string;
    eventType: LearningEvent["eventType"];
    activityId: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }>;
}

/** Keeps the identity map separate from the evidence rows used for research export. */
export function buildSeparatedResearchExport(
  participantKey: string,
  studentId: string,
  events: LearningEvent[],
): SeparatedResearchExport {
  return {
    identity: { participantKey, studentId },
    evidence: events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      activityId: event.activityId,
      payload: event.payload,
      occurredAt: event.occurredAt,
    })),
  };
}
