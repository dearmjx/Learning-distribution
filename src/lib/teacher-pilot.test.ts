import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getActivities } from "@/app/api/activities/route";
import { GET as getTeacherReviews, POST as postTeacherReview } from "@/app/api/teacher/reviews/route";
import { GET as getTeacherRoster } from "@/app/api/teacher/roster/route";
import { GET as getResearchExport } from "@/app/api/research/export/route";
import { POST as postSession } from "@/app/api/sessions/route";
import { learningEventStore } from "@/lib/events/event-store";
import { clearMemoryRepositoriesForTests } from "@/lib/repository/memory-repository";
import { formatResearchEvidenceCsv } from "@/lib/research/export";
import * as supabaseServer from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { LearningEvent } from "@/lib/domain/types";

const activityId = "ecosystem-food-web-01";

function setLocalTeacher(teacherId = "demo-teacher-01"): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "teacher");
  vi.stubEnv("LEARNING_LOCAL_TEACHER_ID", teacherId);
  vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
}

function setLocalStudent(studentId = "demo-student-01"): void {
  vi.stubEnv("LEARNING_LOCAL_ROLE", "student");
  vi.stubEnv("LEARNING_LOCAL_STUDENT_ID", studentId);
  vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
}

function createSubmissionRequest(studentId: string, requestId: string): Request {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
    body: JSON.stringify({
      studentId,
      activityId,
      content: {
        claim: "เมื่องูลดลงอย่างมาก หนูจะเพิ่มขึ้นชั่วคราว",
        evidence: "หญ้า -> หนู -> งู ในสายใยอาหาร",
        reasoning: "การขาดผู้ล่าส่งผลกระทบต่อประชากรเหยื่อตามหลักนิเวศวิทยา",
      },
      hintDepth: "concept",
      responseTimeSeconds: 120,
    }),
  });
}

