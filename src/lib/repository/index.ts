import type {
  ClassTimer,
  Activity,
  AiInteraction,
  AiSession,
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
import { DEMO_SCOPE } from "@/lib/context/learning-context";
import type { ResolvedLearningIdentity } from "@/lib/auth/supabase-identity";
import type { ScopedLearningRepository } from "@/lib/repository/interfaces";
import * as memory from "@/lib/repository/memory-repository";
import { learningEventStore } from "@/lib/events/event-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseRepository } from "@/lib/repository/supabase-repository";

export type PersistenceMode = "memory" | "supabase";

export function getPersistenceMode(): PersistenceMode {
  return process.env.LEARNING_PERSISTENCE?.toLowerCase() === "supabase" ? "supabase" : "memory";
}

export function getPersistenceStatus(): { mode: PersistenceMode; configured: boolean } {
  if (getPersistenceMode() === "memory") {
    // In-memory mode is useful for local development and synthetic demos, but
    // it is never a ready persistence target for production student work.
    return { mode: "memory", configured: process.env.NODE_ENV !== "production" };
  }
  return {
    mode: "supabase",
    configured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ),
  };
}

function assertLocalClassScope(classId: string): void {
  if (classId !== DEMO_SCOPE.classId) throw new Error("Learning class scope is not available in local memory mode");
}

class MemoryScopedLearningRepository implements ScopedLearningRepository {
  constructor(private readonly identity: ResolvedLearningIdentity) {
    assertLocalClassScope(identity.context.classId);
  }

  private studentId(requested?: string): string {
    if (this.identity.context.role !== "student" || !this.identity.context.studentId) throw new Error("Student scope required");
    if (requested && requested !== this.identity.context.studentId) throw new Error("Learning scope denied: student identity is controlled by the server");
    return this.identity.context.studentId;
  }

