import type {
  Activity,
  AiInteraction,
  AiSession,
  Classroom,
  Course,
  LearningEvent,
  PaorCycle,
  PeerReview,
  PeerReviewSubmission,
  Revision,
  StudentReflectionData,
  Submission,
  TeacherObservationNote,
  TeacherReview,
} from "@/lib/domain/types";

export interface CourseRepository {
  getCourse(courseId: string): Course | undefined;
  listCourses(schoolId: string): Course[];
}

export interface ActivityRepository {
  getActivity(activityId: string): Activity | undefined;
  listActivities(courseId: string): Activity[];
}

export interface ClassroomRepository {
  getClassroom(classId: string): Classroom | undefined;
}

export interface SubmissionRepository {
  addSubmission(input: Omit<Submission, "id" | "submittedAt">): Submission;
  getSubmission(submissionId: string): Submission | undefined;
  listSubmissions(studentId?: string, activityId?: string): Submission[];
  latestSubmission(studentId: string, activityId: string): Submission | undefined;
  updateSubmissionWorkflow(submissionId: string, workflowState: Submission["workflowState"]): Submission | undefined;
}

export interface RevisionRepository {
  addRevision(input: Omit<Revision, "id" | "createdAt">): Revision;
  listRevisions(submissionId: string): Revision[];
}

export interface AiSessionRepository {
  createSession(input: Omit<AiSession, "id" | "startedAt">): AiSession;
  addInteraction(input: Omit<AiInteraction, "id" | "createdAt">): AiInteraction;
  listInteractions(studentId: string, activityId?: string): AiInteraction[];
}

export interface PeerReviewRepository {
  addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): PeerReview;
  getPeerReview(peerReviewId: string): PeerReview | undefined;
  listPeerReviews(submissionId?: string, reviewerStudentId?: string): PeerReview[];
  addPeerReviewSubmission(input: Omit<PeerReviewSubmission, "id" | "submittedAt">): PeerReviewSubmission;
  listPeerReviewSubmissions(activityId?: string): PeerReviewSubmission[];
  getAssignedPeerReviewDraft(studentId: string, activityId: string): PeerReviewSubmission | undefined;
}

export interface ReflectionRepository {
  addReflection(input: Omit<StudentReflectionData, "completedAt">): StudentReflectionData;
  getReflection(studentId: string, activityId: string): StudentReflectionData | undefined;
  listReflections(studentId?: string, activityId?: string): StudentReflectionData[];
}

export interface TeacherReviewRepository {
  addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): TeacherReview;
  listTeacherReviews(submissionId?: string): TeacherReview[];
}

export interface TeacherObservationRepository {
  addTeacherObservationNote(input: Omit<TeacherObservationNote, "id" | "createdAt" | "updatedAt">): TeacherObservationNote;
  listTeacherObservationNotes(teacherId?: string, cycle?: PaorCycle, activityId?: string): TeacherObservationNote[];
}

export interface LearningEventRepository {
  append(event: LearningEvent): LearningEvent;
  list(studentId?: string, activityId?: string): LearningEvent[];
}

/** Async, request-scoped port used by API routes. */
export interface ScopedLearningRepository {
  getActivity(activityId: string): Promise<Activity | undefined>;
  listActivities(courseId: string): Promise<Activity[]>;
  addSubmission(input: Omit<Submission, "id" | "submittedAt">): Promise<Submission>;
  getSubmission(submissionId: string): Promise<Submission | undefined>;
  listSubmissions(studentId?: string, activityId?: string): Promise<Submission[]>;
  latestSubmission(studentId: string, activityId: string): Promise<Submission | undefined>;
  updateSubmissionWorkflow(submissionId: string, workflowState: Submission["workflowState"]): Promise<Submission | undefined>;
  addRevision(input: Omit<Revision, "id" | "createdAt">): Promise<Revision>;
  listRevisions(submissionId: string): Promise<Revision[]>;
  createSession(input: Omit<AiSession, "id" | "startedAt">): Promise<AiSession>;
  addInteraction(input: Omit<AiInteraction, "id" | "createdAt">): Promise<AiInteraction>;
  listInteractions(studentId: string, activityId?: string): Promise<AiInteraction[]>;
  addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): Promise<PeerReview>;
  listPeerReviews(submissionId?: string, reviewerStudentId?: string): Promise<PeerReview[]>;
  getAssignedPeerReviewDraft(studentId: string, activityId: string): Promise<PeerReviewSubmission | undefined>;
  addReflection(input: Omit<StudentReflectionData, "id" | "completedAt">): Promise<StudentReflectionData>;
  getReflection(studentId: string, activityId: string): Promise<StudentReflectionData | undefined>;
  listReflections(studentId?: string, activityId?: string): Promise<StudentReflectionData[]>;
  addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): Promise<TeacherReview>;
  listTeacherReviews(submissionId?: string): Promise<TeacherReview[]>;
  addTeacherObservationNote(input: Omit<TeacherObservationNote, "id" | "createdAt" | "updatedAt">): Promise<TeacherObservationNote>;
  listTeacherObservationNotes(teacherId?: string, cycle?: PaorCycle, activityId?: string): Promise<TeacherObservationNote[]>;
  appendLearningEvent(event: LearningEvent): Promise<LearningEvent>;
  listLearningEvents(studentId?: string, activityId?: string): Promise<LearningEvent[]>;
}
