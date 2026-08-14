import type {
  AiInteraction,
  AiSession,
  Classroom,
  Course,
  PeerReview,
  PeerReviewSubmission,
  Revision,
  StudentReflectionData,
  Submission,
  TeacherReview,
} from "@/lib/domain/types";
import { ecosystemActivities, getActivity } from "@/data/course/ecosystem/activities";
import type {
  ActivityRepository,
  AiSessionRepository,
  ClassroomRepository,
  CourseRepository,
  PeerReviewRepository,
  ReflectionRepository,
  RevisionRepository,
  SubmissionRepository,
  TeacherReviewRepository,
} from "@/lib/repository/interfaces";

const submissions: Submission[] = [];
const revisions: Revision[] = [];
const aiSessions: AiSession[] = [];
const aiInteractions: AiInteraction[] = [];
const peerReviews: PeerReview[] = [];
const teacherReviews: TeacherReview[] = [];
const reflections: StudentReflectionData[] = [];
const customPeerSubmissions: PeerReviewSubmission[] = [];

export const INITIAL_SYNTHETIC_PEER_SUBMISSIONS: PeerReviewSubmission[] = [
  {
    id: "synthetic-peer-draft-01",
    submissionId: "synthetic-sub-01",
    authorStudentId: "synthetic-student-101",
    activityId: "ecosystem-food-web-01",
    anonymousAuthorAlias: "คู่คิดวิทย์ ม.4 (รหัสนิรนาม #101)",
    isSynthetic: true,
    misconceptionTag: "energy_is_recycled",
    submittedAt: "2026-08-14T08:00:00.000Z",
    content: {
      claim: "เมื่องูลดลงอย่างมาก ประชากรหนูจะเพิ่มขึ้นอย่างไม่จำกัด และพลังงานจากงูที่ตายจะหมุนเวียนกลับไปเป็นสารอาหารให้หญ้าใช้สร้างพลังงานใหม่ได้ทั้งหมด 100%",
      evidence: "ในสายใยอาหาร หญ้า -> หนู -> งู เมื่อไม่มีผู้ล่าคอยจับกิน หนูจะสืบพันธุ์เพิ่มขึ้นเรื่อยๆ และเมื่อผู้บริโภคตาย ผู้ย่อยสลายจะเปลี่ยนซากให้เป็นพลังงานในดิน",
      reasoning: "พลังงานในระบบนิเวศเป็นวัฏจักรหมุนเวียนเหมือนวัฏจักรสาร พืชจึงสามารถนำพลังงานที่ถ่ายทอดไปแล้วกลับมาใช้ใหม่ในการสังเคราะห์ด้วยแสงได้ตลอดไป",
    },
    investigationData: {
      question: "การลดลงของงูส่งผลต่อห่วงโซ่อาหารและการถ่ายทอดพลังงานอย่างไร?",
      variables: {
        independent: "จำนวนประชากรงู",
        dependent: "จำนวนประชากรหนูและปริมาณพลังงานรวม",
        controlled: ["พื้นที่ระบบนิเวศ", "ชนิดของพืชผู้ผลิต"],
      },
      observations: "เมื่อจำลองการลดลงของงู พบว่าหนูกินหญ้ามากขึ้นอย่างรวดเร็ว",
    },
  },
  {
    id: "synthetic-peer-draft-02",
    submissionId: "synthetic-sub-02",
    authorStudentId: "synthetic-student-204",
    activityId: "ecosystem-energy-flow-01",
    anonymousAuthorAlias: "คู่คิดวิทย์ ม.4 (รหัสนิรนาม #204)",
    isSynthetic: true,
    misconceptionTag: "higher_trophic_accumulates_more_energy",
    submittedAt: "2026-08-14T08:30:00.000Z",
    content: {
      claim: "ผู้บริโภคลำดับที่สองได้รับและสะสมพลังงานได้มากกว่าผู้ผลิต เพราะกินผู้บริโภคลำดับก่อนหน้าหลายตัวจึงรวมพลังงานทั้งหมดเข้าด้วยกัน",
      evidence: "ตั๊กแตนกินหญ้าหลายต้น และกบกินตั๊กแตนวันละ 5-10 ตัว พลังงานของตั๊กแตนทุกตัวจึงส่งต่อเข้าไปรวมอยู่ในตัวกบทั้งหมด",
      reasoning: "ยิ่งอยู่ระดับบนของห่วงโซ่อาหาร สิ่งมีชีวิตต้องล่าเหยื่อจำนวนมาก ทำให้เกิดการสะสมพลังงานทวีคูณขึ้นเรื่อยๆ ตามลำดับขั้นการกิน",
    },
    investigationData: {
      question: "ปริมาณพลังงานในแต่ละลำดับขั้นการกิน (Trophic level) มีการเปลี่ยนแปลงอย่างไร?",
      variables: {
        independent: "ลำดับขั้นการกิน (ผู้ผลิต vs ผู้บริโภค)",
        dependent: "พลังงานรวม (kcal/m2/yr)",
      },
      observations: "บันทึกจำนวนสิ่งมีชีวิตในแต่ละลำดับขั้น",
    },
  },
  {
    id: "synthetic-peer-draft-03",
    submissionId: "synthetic-sub-03",
    authorStudentId: "synthetic-student-305",
    activityId: "ecosystem-food-web-01",
    anonymousAuthorAlias: "คู่คิดวิทย์ ม.4 (รหัสนิรนาม #305)",
    isSynthetic: true,
    misconceptionTag: "predator_prey_unlimited_growth",
    submittedAt: "2026-08-14T09:00:00.000Z",
    content: {
      claim: "เมื่องูลดลง ประชากรหนูจะเพิ่มขึ้นอย่างต่อเนื่องโดยไม่มีผลกระทบต่อสิ่งมีชีวิตอื่นในสายใยอาหาร",
      evidence: "หนูเป็นผู้บริโภคพืช เมื่อไม่มีศัตรูตามธรรมชาติ อัตราการรอดชีวิตของหนูจะสูงขึ้น",
      reasoning: "สายใยอาหารแต่ละเส้นแยกขาดจากกัน การลดลงของงูจึงมีผลเฉพาะคู่หนู-งูเท่านั้น ไม่กระทบต่อผู้ผลิตหรือผู้บริโภคอื่น",
    },
  },
];