  async getActivity(activityId: string): Promise<Activity | undefined> { return memory.learningRepository.getActivity(activityId); }
  async listActivities(courseId: string): Promise<Activity[]> { return memory.learningRepository.listActivities(courseId); }
  async addSubmission(input: Omit<Submission, "id" | "submittedAt">): Promise<Submission> {
    return memory.addSubmission({ ...input, studentId: this.studentId(input.studentId) });
  }
  async getSubmission(submissionId: string): Promise<Submission | undefined> { return memory.getSubmission(submissionId); }
  async listSubmissions(studentId?: string, activityId?: string): Promise<Submission[]> {
    return memory.listSubmissions(this.identity.context.role === "student" ? this.studentId(studentId) : studentId, activityId);
  }
  async latestSubmission(studentId: string, activityId: string): Promise<Submission | undefined> {
    return memory.latestSubmission(this.studentId(studentId), activityId);
  }
  async updateSubmissionWorkflow(submissionId: string, workflowState: Submission["workflowState"]): Promise<Submission | undefined> {
    const submission = memory.getSubmission(submissionId);
    if (submission && this.identity.context.role === "student") this.studentId(submission.studentId);
    return memory.updateSubmissionWorkflow(submissionId, workflowState);
  }
  async addRevision(input: Omit<Revision, "id" | "createdAt">): Promise<Revision> {
    return memory.addRevision({ ...input, studentId: this.studentId(input.studentId) });
  }
  async listRevisions(submissionId: string): Promise<Revision[]> { return memory.listRevisions(submissionId); }
  async createSession(input: Omit<AiSession, "id" | "startedAt">): Promise<AiSession> {
    return memory.createAiSession({ ...input, studentId: this.studentId(input.studentId) });
  }
  async addInteraction(input: Omit<AiInteraction, "id" | "createdAt">): Promise<AiInteraction> {
    return memory.addAiInteraction({ ...input, studentId: this.studentId(input.studentId) });
  }
  async listInteractions(studentId: string, activityId?: string): Promise<AiInteraction[]> {
    return memory.listAiInteractions(this.identity.context.role === "student" ? this.studentId(studentId) : studentId, activityId);
  }
  async addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): Promise<PeerReview> {
    return memory.addPeerReview({ ...input, reviewerStudentId: this.studentId(input.reviewerStudentId) });
  }
  async listPeerReviews(submissionId?: string, reviewerStudentId?: string): Promise<PeerReview[]> {
    return memory.listPeerReviews(submissionId, this.identity.context.role === "student" ? this.studentId(reviewerStudentId) : reviewerStudentId);
  }
  async listConsentedStudentIds(_purpose: string): Promise<string[] | null> {
    // Memory mode holds synthetic demo data only; consent is enforced in Supabase mode.
    return null;
  }
  async listReceivedPeerReviews(activityId: string): Promise<PeerReview[]> {
    const authorId = this.studentId();
    return memory
      .listPeerReviews()
      .filter((review) => review.authorStudentId === authorId && (!review.activityId || review.activityId === activityId))
      .map((review) => ({ ...review, reviewerStudentId: "เพื่อนร่วมชั้น (ไม่ระบุชื่อ)" }));
  }
  async getAssignedPeerReviewDraft(studentId: string, activityId: string): Promise<PeerReviewSubmission | undefined> {
    return memory.getAssignedPeerReviewDraft(this.studentId(studentId), activityId);
  }
  async addReflection(input: Omit<StudentReflectionData, "id" | "completedAt">): Promise<StudentReflectionData> {
    return memory.addReflection({ ...input, studentId: this.studentId(input.studentId) });
  }
  async getReflection(studentId: string, activityId: string): Promise<StudentReflectionData | undefined> {
    return memory.getReflection(this.studentId(studentId), activityId);
  }
  async listReflections(studentId?: string, activityId?: string): Promise<StudentReflectionData[]> {
    return memory.listReflections(this.identity.context.role === "student" ? this.studentId(studentId) : studentId, activityId);
  }
  async addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): Promise<TeacherReview> {
    if (this.identity.context.role !== "teacher" || !this.identity.context.teacherId) throw new Error("Teacher scope required");
    return memory.addTeacherReview({ ...input, teacherId: this.identity.context.teacherId });
  }
  async listTeacherReviews(submissionId?: string): Promise<TeacherReview[]> { return memory.listTeacherReviews(submissionId); }
  async addTeacherObservationNote(input: Omit<TeacherObservationNote, "id" | "createdAt" | "updatedAt">): Promise<TeacherObservationNote> {
    if (this.identity.context.role !== "teacher" || !this.identity.context.teacherId) throw new Error("Teacher scope required");
    return memory.addTeacherObservationNote({ ...input, teacherId: this.identity.context.teacherId, classId: this.identity.context.classId });
  }
  async listTeacherObservationNotes(teacherId?: string, cycle?: PaorCycle, activityId?: string): Promise<TeacherObservationNote[]> {
    if (this.identity.context.role !== "teacher" || !this.identity.context.teacherId) throw new Error("Teacher scope required");
    return memory.listTeacherObservationNotes(teacherId, cycle, activityId);
  }
  async getClassTimer(): Promise<ClassTimer | undefined> {
    return memory.getClassTimer(this.identity.context.classId);
  }
  async saveClassTimer(input: Pick<ClassTimer, "label" | "durationSeconds" | "endsAt" | "remainingSeconds">): Promise<ClassTimer> {
    if (this.identity.context.role !== "teacher" || !this.identity.context.teacherId) throw new Error("Teacher scope required");
    return memory.saveClassTimer({
      ...input,
      classId: this.identity.context.classId,
      updatedAt: new Date().toISOString(),
      updatedBy: this.identity.context.teacherId,
    });
  }
  async appendLearningEvent(event: LearningEvent): Promise<LearningEvent> {
    if (this.identity.context.role === "student") this.studentId(event.studentId);
    return learningEventStore.append(event);
  }
  async listLearningEvents(studentId?: string, activityId?: string): Promise<LearningEvent[]> {
    return learningEventStore.list({
      studentId: this.identity.context.role === "student" ? this.studentId(studentId) : studentId,
      activityId,
      limit: 10_000,
    });
  }
}

export async function getLearningRepository(identity: ResolvedLearningIdentity): Promise<ScopedLearningRepository> {
  if (getPersistenceMode() === "memory") return new MemoryScopedLearningRepository(identity);
  const status = getPersistenceStatus();
  if (!status.configured) throw new Error("Supabase persistence is configured but its public URL/key is missing");
  const client = await getSupabaseServerClient();
  if (!client) throw new Error("Supabase server client could not be created");
  return new SupabaseRepository(client, { context: identity.context, profileId: identity.profileId });
}

export { MemoryScopedLearningRepository };
export * from "@/lib/repository/interfaces";