describe("Phase 10 Teacher Pilot Operations", () => {
  beforeEach(() => {
    vi.stubEnv("LEARNING_PERSISTENCE", "memory");
    vi.stubEnv("LEARNING_LOCAL_CLASS_ID", "biology-m4-class-a");
    clearMemoryRepositoriesForTests();
    learningEventStore.clearForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("submits CER rubric scores and records them in the event stream", async () => {
    // 1. Student submits a CER draft
    setLocalStudent("student-01");
    const subRes = await postSession(createSubmissionRequest("student-01", "sub-req-01"));
    const subData = (await subRes.json()) as { submission: { id: string } };
    expect(subData.submission.id).toBeDefined();

    // 2. Teacher evaluates with granular CER Rubrics
    setLocalTeacher("demo-teacher-01");
    const reviewReq = new Request("http://localhost/api/teacher/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: subData.submission.id,
        teacherId: "demo-teacher-01",
        score: 92,
        comment: "ข้ออ้างอิงชัดเจนมากและใช้หลักฐานจากสายใยอาหารได้สมบูรณ์",
        rubricScores: {
          claim: 4,
          evidence: 4,
          reasoning: 3,
        },
      }),
    });

    const reviewRes = await postTeacherReview(reviewReq);
    expect(reviewRes.status).toBe(200);
    const reviewPayload = (await reviewRes.json()) as {
      review: {
        score: number;
        rubricScores?: { claim: number; evidence: number; reasoning: number };
      };
    };
    expect(reviewPayload.review.score).toBe(92);
    expect(reviewPayload.review.rubricScores?.claim).toBe(4);
    expect(reviewPayload.review.rubricScores?.reasoning).toBe(3);

    // 3. Verify event contains rubric breakdown
    const events = learningEventStore.list({ studentId: "student-01", activityId });
    const reviewEvent = events.find((e) => e.eventType === "teacher_reviewed");
    expect(reviewEvent).toBeDefined();
    expect(reviewEvent?.payload.score).toBe(92);
    expect((reviewEvent?.payload.rubricScores as { claim: number })?.claim).toBe(4);
  });

  it("aggregates class roster and ADI phase progress", async () => {
    setLocalStudent("student-alpha");
    await postSession(createSubmissionRequest("student-alpha", "sub-alpha-1"));

    setLocalTeacher("demo-teacher-01");
    const rosterRes = await getTeacherRoster(new Request("http://localhost/api/teacher/roster"));
    expect(rosterRes.status).toBe(200);
    const rosterData = (await rosterRes.json()) as {
      totalStudents: number;
      students: Array<{ studentId: string; currentPhase: string; submissionCount: number }>;
    };

    expect(rosterData.totalStudents).toBeGreaterThanOrEqual(1);
    const alpha = rosterData.students.find((s) => s.studentId === "student-alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.submissionCount).toBe(1);
  });

  it("builds teacher roster from real memberships in Supabase mode without synthetic 401xx/402xx students (LOS-005)", async () => {
    vi.stubEnv("LEARNING_PERSISTENCE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-placeholder");

    const tables: Record<string, Array<Record<string, unknown>>> = {
      learning_profiles: [
        {
          id: "prof-teacher-1",
          auth_user_id: "auth-teacher-1",
          external_id: "teacher-real-01",
          display_name: "Teacher Real 01",
          role: "teacher",
          school_id: "demo-school-01",
          course_id: "biology-m4",
        },
        {
          id: "prof-student-a",
          auth_user_id: "auth-student-a",
          external_id: "student-real-a",
          display_name: "Synthetic Student A",
          role: "student",
          school_id: "demo-school-01",
          course_id: "biology-m4",
        },
        {
          id: "prof-student-b",
          auth_user_id: "auth-student-b",
          external_id: "student-real-b",
          display_name: "Synthetic Student B",
          role: "student",
          school_id: "demo-school-01",
          course_id: "biology-m4",
        },
      ],
      memberships: [
        {
          id: "mem-t1",
          profile_id: "prof-teacher-1",
          class_id: "biology-m4-class-a",
          role: "teacher",
          status: "active",
          starts_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "mem-sa",
          profile_id: "prof-student-a",
          class_id: "biology-m4-class-a",
          role: "student",
          status: "active",
          starts_at: "2026-09-01T01:00:00.000Z",
        },
        {
          id: "mem-sb",
          profile_id: "prof-student-b",
          class_id: "biology-m4-class-a",
          role: "student",
          status: "active",
          starts_at: "2026-09-01T02:00:00.000Z",
        },
      ],
      classes: [
        {
          id: "biology-m4-class-a",
          school_id: "demo-school-01",
          course_id: "biology-m4",
          name: "ชีววิทยา ม.4 ห้อง A (Pilot)",
        },
      ],
      courses: [
        {
          id: "biology-m4",
          school_id: "demo-school-01",
          title: "ชีววิทยา ม.4: ระบบนิเวศ",
          language: "th",
        },
      ],
      activities: [
        {
          id: "custom-activity-id",
          course_id: "biology-m4",
          unit: "ระบบนิเวศ",
          chapter_id: "energy-flow",
          title: "กิจกรรมถ่ายทอดพลังงาน",
          adi_phase: "investigation",
          cycle: 2,
          prompt: "เปรียบเทียบพลังงาน",
          context: "ผู้ผลิตเปลี่ยนพลังงานแสง",
          rubric_dimensions: ["claim", "evidence", "reasoning"],
          peer_review_allowed: true,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      submissions: [
        {
          id: "sub-real-a",
          student_id: "student-real-a",
          activity_id: "custom-activity-id",
          profile_id: "prof-student-a",
          class_id: "biology-m4-class-a",
          version: 1,
          content: { claim: "c", evidence: "e", reasoning: "r" },
          hint_depth: "none",
          hint_cost: 0,
          response_time_seconds: 60,
          workflow_state: "submitted",
          cycle: 2,
          draft1_frozen: true,
          draft1_frozen_at: "2026-09-26T00:00:00.000Z",
          submitted_at: "2026-09-26T00:00:00.000Z",
          updated_at: "2026-09-26T00:00:00.000Z",
        },
      ],
      revisions: [],
      learning_events: [],
      teacher_reviews: [],
      peer_reviews: [],
    };

    const fakeClient = {
      auth: {
        getUser: async () => ({ data: { user: { id: "auth-teacher-1" } }, error: null }),
      },
      from(table: string) {
        const filters: Array<(row: Record<string, unknown>) => boolean> = [];
        const builder = {
          select() {
            return builder;
          },
          eq(col: string, val: unknown) {
            filters.push((r) => r[col] === val);
            return builder;
          },
          order() {
            return builder;
          },
          async maybeSingle() {
            const matched = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
            return { data: matched[0] ?? null, error: null };
          },
          then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?: ((value: { data: Array<Record<string, unknown>>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
          ) {
            const matched = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
            return Promise.resolve({ data: matched, error: null }).then(onfulfilled, onrejected);
          },
        };
        return builder;
      },
    } as unknown as SupabaseClient<Database>;

    vi.spyOn(supabaseServer, "getSupabaseServerClient").mockResolvedValue(fakeClient);

    const res = await getTeacherRoster(
      new Request("http://localhost/api/teacher/roster?activityId=custom-activity-id&classId=biology-m4-class-b"),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      classId: string;
      className: string;
      totalStudents: number;
      cycle: number;
      students: Array<{ studentId: string; studentName: string; submissionCount: number; cycle: number }>;
    };

    expect(data.classId).toBe("biology-m4-class-a");
    expect(data.className).toBe("ชีววิทยา ม.4 ห้อง A (Pilot)");
    expect(data.totalStudents).toBe(2);
    expect(data.cycle).toBe(2);
    expect(data.students.map((s) => s.studentId)).toEqual(["student-real-a", "student-real-b"]);
    expect(data.students.some((s) => s.studentId.startsWith("401") || s.studentId.startsWith("402"))).toBe(false);
    expect(data.students[0].studentName).toBe("Synthetic Student A");
    expect(data.students[0].submissionCount).toBe(1);
    expect(data.students[0].cycle).toBe(2);
    expect(data.students[1].studentName).toBe("Synthetic Student B");
    expect(data.students[1].submissionCount).toBe(0);
    expect(data.students[1].cycle).toBe(2);
  });

  it("returns persistence mode and session student/class identity from /api/activities (LOS-005)", async () => {
    setLocalStudent("student-session-01");
    const res = await getActivities();
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      activities: Array<{ id: string }>;
      persistence: string;
      session: { studentId: string; classId: string; courseId: string };
    };
    expect(payload.persistence).toBe("memory");
    expect(payload.session).toEqual({
      studentId: "student-session-01",
      classId: "biology-m4-class-a",
      courseId: "biology-m4",
    });
    expect(payload.activities.length).toBeGreaterThan(0);
  });

  it("exports de-identified research evidence in JSON and CSV formats", async () => {
    setLocalStudent("student-beta");
    await postSession(createSubmissionRequest("student-beta", "sub-beta-1"));

    setLocalTeacher("demo-teacher-01");

    // JSON export
    const jsonRes = await getResearchExport(new Request("http://localhost/api/research/export?format=json"));
    expect(jsonRes.status).toBe(200);
    const jsonData = (await jsonRes.json()) as {
      identity: { participantKey: string };
      evidence: Array<{ eventType: string; activityId: string }>;
    };
    expect(jsonData.identity.participantKey).toBe("class-scoped-export");
    expect(jsonData.evidence.length).toBeGreaterThan(0);

    // CSV export
    const csvRes = await getResearchExport(new Request("http://localhost/api/research/export?format=csv"));
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("Content-Type")).toContain("text/csv");
    const csvText = await csvRes.text();
    expect(csvText).toContain("eventId,eventType,activityId,occurredAt,actorType,payloadJson");
    expect(csvText).toContain("ecosystem-food-web-01");
  });

  it("correctly formats CSV evidence rows with escaping", () => {
    const mockEvents: LearningEvent[] = [
      {
        id: "evt-123",
        schemaVersion: 1,
        context: {
          schoolId: "demo-school-01",
          courseId: "biology-m4",
          classId: "biology-m4-class-a",
          activityId: "ecosystem-food-web-01",
          studentId: "anon-student-99",
          adiPhase: "argument",
          role: "student",
          language: "th",
          permissions: [],
          traceId: "tr-1",
          correlationId: "corr-1",
        },
        actor: { type: "student", id: "anon-student-99" },
        studentId: "anon-student-99",
        activityId: "ecosystem-food-web-01",
        eventType: "student_submitted",
        payload: { claim: 'Quote "test" and details', score: 85 },
        correlationId: "corr-1",
        occurredAt: "2026-08-26T10:00:00.000Z",
        createdAt: "2026-08-26T10:00:00.000Z",
      },
    ];

    const csv = formatResearchEvidenceCsv(mockEvents);
    expect(csv).toContain('"evt-123"');
    expect(csv).toContain('"student_submitted"');
    expect(csv).toContain('""claim""');
    expect(csv).toContain('""score"":85');
  });
});
