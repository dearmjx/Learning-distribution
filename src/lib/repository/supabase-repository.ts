import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Activity,
  AiInteraction,
  AiSession,
  LearningContext,
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
import type { Database, Json } from "@/lib/supabase/types";
import type { ScopedLearningRepository } from "@/lib/repository/interfaces";

export interface SupabaseRepositoryScope {
  context: LearningContext;
  profileId?: string;
}

function assertStudentScope(scope: SupabaseRepositoryScope, studentId: string | undefined): void {
  if (scope.context.role === "student" && studentId && studentId !== scope.context.studentId) {
    throw new Error("Learning scope denied: student identity is controlled by the authenticated session");
  }
}

function mapSubmission(data: Database["public"]["Tables"]["submissions"]["Row"]): Submission {
  return {
    id: data.id,
    studentId: data.student_id,
    activityId: data.activity_id,
    version: data.version,
    content: data.content,
    hintDepth: data.hint_depth,
    hintCost: data.hint_cost,
    responseTimeSeconds: data.response_time_seconds,
    workflowState: data.workflow_state as Submission["workflowState"],
    previousDraftId: data.previous_draft_id ?? undefined,
    submittedAt: data.submitted_at,
    idempotencyKey: data.idempotency_key ?? undefined,
    cycle: data.cycle ?? undefined,
    draft1Frozen: data.draft1_frozen ?? undefined,
    draft1FrozenAt: data.draft1_frozen_at ?? undefined,
    feedbackDecisions: data.feedback_decisions ?? undefined,
  };
}

function mapRevision(data: Database["public"]["Tables"]["revisions"]["Row"]): Revision {
  return {
    id: data.id,
    submissionId: data.submission_id,
    studentId: data.student_id,
    activityId: data.activity_id,
    version: data.version,
    content: data.content,
    createdAt: data.created_at,
    idempotencyKey: data.idempotency_key ?? undefined,
    cycle: data.cycle ?? undefined,
    draft1Frozen: data.draft1_frozen ?? undefined,
    draft1FrozenAt: data.draft1_frozen_at ?? undefined,
    feedbackDecisions: data.feedback_decisions ?? undefined,
  };
}

function mapTeacherReview(data: Database["public"]["Tables"]["teacher_reviews"]["Row"]): TeacherReview {
  return {
    id: data.id,
    submissionId: data.submission_id,
    teacherId: data.teacher_id,
    score: Number(data.final_score),
    comment: data.feedback,
    rubricScores: data.rubric_scores ?? undefined,
    syntheticScores: data.synthetic_scores ?? undefined,
    cycle: data.cycle ?? undefined,
    createdAt: data.created_at,
  };
}

