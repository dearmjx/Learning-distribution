import { z } from "zod";
import type {
  LearningEvent,
  LearningContext,
  CoachRequest,
  CoachResponse,
  InvestigationData,
  PeerReviewEvaluation,
  PeerReviewSubmission,
  StudentReflectionData,
  AdiWizardState,
} from "@/lib/domain/types";

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
  "revision",
  "reflection",
  "teacher_review",
  "completed",
]);

export const investigationDataSchema = z.object({
  question: z.string().max(4000).optional(),
  variables: z
    .object({
      independent: z.string().max(2000).optional(),
      dependent: z.string().max(2000).optional(),
      controlled: z.array(z.string().max(2000)).max(20).optional(),
    })
    .optional(),
  procedure: z.string().max(12_000).optional(),
  observations: z.string().max(12_000).optional(),
  dataTable: z.array(z.record(z.union([z.string(), z.number()]))).max(100).optional(),
  notes: z.string().max(12_000).optional(),
});

export const cerResponseSchema = z.object({
  claim: z.string().max(12_000),
  evidence: z.string().max(12_000),
  reasoning: z.string().max(12_000),
});

export const peerReviewScoresSchema = z.object({
  claim: z.number().int().min(1).max(5),
  evidence: z.number().int().min(1).max(5),
  reasoning: z.number().int().min(1).max(5),
});

export const peerReviewSubmissionSchema = z.object({
  id: z.string().min(1),
  submissionId: z.string().min(1),
  authorStudentId: z.string().min(1),
  activityId: z.string().min(1),
  anonymousAuthorAlias: z.string().min(1),
  content: cerResponseSchema,
  investigationData: investigationDataSchema.optional(),
  submittedAt: z.string(),
  isSynthetic: z.boolean().optional(),
  misconceptionTag: z.string().optional(),
});

export const peerReviewEvaluationSchema = z.object({
  id: z.string().min(1),
  peerReviewSubmissionId: z.string().optional(),
  submissionId: z.string().min(1),
  reviewerStudentId: z.string().min(1),
  authorStudentId: z.string().min(1),
  activityId: z.string().min(1),
  scores: peerReviewScoresSchema,
  strengths: z.string().min(1).max(4000),
  suggestions: z.string().min(1).max(4000),
  feedback: z.string().max(8000),
  createdAt: z.string(),
});

export const peerReviewInputSchema = z.object({
  studentId: z.string().min(1),
  activityId: z.string().min(1),
  submissionId: z.string().min(1),
  authorStudentId: z.string().optional(),
  peerReviewSubmissionId: z.string().optional(),
  scores: peerReviewScoresSchema,
  strengths: z.string().min(1).max(4000),
  suggestions: z.string().min(1).max(4000),
  feedback: z.string().max(8000).optional(),
});

export const studentReflectionDataSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  activityId: z.string().min(1),
  submissionId: z.string().optional(),
  conceptualLearning: z.string().max(8000).optional(),
  inquiryProcessReflection: z.string().max(8000).optional(),
  peerReviewExperience: z.string().max(8000).optional(),
  confidenceScore: z.number().int().min(1).max(5).optional(),
  keyTakeaway: z.string().max(4000).optional(),
  analyticalThinkingScore: z.number().min(1).max(5).optional(),
  aiLiteracyScore: z.number().min(1).max(5).optional(),
  reflectionText: z.string().max(8000).optional(),
  keyLearnings: z.array(z.string()).max(20).optional(),
  confidenceRating: z.enum(["low", "medium", "high"]).optional(),
  completedAt: z.string().optional(),
});

export const reflectionInputSchema = z.object({
  studentId: z.string().min(1),
  activityId: z.string().min(1),
  submissionId: z.string().optional(),
  conceptualLearning: z.string().max(8000).optional(),
  inquiryProcessReflection: z.string().max(8000).optional(),
  peerReviewExperience: z.string().max(8000).optional(),
  confidenceScore: z.number().int().min(1).max(5).optional(),
  keyTakeaway: z.string().max(4000).optional(),
  analyticalThinkingScore: z.number().min(1).max(5).optional(),
  aiLiteracyScore: z.number().min(1).max(5).optional(),
  reflectionText: z.string().max(8000).optional(),
  keyLearnings: z.array(z.string()).max(20).optional(),
  confidenceRating: z.enum(["low", "medium", "high"]).optional(),
});

export const adiWizardStateSchema = z.object({
  currentPhase: adiPhaseSchema,
  completedPhases: z.array(adiPhaseSchema),
  investigationData: investigationDataSchema.optional(),
  draftCer: cerResponseSchema.optional(),
  activeSubmissionId: z.string().optional(),
  peerReviewId: z.string().optional(),
  reflectionData: studentReflectionDataSchema.optional(),
});

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

export function parseInvestigationData(value: unknown): InvestigationData {
  return investigationDataSchema.parse(value);
}

export function parsePeerReviewSubmission(value: unknown): PeerReviewSubmission {
  return peerReviewSubmissionSchema.parse(value);
}

export function parsePeerReviewEvaluation(value: unknown): PeerReviewEvaluation {
  return peerReviewEvaluationSchema.parse(value);
}

export function parseStudentReflectionData(value: unknown): StudentReflectionData {
  return studentReflectionDataSchema.parse(value);
}

export function parseAdiWizardState(value: unknown): AdiWizardState {
  return adiWizardStateSchema.parse(value);
}

