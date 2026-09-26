import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalDevelopmentContext } from "@/lib/context/learning-context";
import type { FeedbackDecision } from "@/lib/domain/types";
import { getLearningRepository, getPersistenceMode, getPersistenceStatus } from "@/lib/repository/index";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { createSupabaseRepository } from "@/lib/repository/supabase-repository";
import { buildWideResearchDataset, formatResearchWideDatasetCsv } from "@/lib/research/export";
import type { Database } from "@/lib/supabase/types";

function createFakeSupabaseClient(): SupabaseClient<Database> {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    activities: [
      {
        id: "ecosystem-energy-flow-01",
        course_id: "biology-m4",
        unit: "ระบบนิเวศ",
        chapter_id: "energy-flow",
        title: "อธิบายการไหลของพลังงาน (Cycle 2)",
        adi_phase: "investigation",
        cycle: 2,
        prompt: "เปรียบเทียบพลังงาน",
        context: "ผู้ผลิตเปลี่ยนพลังงานแสง",
        rubric_dimensions: ["claim", "evidence", "reasoning"],
        peer_review_allowed: true,
        created_at: "2026-09-01T00:00:00.000Z",
      },
    ],
    submissions: [],
    revisions: [],
    teacher_reviews: [],
    learning_events: [],
  };

  function makeBuilder(table: string) {
    const rows = () => (tables[table] ??= []);
    let filters: Array<(row: Record<string, unknown>) => boolean> = [];
    let pendingResult: Record<string, unknown> | null = null;

    const builder = {
      insert(payload: Record<string, unknown>) {
        const now = new Date().toISOString();
        const record: Record<string, unknown> = {
          id: (payload.id as string | undefined) ?? crypto.randomUUID(),
          created_at: (payload.created_at as string | undefined) ?? now,
          submitted_at: (payload.submitted_at as string | undefined) ?? now,
          updated_at: (payload.updated_at as string | undefined) ?? now,
          ...payload,
        };
        rows().push(record);
        pendingResult = record;
        return builder;
      },
      upsert(payload: Record<string, unknown>) {
        return builder.insert(payload);
      },
      update(patch: Record<string, unknown>) {
        const matched = rows().filter((r) => filters.every((f) => f(r)));
        for (const r of matched) Object.assign(r, patch);
        pendingResult = matched[0] ?? null;
        return builder;
      },
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push((r) => r[column] === value);
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      async single() {
        if (pendingResult) return { data: pendingResult, error: null };
        const matched = rows().filter((r) => filters.every((f) => f(r)));
        return { data: matched[0] ?? null, error: matched[0] ? null : { message: "not found" } };
      },
      async maybeSingle() {
        if (pendingResult) return { data: pendingResult, error: null };
        const matched = rows().filter((r) => filters.every((f) => f(r)));
        return { data: matched[0] ?? null, error: null };
      },
      then<TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: { data: Array<Record<string, unknown>>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        const matched = rows().filter((r) => filters.every((f) => f(r)));
        return Promise.resolve({ data: matched, error: null }).then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  return {
    from: (table: string) => makeBuilder(table),
  } as unknown as SupabaseClient<Database>;
}

describe("Learning persistence factory", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", "test-student-supa-01");
    clearMemoryRepositoriesForTests();
  });

  it("keeps memory mode explicit and reports its actual status", () => {
    expect(getPersistenceMode()).toBe("memory");
    expect(getPersistenceStatus()).toEqual({ mode: "memory", configured: true });
  });

  it("uses the scoped memory rollback without accepting a second student identity", async () => {
    const identity = { context: createLocalDevelopmentContext("student", "ecosystem-food-web-01") };
    const repository = await getLearningRepository(identity);
    const submission = await repository.addSubmission({
      studentId: "test-student-supa-01",
      activityId: "ecosystem-food-web-01",
      version: 1,
      content: { claim: "ผู้ผลิตมีความสำคัญสูงสุด", evidence: "สร้างพลังงานเริ่มต้น", reasoning: "พืชสังเคราะห์ด้วยแสง" },
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 120,
      workflowState: "submitted",
    });

    expect(submission.id).toBeDefined();
    await expect(repository.listSubmissions("student-b", "ecosystem-food-web-01")).rejects.toThrow(/scope denied/i);
    expect((await repository.getSubmission(submission.id))?.studentId).toBe("test-student-supa-01");
  });

  it("does not silently switch to memory when Supabase mode is unconfigured", async () => {
    vi.stubEnv("LEARNING_PERSISTENCE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getPersistenceStatus()).toEqual({ mode: "supabase", configured: false });
    await expect(getLearningRepository({ context: createLocalDevelopmentContext("student") })).rejects.toThrow(/Supabase persistence is configured/i);
  });

  it("round-trips Phase 11 research fields in SupabaseRepository and feeds wide export (LOS-003)", async () => {
    const client = createFakeSupabaseClient();
    const studentScope = {
      context: {
        ...createLocalDevelopmentContext("student", "ecosystem-energy-flow-01"),
        studentId: "40105",
        classId: "biology-m4-class-a",
      },
      profileId: "profile-student-40105",
    };
    const teacherScope = {
      context: {
        ...createLocalDevelopmentContext("teacher", "ecosystem-energy-flow-01"),
        teacherId: "demo-teacher-01",
        classId: "biology-m4-class-a",
      },
      profileId: "profile-teacher-01",
    };

    const studentRepo = createSupabaseRepository(client, studentScope);
    const teacherRepo = createSupabaseRepository(client, teacherScope);

    const frozenAt = "2026-09-25T08:00:00.000Z";
    const decisions: FeedbackDecision[] = [
      { feedbackItem: "เพิ่มหลักฐานเชิงตัวเลข 10%", source: "ai_coach", status: "accept", justificationText: "ช่วยให้เห็นการสูญเสียพลังงานชัดเจน" },
      { feedbackItem: "เปลี่ยนข้อกล่าวอ้างทั้งหมด", source: "peer", status: "reject", justificationText: "ข้อกล่าวอ้างเดิมตรงประเด็นอยู่แล้ว" },
      { feedbackItem: "ปรับคำเชื่อมในเหตุผล", source: "ai_coach", status: "modify", justificationText: "เรียบเรียงใหม่ด้วยภาษาตนเอง" },
    ];

    const draft1 = await studentRepo.addSubmission({
      studentId: "40105",
      activityId: "ecosystem-energy-flow-01",
      version: 1,
      content: { claim: "Draft 1 claim", evidence: "Draft 1 evidence", reasoning: "Draft 1 reasoning" },
      hintDepth: "shallow",
      hintCost: 1,
      responseTimeSeconds: 95,
      workflowState: "submitted",
      cycle: 2,
      draft1Frozen: true,
      draft1FrozenAt: frozenAt,
      idempotencyKey: "sub-draft1-key",
    });

    expect(draft1.cycle).toBe(2);
    expect(draft1.draft1Frozen).toBe(true);
    expect(draft1.draft1FrozenAt).toBe(frozenAt);

    const finalSub = await studentRepo.addSubmission({
      studentId: "40105",
      activityId: "ecosystem-energy-flow-01",
      version: 2,
      content: { claim: "Final claim", evidence: "Final evidence", reasoning: "Final reasoning" },
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 140,
      workflowState: "revision",
      previousDraftId: draft1.id,
      cycle: 2,
      draft1Frozen: false,
      feedbackDecisions: decisions,
      idempotencyKey: "sub-final-key",
    });

    const rev = await studentRepo.addRevision({
      submissionId: finalSub.id,
      studentId: "40105",
      activityId: "ecosystem-energy-flow-01",
      version: 2,
      content: finalSub.content,
      cycle: 2,
      draft1Frozen: true,
      draft1FrozenAt: frozenAt,
      feedbackDecisions: decisions,
      idempotencyKey: "rev-final-key",
    });

    expect(rev.cycle).toBe(2);
    expect(rev.draft1Frozen).toBe(true);
    expect(rev.draft1FrozenAt).toBe(frozenAt);
    expect(rev.feedbackDecisions).toEqual(decisions);

    const fetchedSub = await studentRepo.getSubmission(finalSub.id);
    expect(fetchedSub?.cycle).toBe(2);
    expect(fetchedSub?.feedbackDecisions).toEqual(decisions);

    const fetchedRevs = await studentRepo.listRevisions(finalSub.id);
    expect(fetchedRevs).toHaveLength(1);
    expect(fetchedRevs[0].cycle).toBe(2);
    expect(fetchedRevs[0].draft1Frozen).toBe(true);
    expect(fetchedRevs[0].draft1FrozenAt).toBe(frozenAt);
    expect(fetchedRevs[0].feedbackDecisions).toEqual(decisions);

    const savedReview = await teacherRepo.addTeacherReview({
      submissionId: finalSub.id,
      teacherId: "demo-teacher-01",
      score: 81,
      comment: "แยกคะแนน CER และ Synthetic Thinking ชัดเจน",
      rubricScores: { claim: 4, evidence: 3, reasoning: 2 },
      syntheticScores: {
        selectingInfo: 3,
        connectingInfo: 4,
        reconstructingLanguage: 3,
        directAnswering: 3,
      },
      cycle: 2,
    });

    expect(savedReview.rubricScores).toEqual({ claim: 4, evidence: 3, reasoning: 2 });
    expect(savedReview.syntheticScores).toEqual({
      selectingInfo: 3,
      connectingInfo: 4,
      reconstructingLanguage: 3,
      directAnswering: 3,
    });
    expect(savedReview.cycle).toBe(2);

    const listedReviews = await teacherRepo.listTeacherReviews(finalSub.id);
    expect(listedReviews).toHaveLength(1);
    expect(listedReviews[0].rubricScores).toEqual({ claim: 4, evidence: 3, reasoning: 2 });
    expect(listedReviews[0].syntheticScores?.connectingInfo).toBe(4);
    expect(listedReviews[0].cycle).toBe(2);

    const allSubs = await teacherRepo.listSubmissions();
    const activities = await teacherRepo.listActivities("biology-m4");
    const activityCycles = Object.fromEntries(activities.map((a) => [a.id, a.cycle]));

    const wide = buildWideResearchDataset({
      submissions: allSubs,
      revisions: fetchedRevs,
      events: [],
      teacherReviews: listedReviews,
      activityCycles,
    });

    expect(wide).toHaveLength(1);
    expect(wide[0].cycle).toBe(2);
    expect(wide[0].draft1FrozenAt).toBe(frozenAt);
    expect(wide[0].feedbackDecisionsCount).toBe(3);
    expect(wide[0].feedbackAcceptedCount).toBe(1);
    expect(wide[0].feedbackRejectedCount).toBe(1);
    expect(wide[0].feedbackModifiedCount).toBe(1);
    expect(wide[0].teacherCerClaim).toBe(4);
    expect(wide[0].teacherCerEvidence).toBe(3);
    expect(wide[0].teacherCerReasoning).toBe(2);
    expect(wide[0].rubricDim1SelectInfo).toBe(3);
    expect(wide[0].rubricDim2ConnectInfo).toBe(4);
    expect(wide[0].rubricDim3OwnLanguage).toBe(3);
    expect(wide[0].rubricDim4DirectAnswer).toBe(3);
    expect(wide[0].totalRubricScore).toBe(Math.round(((3 + 4 + 3 + 3) / 16) * 100));

    const csv = formatResearchWideDatasetCsv(wide);
    expect(csv).toContain("M41_05");
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("persists and filters teacher observation notes with teacher/class isolation (LOS-004)", async () => {
    const client = createFakeSupabaseClient();
    const teacherARepo = createSupabaseRepository(client, {
      context: {
        ...createLocalDevelopmentContext("teacher", "ecosystem-food-web-01"),
        teacherId: "teacher-a",
        classId: "biology-m4-class-a",
      },
      profileId: "profile-teacher-a",
    });
    const teacherBRepo = createSupabaseRepository(client, {
      context: {
        ...createLocalDevelopmentContext("teacher", "ecosystem-food-web-01"),
        teacherId: "teacher-b",
        classId: "biology-m4-class-a",
      },
      profileId: "profile-teacher-b",
    });

    const noteA1 = await teacherARepo.addTeacherObservationNote({
      teacherId: "spoofed-teacher",
      classId: "spoofed-class",
      cycle: 1,
      activityId: "ecosystem-food-web-01",
      phase: "observe",
      content: "Cycle 1 food web observation by Teacher A",
    });
    expect(noteA1.teacherId).toBe("teacher-a");
    expect(noteA1.classId).toBe("biology-m4-class-a");

    await teacherARepo.addTeacherObservationNote({
      teacherId: "teacher-a",
      classId: "biology-m4-class-a",
      cycle: 2,
      activityId: "ecosystem-energy-flow-01",
      phase: "reflect",
      content: "Cycle 2 energy flow reflection by Teacher A",
    });

    await teacherBRepo.addTeacherObservationNote({
      teacherId: "teacher-b",
      classId: "biology-m4-class-a",
      cycle: 1,
      activityId: "ecosystem-food-web-01",
      phase: "plan",
      content: "Cycle 1 plan by Teacher B",
    });

    const allA = await teacherARepo.listTeacherObservationNotes();
    expect(allA).toHaveLength(2);
    expect(allA.every((n) => n.teacherId === "teacher-a")).toBe(true);

    const cycle1A = await teacherARepo.listTeacherObservationNotes("teacher-a", 1);
    expect(cycle1A).toHaveLength(1);
    expect(cycle1A[0].content).toBe("Cycle 1 food web observation by Teacher A");

    const energyA = await teacherARepo.listTeacherObservationNotes("teacher-a", undefined, "ecosystem-energy-flow-01");
    expect(energyA).toHaveLength(1);
    expect(energyA[0].cycle).toBe(2);

    const allB = await teacherBRepo.listTeacherObservationNotes();
    expect(allB).toHaveLength(1);
    expect(allB[0].teacherId).toBe("teacher-b");

    await expect(teacherARepo.listTeacherObservationNotes("teacher-b")).rejects.toThrow(/scope denied/i);
  });
});
