import type {
  Activity,
  AiInteraction,
  AiSession,
  Classroom,
  Course,
  LearningEvent,
  PeerReview,
  Revision,
  Submission,
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
  listPeerReviews(submissionId?: string): PeerReview[];
}

export interface TeacherReviewRepository {
  addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): TeacherReview;
  listTeacherReviews(submissionId?: string): TeacherReview[];
}

export interface LearningEventRepository {
  append(event: LearningEvent): LearningEvent;
  list(studentId?: string, activityId?: string): LearningEvent[];
}
