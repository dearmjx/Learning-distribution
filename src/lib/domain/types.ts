export type AdiPhase =
  | "orientation"
  | "identification"
  | "investigation"
  | "argument"
  | "peer_review"
  | "revision"
  | "reflection";

export type LearningRole = "student" | "teacher" | "system" | "researcher";
export type LearningLanguage = "th" | "en";

export type AdiWorkflowState =
  | "draft"
  | "submitted"
  | "ai_feedback_received"
  | "revising"
  | "peer_review"
  | "revision"
  | "reflection"
  | "teacher_review"
  | "completed";

export interface InvestigationData {
  question?: string;
  variables?: {
    independent?: string;
    dependent?: string;
    controlled?: string[];
  };
  procedure?: string;
  observations?: string;
  dataTable?: Array<Record<string, string | number>>;
  notes?: string;
}

export interface PeerReviewScores {
  claim: number;
  evidence: number;
  reasoning: number;
}

export interface PeerReviewSubmission {
  id: string;
  submissionId: string;
  authorStudentId: string;
  activityId: string;
  anonymousAuthorAlias: string;
  content: CerResponse;
  investigationData?: InvestigationData;
  submittedAt: string;
  isSynthetic?: boolean;
  misconceptionTag?: string;
}

export interface PeerReview {
  id: string;
  submissionId: string;
  reviewerStudentId: string;
  authorStudentId: string;
  feedback: string;
  createdAt: string;
  activityId?: string;
  peerReviewSubmissionId?: string;
  scores?: PeerReviewScores;
  strengths?: string;
  suggestions?: string;
}

export interface PeerReviewEvaluation {
  id: string;
  peerReviewSubmissionId?: string;
  submissionId: string;
  reviewerStudentId: string;
  authorStudentId: string;
  activityId: string;
  scores: PeerReviewScores;
  strengths: string;
  suggestions: string;
  feedback: string;
  createdAt: string;
}

export interface StudentReflectionData {
  id?: string;
  studentId: string;
  activityId: string;
  submissionId?: string;
  analyticalThinkingScore?: number;
  aiLiteracyScore?: number;
  reflectionText?: string;
  keyLearnings?: string[];
  confidenceRating?: "low" | "medium" | "high";
  conceptualLearning?: string;
  inquiryProcessReflection?: string;
  peerReviewExperience?: string;
  confidenceScore?: number;
  keyTakeaway?: string;
  completedAt?: string;
}


export interface AdiWizardState {
  currentPhase: AdiPhase;
  completedPhases: AdiPhase[];
  investigationData?: InvestigationData;
  draftCer?: CerResponse;
  activeSubmissionId?: string;
  peerReviewId?: string;
  reflectionData?: StudentReflectionData;
}

export interface LearningContext {
  schoolId: string;
  courseId: string;
  classId: string;
  activityId?: string;
  studentId?: string;
  teacherId?: string;
  adiPhase: AdiPhase;
  role: LearningRole;
  language: LearningLanguage;
  permissions: string[];
  traceId: string;
  correlationId: string;
}

export type HintDepth = "none" | "shallow" | "concept" | "deep";
export type AuthorshipStatus = "none" | "observe" | "teacher_review";

export type RubricDimension = "claim" | "evidence" | "reasoning";

export interface Activity {
  id: string;
  courseId: string;
  unit: string;
  title: string;
  adiPhase: AdiPhase;
  prompt: string;
  context: string;
  rubricDimensions: RubricDimension[];
  peerReviewAllowed: boolean;
}

export interface Course {
  id: string;
  schoolId: string;
  title: string;
  language: LearningLanguage;
  teacherIds: string[];
}

export interface Classroom {
  id: string;
  schoolId: string;
  courseId: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
}

export interface CerResponse {
  claim: string;
  evidence: string;
  reasoning: string;
}

export interface Submission {
  id: string;
  studentId: string;
  activityId: string;
  content: CerResponse;
  version: number;
  submittedAt: string;
  hintDepth: HintDepth;
  hintCost: number;
  responseTimeSeconds: number;
  workflowState: AdiWorkflowState;
  previousDraftId?: string;
}

export interface Revision {
  id: string;
  submissionId: string;
  studentId: string;
  activityId: string;
  version: number;
  content: CerResponse;
  createdAt: string;
}

export interface AiSession {
  id: string;
  studentId: string;
  activityId: string;
  context: LearningContext;
  provider: CoachResponse["provider"];
  startedAt: string;
  endedAt?: string;
}

export interface AiInteraction {
  id: string;
  sessionId: string;
  studentId: string;
  activityId: string;
  request: CoachRequest;
  response?: CoachResponse;
  fallbackUsed: boolean;
  createdAt: string;
}

export interface PeerReview {
  id: string;
  submissionId: string;
  reviewerStudentId: string;
  authorStudentId: string;
  feedback: string;
  createdAt: string;
}

export interface TeacherReview {
  id: string;
  submissionId: string;
  teacherId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface AuthorshipIndicators {
  revisionCount: number;
  responseTimeSeconds: number;
  copySimilarityToPrompt: number;
  followUpResponseQuality?: number;
  status: AuthorshipStatus;
  teacherReviewOnly: true;
  reasons: string[];
}

export interface CoachRequest {
  requestId: string;
  context: LearningContext;
  activity: Activity;
  approvedContext: string;
  cer: CerResponse;
  hintDepth: HintDepth;
  currentAdiPhase: AdiPhase;
}

export interface CoachResponse {
  requestId: string;
  provider: "mock" | "local" | "deepseek" | "fallback";
  message: string;
  targetDimension: RubricDimension;
  hintDepth: HintDepth;
  hintCost: number;
  citations: string[];
  directAnswerBlocked: true;
  fallbackUsed: boolean;
  safetyFlags: string[];
}

export type CoachFeedback = CoachResponse;

export type LearningEventType =
  | "activity_selected"
  | "context_viewed"
  | "student_submitted"
  | "ai_feedback_received"
  | "hint_requested"
  | "student_revised"
  | "peer_review_assigned"
  | "peer_review_submitted"
  | "teacher_reviewed"
  | "reflection_completed"
  | "learning_phase_changed"
  | "authorship_indicator_created";

export interface LearningEventActor {
  type: "student" | "teacher" | "system" | "researcher";
  id: string;
}

export interface LearningEvent {
  id: string;
  schemaVersion: 1;
  context: LearningContext;
  actor: LearningEventActor;
  studentId: string;
  activityId: string;
  eventType: LearningEventType;
  payload: Record<string, unknown>;
  correlationId: string;
  occurredAt: string;
  createdAt: string;
}

export interface AnalyzeSubmissionInput {
  studentId: string;
  activityId: string;
  content: CerResponse;
  hintDepth: HintDepth;
  responseTimeSeconds: number;
  requestId?: string;
  context?: LearningContext;
}
