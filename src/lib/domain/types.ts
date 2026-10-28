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

export type PaorCycle = 1 | 2;

export interface FeedbackDecision {
  id?: string;
  interactionId?: string;
  feedbackItem: string;
  source: "ai_coach" | "peer" | "system";
  status: "accept" | "reject" | "modify";
  justificationText: string;
  createdAt?: string;
}

export interface SyntheticThinkingRubricScores {
  selectingInfo: number; // 1-4 (การเลือกสรรข้อมูลที่เกี่ยวข้อง)
  connectingInfo: number; // 1-4 (การเชื่อมโยงความสัมพันธ์ของข้อมูล)
  reconstructingLanguage: number; // 1-4 (การสังเคราะห์/จัดโครงสร้างใหม่ด้วยภาษาตนเอง)
  directAnswering: number; // 1-4 (การตอบตรงประเด็นและสมเหตุสมผล)
}

export interface TeacherObservationNote {
  id: string;
  teacherId: string;
  classId: string;
  cycle: PaorCycle;
  activityId: string;
  phase: "plan" | "act" | "observe" | "reflect";
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Teacher-controlled class countdown. `endsAt` is set only while running; otherwise `remainingSeconds` holds the time left. */
export interface ClassTimer {
  classId: string;
  label: string;
  durationSeconds: number;
  endsAt: string | null;
  remainingSeconds: number;
  updatedAt: string;
  updatedBy: string;
}

export interface LearningContext {
  schoolId: string;
  courseId: string;
  classId: string;
  activityId?: string;
  studentId?: string;
  teacherId?: string;
  cycle?: PaorCycle;
  adiPhase: AdiPhase;
  role: LearningRole;
  language: LearningLanguage;
  permissions: string[];
  traceId: string;
  correlationId: string;
}

export type HintDepth = "none" | "shallow" | "concept" | "deep";
export type AuthorshipStatus = "none" | "observe" | "teacher_review";

export type RubricDimension =
  | "claim"
  | "evidence"
  | "reasoning"
  | "selecting_info"
  | "connecting_info"
  | "reconstructing_language"
  | "direct_answering";

export interface Activity {
  id: string;
  courseId: string;
  /** Course pack version the teacher approved; optional for legacy database rows. */
  contentVersion?: string;
  unit: string;
  /** Stable key used to isolate RAG retrieval to one chapter. */
  chapterId?: string;
  title: string;
  adiPhase: AdiPhase;
  prompt: string;
  context: string;
  rubricDimensions: RubricDimension[];
  peerReviewAllowed: boolean;
  cycle?: PaorCycle;
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
  idempotencyKey?: string;
  cycle?: PaorCycle;
  draft1Frozen?: boolean;
  draft1FrozenAt?: string;
  feedbackDecisions?: FeedbackDecision[];
  /** Class the submission was made in (set by the persistence layer). */
  classId?: string;
}

export interface Revision {
  id: string;
  submissionId: string;
  studentId: string;
  activityId: string;
  version: number;
  content: CerResponse;
  createdAt: string;
  idempotencyKey?: string;
  cycle?: PaorCycle;
  draft1Frozen?: boolean;
  draft1FrozenAt?: string;
  feedbackDecisions?: FeedbackDecision[];
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

export interface TeacherReviewRubricScores {
  // Generic CER
  claim?: number;
  evidence?: number;
  reasoning?: number;
  // 4 Dimensions of Synthetic Thinking (CAR standard)
  selectingInfo?: number; // 1-4
  connectingInfo?: number; // 1-4
  reconstructingLanguage?: number; // 1-4
  directAnswering?: number; // 1-4
}

export interface TeacherReview {
  id: string;
  submissionId: string;
  teacherId: string;
  score: number;
  comment: string;
  rubricScores?: TeacherReviewRubricScores;
  syntheticScores?: SyntheticThinkingRubricScores;
  createdAt: string;
  cycle?: PaorCycle;
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
  /** Stable prompt identifier used to compare teacher-reviewed Coach evaluations. */
  promptVersion?: string;
  provider: "mock" | "local" | "deepseek" | "fallback";
  message: string;
  targetDimension: RubricDimension;
  hintDepth: HintDepth;
  hintCost: number;
  citations: string[];
  directAnswerBlocked: true;
  fallbackUsed: boolean;
  safetyFlags: string[];
  telemetry?: import("@/lib/ai/provider").LlmTelemetry;
}

export type CoachFeedback = CoachResponse;

export type LearningEventType =
  | "activity_selected"
  | "context_viewed"
  | "student_submitted"
  | "draft_1_frozen"
  | "ai_feedback_received"
  | "hint_requested"
  | "student_revised"
  | "peer_review_assigned"
  | "peer_review_submitted"
  | "feedback_evaluated"
  | "teacher_reviewed"
  | "teacher_observation_recorded"
  | "reflection_completed"
  | "learning_phase_changed"
  | "wizard_progress_saved"
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
  idempotencyKey?: string;
  cycle?: PaorCycle;
}

export interface AnalyzeSubmissionInput {
  studentId: string;
  activityId: string;
  content: CerResponse;
  hintDepth: HintDepth;
  responseTimeSeconds: number;
  requestId?: string;
  context?: LearningContext;
  draft1Frozen?: boolean;
  feedbackDecisions?: FeedbackDecision[];
}

export interface RosterStudentProgress {
  studentId: string;
  studentName: string;
  activityId: string;
  currentPhase: AdiPhase;
  workflowState: AdiWorkflowState;
  submissionCount: number;
  revisionCount: number;
  hintCount: number;
  peerReviewCompleted: boolean;
  teacherScore?: number;
  lastActiveAt: string;
  cycle?: PaorCycle;
}

export interface ClassRosterSummary {
  classId: string;
  className: string;
  courseTitle: string;
  totalStudents: number;
  activeActivityId: string;
  students: RosterStudentProgress[];
  cycle?: PaorCycle;
}