const syntheticPeerSubmissions: PeerReviewSubmission[] = INITIAL_SYNTHETIC_PEER_SUBMISSIONS.map((item) => ({ ...item }));

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

export class InMemoryLearningRepository
  implements
    CourseRepository,
    ActivityRepository,
    ClassroomRepository,
    SubmissionRepository,
    RevisionRepository,
    AiSessionRepository,
    PeerReviewRepository,
    ReflectionRepository,
    TeacherReviewRepository
{
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
  getPeerReview(peerReviewId: string): PeerReview | undefined { return getPeerReview(peerReviewId); }
  listPeerReviews(submissionId?: string, reviewerStudentId?: string): PeerReview[] { return listPeerReviews(submissionId, reviewerStudentId); }
  addPeerReviewSubmission(input: Omit<PeerReviewSubmission, "id" | "submittedAt">): PeerReviewSubmission { return addPeerReviewSubmission(input); }
  listPeerReviewSubmissions(activityId?: string): PeerReviewSubmission[] { return listPeerReviewSubmissions(activityId); }
  getAssignedPeerReviewDraft(studentId: string, activityId: string): PeerReviewSubmission | undefined { return getAssignedPeerReviewDraft(studentId, activityId); }
  addReflection(input: Omit<StudentReflectionData, "id" | "completedAt">): StudentReflectionData { return addReflection(input); }
  getReflection(studentId: string, activityId: string): StudentReflectionData | undefined { return getReflection(studentId, activityId); }
  listReflections(studentId?: string, activityId?: string): StudentReflectionData[] { return listReflections(studentId, activityId); }
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

export function getPeerReview(peerReviewId: string): PeerReview | undefined {
  return peerReviews.find((review) => review.id === peerReviewId);
}

export function listPeerReviews(submissionId?: string, reviewerStudentId?: string): PeerReview[] {
  return peerReviews.filter(
    (review) =>
      (!submissionId || review.submissionId === submissionId || review.peerReviewSubmissionId === submissionId) &&
      (!reviewerStudentId || review.reviewerStudentId === reviewerStudentId),
  ).slice();
}

export function addPeerReviewSubmission(input: Omit<PeerReviewSubmission, "id" | "submittedAt">): PeerReviewSubmission {
  const record: PeerReviewSubmission = {
    ...input,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
  };
  customPeerSubmissions.push(record);
  return record;
}

export function listPeerReviewSubmissions(activityId?: string): PeerReviewSubmission[] {
  const combined = [...customPeerSubmissions, ...syntheticPeerSubmissions];
  return combined.filter((item) => !activityId || item.activityId === activityId).slice();
}

export function getAssignedPeerReviewDraft(studentId: string, activityId: string): PeerReviewSubmission | undefined {
  const reviewsByStudent = peerReviews.filter((r) => r.reviewerStudentId === studentId);
  const reviewedSubIds = new Set(reviewsByStudent.map((r) => r.submissionId || r.peerReviewSubmissionId));

  // 1. Check real student submissions in pool
  const realCandidate = submissions.find(
    (sub) =>
      sub.activityId === activityId &&
      sub.studentId !== studentId &&
      sub.workflowState !== "draft" &&
      !reviewedSubIds.has(sub.id),
  );

  if (realCandidate) {
    const aliasIndex = submissions.filter((s) => s.activityId === activityId && s.id <= realCandidate.id).length;
    return {
      id: `real-peer-draft-${realCandidate.id}`,
      submissionId: realCandidate.id,
      authorStudentId: realCandidate.studentId,
      activityId: realCandidate.activityId,
      anonymousAuthorAlias: `เพื่อนร่วมชั้นนิรนาม #${aliasIndex}`,
      content: realCandidate.content,
      submittedAt: realCandidate.submittedAt,
      isSynthetic: false,
    };
  }

  // 2. Check custom submitted peer drafts
  const customCandidate = customPeerSubmissions.find(
    (draft) =>
      draft.activityId === activityId &&
      draft.authorStudentId !== studentId &&
      !reviewedSubIds.has(draft.submissionId) &&
      !reviewedSubIds.has(draft.id),
  );
  if (customCandidate) return customCandidate;

  // 3. Fallback to synthetic pre-seeded pool
  const matchingSynthetic = syntheticPeerSubmissions.filter((draft) => draft.activityId === activityId);
  const unreviewedSynthetic = matchingSynthetic.find(
    (draft) => !reviewedSubIds.has(draft.submissionId) && !reviewedSubIds.has(draft.id),
  );

  if (unreviewedSynthetic) return unreviewedSynthetic;
  if (matchingSynthetic.length > 0) return matchingSynthetic[0];

  return syntheticPeerSubmissions[0];
}

export const getPeerReviewDraftForReviewer = getAssignedPeerReviewDraft;

export function listPeerReviewsForAuthor(authorStudentId: string, activityId?: string): PeerReview[] {
  return peerReviews.filter((r) => r.authorStudentId === authorStudentId && (!activityId || r.activityId === activityId)).slice();
}

export function listPeerReviewsByReviewer(reviewerStudentId: string, activityId?: string): PeerReview[] {
  return peerReviews.filter((r) => r.reviewerStudentId === reviewerStudentId && (!activityId || r.activityId === activityId)).slice();
}


export function addReflection(input: Omit<StudentReflectionData, "completedAt">): StudentReflectionData {
  const existingIndex = reflections.findIndex((r) => r.studentId === input.studentId && r.activityId === input.activityId);
  const record: StudentReflectionData = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    reflections[existingIndex] = record;
  } else {
    reflections.push(record);
  }
  return record;
}

export function getReflection(studentId: string, activityId: string): StudentReflectionData | undefined {
  return reflections.find((r) => r.studentId === studentId && r.activityId === activityId);
}

export function listReflections(studentId?: string, activityId?: string): StudentReflectionData[] {
  return reflections.filter(
    (r) => (!studentId || r.studentId === studentId) && (!activityId || r.activityId === activityId),
  ).slice();
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
  reflections.length = 0;
  customPeerSubmissions.length = 0;
  syntheticPeerSubmissions.length = 0;
  syntheticPeerSubmissions.push(...INITIAL_SYNTHETIC_PEER_SUBMISSIONS.map((item) => ({ ...item })));
}

export const learningRepository = new InMemoryLearningRepository();

