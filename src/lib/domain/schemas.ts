import { z } from "zod";
import type { LearningEvent, LearningContext, CoachRequest, CoachResponse } from "@/lib/domain/types";

export const adiPhaseSchema = z.enum([
  "orientation",
  "identification",
  "investigation",
  "argument",
  "peer_review",
  "revision",
  "reflection",
]);

export const adiWorkflowStateSchema = z.enum([
  "draft",
  "submitted",
  "ai_feedback_received",
  "revising",
  "peer_review",
  "teacher_review",
  "completed",
]);

export const learningContextSchema = z.object({
  schoolId: z.string().min(1).max(128),
  courseId: z.string().min(1).max(128),
  classId: z.string().min(1).max(128),
  activityId: z.string().min(1).max(128).optional(),
  studentId: z.string().min(1).max(128).optional(),
  teacherId: z.string().min(1).max(128).optional(),
  adiPhase: adiPhaseSchema,
  role: z.enum(["student", "teacher", "system", "researcher"]),
  language: z.enum(["th", "en"]),
  permissions: z.array(z.string().min(1).max(128)).max(32),
  traceId: z.string().min(1).max(128),
  correlationId: z.string().min(1).max(128),
});

export const cerResponseSchema = z.object({
  claim: z.string().max(12_000),
  evidence: z.string().max(12_000),
  reasoning: z.string().max(12_000),
});

export const activitySchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  unit: z.string().min(1),
  title: z.string().min(1),
  adiPhase: adiPhaseSchema,
  prompt: z.string().min(1),
  context: z.string().min(1),
  rubricDimensions: z.array(z.enum(["claim", "evidence", "reasoning"])).min(1),
  peerReviewAllowed: z.boolean(),
});

export const coachRequestSchema = z.object({
  requestId: z.string().min(1).max(128),
  context: learningContextSchema,
  activity: activitySchema,
  approvedContext: z.string().min(1).max(40_000),
  cer: cerResponseSchema,
  hintDepth: z.enum(["none", "shallow", "concept", "deep"]),
  currentAdiPhase: adiPhaseSchema,
});

export const coachResponseSchema = z.object({
  requestId: z.string().min(1).max(128),
  provider: z.enum(["mock", "local", "deepseek", "fallback"]),
  message: z.string().min(1).max(4_000),
  targetDimension: z.enum(["claim", "evidence", "reasoning"]),
  hintDepth: z.enum(["none", "shallow", "concept", "deep"]),
  hintCost: z.number().int().nonnegative(),
  citations: z.array(z.string().max(512)).max(16),
  directAnswerBlocked: z.literal(true),
  fallbackUsed: z.boolean(),
  safetyFlags: z.array(z.string().max(128)).max(32),
});

export const learningEventSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  context: learningContextSchema,
  actor: z.object({
    type: z.enum(["student", "teacher", "system", "researcher"]),
    id: z.string().min(1),
  }),
  studentId: z.string().min(1),
  activityId: z.string().min(1),
  eventType: z.enum([
    "activity_selected",
    "context_viewed",
    "student_submitted",
    "ai_feedback_received",
    "hint_requested",
    "student_revised",
    "peer_review_assigned",
    "peer_review_submitted",
    "teacher_reviewed",
    "reflection_completed",
    "learning_phase_changed",
    "authorship_indicator_created",
  ]),
  payload: z.record(z.unknown()),
  correlationId: z.string().min(1),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export function parseLearningContext(value: unknown): LearningContext {
  return learningContextSchema.parse(value);
}

export function parseCoachRequest(value: unknown): CoachRequest {
  return coachRequestSchema.parse(value);
}

export function parseCoachResponse(value: unknown): CoachResponse {
  return coachResponseSchema.parse(value);
}

export function parseLearningEvent(value: unknown): LearningEvent {
  return learningEventSchema.parse(value);
}