function mapTeacherObservationNote(
  data: Database["public"]["Tables"]["teacher_observation_notes"]["Row"],
): TeacherObservationNote {
  return {
    id: data.id,
    teacherId: data.teacher_id,
    classId: data.class_id,
    cycle: data.cycle,
    activityId: data.activity_id,
    phase: data.phase,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapPeerReview(data: Database["public"]["Tables"]["peer_reviews"]["Row"]): PeerReview {
  return {
    id: data.id,
    submissionId: data.submission_id,
    peerReviewSubmissionId: data.peer_review_submission_id ?? undefined,
    reviewerStudentId: data.reviewer_student_id,
    authorStudentId: data.author_student_id,
    activityId: data.activity_id,
    scores: data.scores,
    strengths: data.strengths,
    suggestions: data.suggestions,
    feedback: data.feedback,
    createdAt: data.created_at,
  };
}

function mapEvent(data: Database["public"]["Tables"]["learning_events"]["Row"]): LearningEvent {
  return {
    id: data.id,
    schemaVersion: 1,
    context: data.context as unknown as LearningContext,
    actor: data.actor as unknown as LearningEvent["actor"],
    studentId: data.student_id,
    activityId: data.activity_id,
    eventType: data.event_type as LearningEvent["eventType"],
    payload: data.payload,
    correlationId: data.correlation_id,
    occurredAt: data.occurred_at,
    createdAt: data.created_at,
    idempotencyKey: data.idempotency_key ?? undefined,
    cycle: data.cycle ?? undefined,
  };
}

/** RLS-backed education repository. It never falls back to memory. */
export class SupabaseRepository implements ScopedLearningRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly scope: SupabaseRepositoryScope,
  ) {}

  async getActivity(activityId: string): Promise<Activity | undefined> {
    const { data, error } = await this.client.from("activities").select().eq("id", activityId).maybeSingle();
    if (error) throw new Error(`Supabase activity lookup failed: ${error.message}`);
    return data
      ? {
          id: data.id,
          courseId: data.course_id,
          unit: data.unit,
          chapterId: data.chapter_id ?? undefined,
          title: data.title,
          adiPhase: data.adi_phase,
          cycle: data.cycle ?? undefined,
          prompt: data.prompt,
          context: data.context,
          rubricDimensions: data.rubric_dimensions,
          peerReviewAllowed: data.peer_review_allowed,
        }
      : undefined;
  }

  async listActivities(courseId: string): Promise<Activity[]> {
    const { data, error } = await this.client.from("activities").select().eq("course_id", courseId).order("created_at");
    if (error) throw new Error(`Supabase activity list failed: ${error.message}`);
    return (data ?? []).map((item) => ({
      id: item.id,
      courseId: item.course_id,
      unit: item.unit,
      chapterId: item.chapter_id ?? undefined,
      title: item.title,
      adiPhase: item.adi_phase,
      cycle: item.cycle ?? undefined,
      prompt: item.prompt,
      context: item.context,
      rubricDimensions: item.rubric_dimensions,
      peerReviewAllowed: item.peer_review_allowed,
    }));
  }

  async addSubmission(input: Omit<Submission, "id" | "submittedAt">): Promise<Submission> {
    if (this.scope.context.role !== "student" || !this.scope.context.studentId) throw new Error("Only a student can submit work");
    assertStudentScope(this.scope, input.studentId);
    const row: Database["public"]["Tables"]["submissions"]["Insert"] = {
      student_id: this.scope.context.studentId,
      activity_id: input.activityId,
      version: input.version,
      content: input.content,
      hint_depth: input.hintDepth,
      hint_cost: input.hintCost,
      response_time_seconds: input.responseTimeSeconds,
      workflow_state: input.workflowState,
      previous_draft_id: input.previousDraftId ?? null,
      profile_id: this.scope.profileId ?? null,
      class_id: this.scope.context.classId,
      idempotency_key: input.idempotencyKey ?? null,
      cycle: input.cycle ?? null,
      draft1_frozen: input.draft1Frozen ?? false,
      draft1_frozen_at: input.draft1FrozenAt ?? null,
      feedback_decisions: input.feedbackDecisions ?? null,
    };
    const query = row.idempotency_key
      ? this.client.from("submissions").upsert(row, { onConflict: "profile_id,idempotency_key" }).select().single()
      : this.client.from("submissions").insert(row).select().single();
    const { data, error } = await query;
    if (error || !data) throw new Error(`Supabase submission write failed: ${error?.message ?? "empty response"}`);
    return mapSubmission(data);
  }

  async getSubmission(submissionId: string): Promise<Submission | undefined> {
    const { data, error } = await this.client.from("submissions").select().eq("id", submissionId).maybeSingle();
    if (error) throw new Error(`Supabase submission lookup failed: ${error.message}`);
    return data ? mapSubmission(data) : undefined;
  }

  async listSubmissions(studentId?: string, activityId?: string): Promise<Submission[]> {
    assertStudentScope(this.scope, studentId);
    let query = this.client.from("submissions").select().order("submitted_at", { ascending: false });
    if (this.scope.context.role === "student") query = query.eq("student_id", this.scope.context.studentId!);
    if (studentId && this.scope.context.role !== "student") query = query.eq("student_id", studentId);
    if (activityId) query = query.eq("activity_id", activityId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase submission list failed: ${error.message}`);
    return (data ?? []).map(mapSubmission);
  }

  async latestSubmission(studentId: string, activityId: string): Promise<Submission | undefined> {
    assertStudentScope(this.scope, studentId);
    const { data, error } = await this.client
      .from("submissions")
      .select()
      .eq("student_id", this.scope.context.studentId ?? studentId)
      .eq("activity_id", activityId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase latest submission lookup failed: ${error.message}`);
    return data ? mapSubmission(data) : undefined;
  }

  async updateSubmissionWorkflow(submissionId: string, workflowState: Submission["workflowState"]): Promise<Submission | undefined> {
    const { data, error } = await this.client
      .from("submissions")
      .update({ workflow_state: workflowState })
      .eq("id", submissionId)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase submission update failed: ${error.message}`);
    return data ? mapSubmission(data) : undefined;
  }

  async addRevision(input: Omit<Revision, "id" | "createdAt">): Promise<Revision> {
    if (this.scope.context.role !== "student" || !this.scope.context.studentId) throw new Error("Only a student can add a revision");
    assertStudentScope(this.scope, input.studentId);
    const row: Database["public"]["Tables"]["revisions"]["Insert"] = {
      submission_id: input.submissionId,
      student_id: this.scope.context.studentId,
      activity_id: input.activityId,
      version: input.version,
      content: input.content,
      profile_id: this.scope.profileId ?? null,
      class_id: this.scope.context.classId,
      idempotency_key: input.idempotencyKey ?? null,
      cycle: input.cycle ?? null,
      draft1_frozen: input.draft1Frozen ?? false,
      draft1_frozen_at: input.draft1FrozenAt ?? null,
      feedback_decisions: input.feedbackDecisions ?? null,
    };
    const query = row.idempotency_key
      ? this.client.from("revisions").upsert(row, { onConflict: "profile_id,idempotency_key" }).select().single()
      : this.client.from("revisions").insert(row).select().single();
    const { data, error } = await query;
    if (error || !data) throw new Error(`Supabase revision write failed: ${error?.message ?? "empty response"}`);
    return mapRevision(data);
  }

  async listRevisions(submissionId: string): Promise<Revision[]> {
    const { data, error } = await this.client.from("revisions").select().eq("submission_id", submissionId).order("version");
    if (error) throw new Error(`Supabase revision list failed: ${error.message}`);
    return (data ?? []).map(mapRevision);
  }

  async createSession(input: Omit<AiSession, "id" | "startedAt">): Promise<AiSession> {
    assertStudentScope(this.scope, input.studentId);
    const { data, error } = await this.client
      .from("ai_sessions")
      .insert({
        student_id: this.scope.context.studentId ?? input.studentId,
        activity_id: input.activityId,
        profile_id: this.scope.profileId ?? null,
        class_id: this.scope.context.classId,
        context: input.context as unknown as Json,
        provider: input.provider,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase AI session write failed: ${error?.message ?? "empty response"}`);
    return {
      id: data.id,
      studentId: data.student_id,
      activityId: data.activity_id,
      context: data.context as unknown as LearningContext,
      provider: data.provider,
      startedAt: data.started_at,
      endedAt: data.ended_at ?? undefined,
    };
  }

  async addInteraction(input: Omit<AiInteraction, "id" | "createdAt">): Promise<AiInteraction> {
    assertStudentScope(this.scope, input.studentId);
    const { data, error } = await this.client
      .from("ai_interactions")
      .insert({
        session_id: input.sessionId,
        student_id: this.scope.context.studentId ?? input.studentId,
        activity_id: input.activityId,
        profile_id: this.scope.profileId ?? null,
        class_id: this.scope.context.classId,
        request: input.request as unknown as Json,
        response: (input.response ?? null) as unknown as Json,
        fallback_used: input.fallbackUsed,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase AI interaction write failed: ${error?.message ?? "empty response"}`);
    return {
      id: data.id,
      sessionId: data.session_id,
      studentId: data.student_id,
      activityId: data.activity_id,
      request: data.request as unknown as AiInteraction["request"],
      response: data.response as unknown as AiInteraction["response"],
      fallbackUsed: data.fallback_used,
      createdAt: data.created_at,
    };
  }

  async listInteractions(studentId: string, activityId?: string): Promise<AiInteraction[]> {
    assertStudentScope(this.scope, studentId);
    let query = this.client.from("ai_interactions").select().order("created_at");
    if (this.scope.context.role === "student") query = query.eq("student_id", this.scope.context.studentId!);
    else query = query.eq("student_id", studentId);
    if (activityId) query = query.eq("activity_id", activityId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase AI interaction list failed: ${error.message}`);
    return (data ?? []).map((item) => ({
      id: item.id,
      sessionId: item.session_id,
      studentId: item.student_id,
      activityId: item.activity_id,
      request: item.request as unknown as AiInteraction["request"],
      response: item.response as unknown as AiInteraction["response"],
      fallbackUsed: item.fallback_used,
      createdAt: item.created_at,
    }));
  }

  async getAssignedPeerReviewDraft(studentId: string, activityId: string): Promise<PeerReviewSubmission | undefined> {
    assertStudentScope(this.scope, studentId);
    if (this.scope.context.role !== "student") throw new Error("Only students can receive peer-review assignments");
    const { data, error } = await this.client.rpc("get_assigned_peer_review_draft", { p_activity_id: activityId });
    if (error) throw new Error(`Supabase peer-review assignment failed: ${error.message}`);
    return data ? (data as unknown as PeerReviewSubmission) : undefined;
  }

  async addPeerReview(input: Omit<PeerReview, "id" | "createdAt">): Promise<PeerReview> {
    assertStudentScope(this.scope, input.reviewerStudentId);
    if (this.scope.context.role !== "student") throw new Error("Only students can submit peer reviews");
    const { data, error } = await this.client.rpc("submit_peer_review", {
      p_submission_id: input.submissionId,
      p_peer_review_submission_id: input.peerReviewSubmissionId ?? null,
      p_activity_id: input.activityId ?? this.scope.context.activityId ?? "",
      p_scores: input.scores ?? { claim: 3, evidence: 3, reasoning: 3 },
      p_strengths: input.strengths ?? "",
      p_suggestions: input.suggestions ?? "",
      p_feedback: input.feedback,
    });
    if (error || !data) throw new Error(`Supabase peer-review write failed: ${error?.message ?? "empty response"}`);
    return data as unknown as PeerReview;
  }

  async listPeerReviews(submissionId?: string, reviewerStudentId?: string): Promise<PeerReview[]> {
    assertStudentScope(this.scope, reviewerStudentId);
    let query = this.client.from("peer_reviews").select();
    if (submissionId) query = query.eq("submission_id", submissionId);
    if (this.scope.context.role === "student") query = query.eq("reviewer_student_id", this.scope.context.studentId!);
    else if (reviewerStudentId) query = query.eq("reviewer_student_id", reviewerStudentId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase peer-review list failed: ${error.message}`);
    return (data ?? []).map(mapPeerReview);
  }

  async addReflection(input: Omit<StudentReflectionData, "id" | "completedAt">): Promise<StudentReflectionData> {
    if (this.scope.context.role !== "student" || !this.scope.context.studentId) throw new Error("Only students can submit reflections");
    assertStudentScope(this.scope, input.studentId);
    const { data, error } = await this.client
      .from("reflections")
      .upsert(
        {
          student_id: this.scope.context.studentId,
          activity_id: input.activityId,
          submission_id: input.submissionId ?? null,
          conceptual_learning: input.conceptualLearning ?? input.reflectionText ?? "",
          inquiry_process_reflection: input.inquiryProcessReflection ?? "",
          peer_review_experience: input.peerReviewExperience ?? null,
          confidence_score: input.confidenceScore ?? 3,
          key_takeaway: input.keyTakeaway ?? null,
          profile_id: this.scope.profileId ?? null,
          class_id: this.scope.context.classId,
        },
        { onConflict: "profile_id,activity_id" },
      )
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase reflection write failed: ${error?.message ?? "empty response"}`);
    return {
      id: data.id,
      studentId: data.student_id,
      activityId: data.activity_id,
      submissionId: data.submission_id ?? undefined,
      conceptualLearning: data.conceptual_learning,
      inquiryProcessReflection: data.inquiry_process_reflection,
      peerReviewExperience: data.peer_review_experience ?? undefined,
      confidenceScore: data.confidence_score,
      keyTakeaway: data.key_takeaway ?? undefined,
      completedAt: data.completed_at,
    };
  }

  async getReflection(studentId: string, activityId: string): Promise<StudentReflectionData | undefined> {
    assertStudentScope(this.scope, studentId);
    const { data, error } = await this.client.from("reflections").select().eq("student_id", this.scope.context.studentId ?? studentId).eq("activity_id", activityId).maybeSingle();
    if (error) throw new Error(`Supabase reflection lookup failed: ${error.message}`);
    return data
      ? {
          id: data.id,
          studentId: data.student_id,
          activityId: data.activity_id,
          submissionId: data.submission_id ?? undefined,
          conceptualLearning: data.conceptual_learning,
          inquiryProcessReflection: data.inquiry_process_reflection,
          peerReviewExperience: data.peer_review_experience ?? undefined,
          confidenceScore: data.confidence_score,
          keyTakeaway: data.key_takeaway ?? undefined,
          completedAt: data.completed_at,
        }
      : undefined;
  }

  async listReflections(studentId?: string, activityId?: string): Promise<StudentReflectionData[]> {
    assertStudentScope(this.scope, studentId);
    let query = this.client.from("reflections").select();
    if (this.scope.context.role === "student") query = query.eq("student_id", this.scope.context.studentId!);
    else if (studentId) query = query.eq("student_id", studentId);
    if (activityId) query = query.eq("activity_id", activityId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase reflection list failed: ${error.message}`);
    return (data ?? []).map((item) => ({
      id: item.id,
      studentId: item.student_id,
      activityId: item.activity_id,
      submissionId: item.submission_id ?? undefined,
      conceptualLearning: item.conceptual_learning,
      inquiryProcessReflection: item.inquiry_process_reflection,
      peerReviewExperience: item.peer_review_experience ?? undefined,
      confidenceScore: item.confidence_score,
      keyTakeaway: item.key_takeaway ?? undefined,
      completedAt: item.completed_at,
    }));
  }

  async addTeacherReview(input: Omit<TeacherReview, "id" | "createdAt">): Promise<TeacherReview> {
    if (this.scope.context.role !== "teacher" || !this.scope.context.teacherId) throw new Error("Only the scoped teacher can review work");
    const { data, error } = await this.client
      .from("teacher_reviews")
      .insert({
        submission_id: input.submissionId,
        teacher_id: this.scope.context.teacherId,
        teacher_profile_id: this.scope.profileId ?? null,
        class_id: this.scope.context.classId,
        scores: { holistic: input.score },
        rubric_scores: input.rubricScores ?? null,
        synthetic_scores: input.syntheticScores ?? null,
        cycle: input.cycle ?? null,
        final_score: input.score,
        feedback: input.comment,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase teacher review write failed: ${error?.message ?? "empty response"}`);
    return mapTeacherReview(data);
  }

  async listTeacherReviews(submissionId?: string): Promise<TeacherReview[]> {
    let query = this.client.from("teacher_reviews").select().order("created_at", { ascending: false });
    if (submissionId) query = query.eq("submission_id", submissionId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase teacher review list failed: ${error.message}`);
    return (data ?? []).map(mapTeacherReview);
  }

  async addTeacherObservationNote(input: Omit<TeacherObservationNote, "id" | "createdAt" | "updatedAt">): Promise<TeacherObservationNote> {
    if (this.scope.context.role !== "teacher" || !this.scope.context.teacherId) throw new Error("Only a teacher can record classroom observation notes");
    const { data, error } = await this.client
      .from("teacher_observation_notes")
      .insert({
        teacher_id: this.scope.context.teacherId,
        teacher_profile_id: this.scope.profileId ?? null,
        class_id: this.scope.context.classId,
        cycle: input.cycle,
        activity_id: input.activityId,
        phase: input.phase,
        content: input.content,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase teacher observation note write failed: ${error?.message ?? "empty response"}`);
    return mapTeacherObservationNote(data);
  }

  async listTeacherObservationNotes(teacherId?: string, cycle?: PaorCycle, activityId?: string): Promise<TeacherObservationNote[]> {
    if (this.scope.context.role !== "teacher" || !this.scope.context.teacherId) throw new Error("Only a teacher can list classroom observation notes");
    const scopedTeacherId = this.scope.context.teacherId;
    if (teacherId && teacherId !== scopedTeacherId) {
      throw new Error("Learning scope denied: teacher identity is controlled by the authenticated session");
    }
    let query = this.client
      .from("teacher_observation_notes")
      .select()
      .eq("teacher_id", scopedTeacherId)
      .eq("class_id", this.scope.context.classId)
      .order("created_at", { ascending: false });
    if (cycle) query = query.eq("cycle", cycle);
    if (activityId) query = query.eq("activity_id", activityId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase teacher observation note list failed: ${error.message}`);
    return (data ?? []).map(mapTeacherObservationNote);
  }

  async appendLearningEvent(event: LearningEvent): Promise<LearningEvent> {
    assertStudentScope(this.scope, event.studentId);
    const row: Database["public"]["Tables"]["learning_events"]["Insert"] = {
      id: event.id,
      schema_version: event.schemaVersion,
      student_id: event.studentId,
      activity_id: event.activityId,
      event_type: event.eventType,
      payload: event.payload,
      context: event.context as unknown as Json,
      actor: event.actor as unknown as Json,
      class_id: this.scope.context.classId,
      profile_id: this.scope.profileId ?? null,
      correlation_id: event.correlationId,
      occurred_at: event.occurredAt,
      idempotency_key: event.idempotencyKey ?? null,
      cycle: event.cycle ?? null,
      created_at: event.createdAt,
    };
    const query = row.idempotency_key
      ? this.client.from("learning_events").upsert(row, { onConflict: "profile_id,idempotency_key" }).select().single()
      : this.client.from("learning_events").insert(row).select().single();
    const { data, error } = await query;
    if (error || !data) throw new Error(`Supabase learning event write failed: ${error?.message ?? "empty response"}`);
    return mapEvent(data);
  }

  async listLearningEvents(studentId?: string, activityId?: string): Promise<LearningEvent[]> {
    assertStudentScope(this.scope, studentId);
    let query = this.client.from("learning_events").select().order("occurred_at", { ascending: false });
    if (this.scope.context.role === "student") query = query.eq("student_id", this.scope.context.studentId!);
    else if (studentId) query = query.eq("student_id", studentId);
    if (activityId) query = query.eq("activity_id", activityId);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase learning event list failed: ${error.message}`);
    return (data ?? []).map(mapEvent);
  }
}

export function createSupabaseRepository(client: SupabaseClient<Database>, scope: SupabaseRepositoryScope): SupabaseRepository {
  return new SupabaseRepository(client, scope);
}
