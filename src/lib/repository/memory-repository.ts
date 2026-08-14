import type {
  AiInteraction,
  AiSession,
  Classroom,
  Course,
  PeerReview,
  Revision,
  Submission,
  TeacherReview,
} from "@/lib/domain/types";
import { ecosystemActivities, getActivity } from "@/data/course/ecosystem/activities";
import type { ActivityRepository, AiSessionRepository, ClassroomRepository, CourseRepository, PeerReviewRepository, RevisionRepository, SubmissionRepository, TeacherReviewRepository } from "@/lib/repository/interfaces";

const submissions: Submission[] = [];
const revisions: Revision[] = [];
const aiSessions: AiSession[] = [];
const aiInteractions: AiInteraction[] = [];
const peerReviews: PeerReview[] = [];
const teacherReviews: TeacherReview[] = [];

const courses: Course[] = [{
  id: "biology-m4",
  schoolId: "demo-school-01",
  title: "ชีววิทยา ม.4: ระบบนิเวศ",
  language: "th",
  teacherIds: ["demo-teacher-01"],
}];

const classrooms: Classroom[] = [{
  id: "biology-m4-class-a",
  schoolId: "demo-school-01",
  courseId: "biology-m4",
  name: "ชีววิทยา ม.4 ห้อง A",
  teacherIds: ["demo-teacher-01"],
  studentIds: ["demo-student-01"],
}];

export class InMemoryLearningRepository implements CourseRepository, ActivityRepository, ClassroomRepository, SubmissionRepository, RevisionRepository, AiSessionRepository, PeerReviewRepository, TeacherReviewRepository {
  getCourse(courseId: string): Course | undefined { return courses.find((course) => course.id === courseId); }
  listCourses(schoolId: string): Course[] { return courses.filter((course) => course.schoolId === schoolId); }
  getActivity(activityId: string) { return getActivity(activityId); }
  listActivities(courseId: string) { return ecosystemActivities.filter((activity) => activity.courseId === courseId); }
  getClassroom(classId: string): Classroom | undefined { return classrooms.find((classroom) => classroom.id === classId); }
  addSubmission(input: Omit<Submission, "id" | "submittedAt">): Submission { return addSubmission(input); }
  getSubmission(submissionId: string): Submission | undefined { return submissions.find((submission) => submission.id === submissionId); }
  listSubmissions(studentId?: string, activityId?: string): Submission[] { return listSubmissions(studentId, activityId); }
  latestSubmission(studentId: string, activityId: string): Submission | undefined { return latestSubmission(studentId, activityId); }
  addRevision(input: Omit<Revision, "id" | "createdAt">): Revision { return addRevision(input); }
  listRevisions(submissionId: string): Revision[] { return listRevisions(submissionId); }
  createSession(input: Omit<AiSession, "id" | "startedAt">): AiSession { return createAiSession(input); }
  addInteraction(input: Omit<AiInteraction, "id" | "createdAt">): AiInteraction { return addAiInteraction(input); }
  listInteractions(studentId: string, activityId?: string): AiInteraction[] { return listAiInteractions(studentId, activityId); }
  addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): PeerReview { return addPeerReview(input); }
  listPeerReviews(submissionId?: string): PeerReview[] { return listPeerReviews(submissionId); }
  addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): TeacherReview { return addTeacherReview(input); }
  listTeacherReviews(submissionId?: string): TeacherReview[] { return listTeacherReviews(submissionId); }
}

export function addSubmission(
  submission: Omit<Submission, "id" | "submittedAt">,
): Submission {
  const record: Submission = {
    ...submission,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
  };
  submissions.push(record);
  return record;
}

export function getSubmission(submissionId: string): Submission | undefined {
  return submissions.find((submission) => submission.id === submissionId);
}

export function addRevision(input: Omit<Revision, "id" | "createdAt">): Revision {
  const record: Revision = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  revisions.push(record);
  return record;
}

export function listRevisions(submissionId: string): Revision[] {
  return revisions.filter((revision) => revision.submissionId === submissionId).slice();
}

export function createAiSession(input: Omit<AiSession, "id" | "startedAt">): AiSession {
  const record: AiSession = { ...input, id: crypto.randomUUID(), startedAt: new Date().toISOString() };
  aiSessions.push(record);
  return record;
}

export const addAiSession = createAiSession;

export function addAiInteraction(input: Omit<AiInteraction, "id" | "createdAt">): AiInteraction {
  const record: AiInteraction = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  aiInteractions.push(record);
  return record;
}

export function listAiInteractions(studentId: string, activityId?: string): AiInteraction[] {
  return aiInteractions.filter((interaction) => interaction.studentId === studentId && (!activityId || interaction.activityId === activityId)).slice();
}

export function addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): PeerReview {
  const record: PeerReview = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  peerReviews.push(record);
  return record;
}

export function listPeerReviews(submissionId?: string): PeerReview[] {
  return peerReviews.filter((review) => !submissionId || review.submissionId === submissionId).slice();
}

export function addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): TeacherReview {
  const record: TeacherReview = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  teacherReviews.push(record);
  return record;
}

export function listTeacherReviews(submissionId?: string): TeacherReview[] {
  return teacherReviews.filter((review) => !submissionId || review.submissionId === submissionId).slice();
}

export function listSubmissions(studentId?: string, activityId?: string): Submission[] {
  return submissions.filter(
    (submission) =>
      (!studentId || submission.studentId === studentId) &&
      (!activityId || submission.activityId === activityId),
  );
}

export function latestSubmission(studentId: string, activityId: string): Submission | undefined {
  return listSubmissions(studentId, activityId).at(-1);
}

export function clearMemoryRepositoriesForTests(): void {
  submissions.length = 0;
  revisions.length = 0;
  aiSessions.length = 0;
  aiInteractions.length = 0;
  peerReviews.length = 0;
  teacherReviews.length = 0;
}

export const learningRepository = new InMemoryLearningRepository();
