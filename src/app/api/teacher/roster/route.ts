import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository, getPersistenceMode } from "@/lib/repository/index";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdiPhase, ClassRosterSummary, PaorCycle, RosterStudentProgress } from "@/lib/domain/types";

interface RosterMemberEntry {
  studentId: string;
  studentName: string;
  joinedAt?: string;
}

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({
      requiredRole: "teacher",
      classId: getPersistenceMode() === "supabase" ? new URL(request.url).searchParams.get("classId") ?? undefined : undefined,
    });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const activityFilter = url.searchParams.get("activityId") ?? "ecosystem-food-web-01";
    const activity = await repository.getActivity(activityFilter);
    const persistenceMode = getPersistenceMode();

    const submissions = await repository.listSubmissions();
    const allRevisions = (
      await Promise.all(submissions.map((s) => repository.listRevisions(s.id)))
    ).flat();
    const allEvents = await repository.listLearningEvents();
    const allReviews = (
      await Promise.all(submissions.map((s) => repository.listTeacherReviews(s.id)))
    ).flat();
    const allPeerReviews = (
      await Promise.all(submissions.map((s) => repository.listPeerReviews(s.id)))
    ).flat();

    let resolvedClassId = identity.context.classId;
    let resolvedClassName = identity.context.classId;
    let resolvedCourseTitle = identity.context.courseId;
    let rosterMembers: RosterMemberEntry[] = [];

    if (persistenceMode === "supabase") {
      const client = await getSupabaseServerClient();
      if (!client) {
        return Response.json({ error: "Supabase server client could not be created" }, { status: 503 });
      }

      const { data: membershipRows, error: membershipError } = await client
        .from("memberships")
        .select("profile_id, class_id, role, status, starts_at")
        .eq("class_id", resolvedClassId)
        .eq("role", "student")
        .eq("status", "active")
        .order("starts_at", { ascending: true });
      if (membershipError) {
        throw new Error(`Supabase class roster membership query failed: ${membershipError.message}`);
      }

      const { data: profileRows, error: profileError } = await client
        .from("learning_profiles")
        .select("id, external_id, display_name")
        .eq("course_id", identity.context.courseId);
      if (profileError) {
        throw new Error(`Supabase class roster profile query failed: ${profileError.message}`);
      }

      const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));
      rosterMembers = (membershipRows ?? [])
        .map((m, index) => {
          const profile = profileById.get(m.profile_id);
          if (!profile) return null;
          return {
            studentId: profile.external_id,
            studentName: profile.display_name || `นักเรียนเลขที่ ${index + 1} (${profile.external_id})`,
            joinedAt: m.starts_at,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const { data: classRow } = await client
        .from("classes")
        .select("id, name, course_id")
        .eq("id", resolvedClassId)
        .maybeSingle();
      if (classRow?.name) resolvedClassName = classRow.name;

      const { data: courseRow } = await client
        .from("courses")
        .select("id, title")
        .eq("id", identity.context.courseId)
        .maybeSingle();
      if (courseRow?.title) resolvedCourseTitle = courseRow.title;
    } else {
      // Synthetic 29/28-student roster for memory/demo mode only
      const classIdParam = url.searchParams.get("classId") ?? identity.context.classId ?? "biology-m4-class-a";
      const isClassB = classIdParam === "biology-m4-class-b" || classIdParam.includes("4-2");
      const totalExpectedStudents = isClassB ? 28 : 29;
      const prefix = isClassB ? "402" : "401";
      const rosterStudentIds = Array.from(
        { length: totalExpectedStudents },
        (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`,
      );

      const studentIdsSet = new Set<string>(rosterStudentIds);
      for (const sub of submissions) {
        if (isClassB ? sub.studentId.startsWith("402") : !sub.studentId.startsWith("402")) {
          studentIdsSet.add(sub.studentId);
        }
      }
      for (const evt of allEvents) {
        if (evt.studentId && evt.studentId !== "demo-teacher-01" && evt.studentId !== "teacher") {
          if (isClassB ? evt.studentId.startsWith("402") : !evt.studentId.startsWith("402")) {
            studentIdsSet.add(evt.studentId);
          }
        }
      }

      resolvedClassId = isClassB ? "biology-m4-class-b" : "biology-m4-class-a";
      resolvedClassName = isClassB ? "ชีววิทยา ม.4 ห้อง 2 (28 คน)" : "ชีววิทยา ม.4 ห้อง 1 (29 คน)";
      resolvedCourseTitle = "ชีววิทยา ม.4: ระบบนิเวศ (Action Research Cohort 57 คน)";
      rosterMembers = Array.from(studentIdsSet).map((studentId, index) => ({
        studentId,
        studentName: `นักเรียนเลขที่ ${index + 1} (${studentId})`,
      }));
    }

    const students: RosterStudentProgress[] = rosterMembers.map((member) => {
      const { studentId, studentName, joinedAt } = member;
      // Sort explicitly: repositories differ in order (Supabase returns newest first).
      const studentSubs = submissions
        .filter((s) => s.studentId === studentId && (!activityFilter || s.activityId === activityFilter))
        .sort((a, b) => a.version - b.version);
      const latestSub = studentSubs[studentSubs.length - 1];
      const studentEvts = allEvents
        .filter((e) => e.studentId === studentId && (!activityFilter || e.activityId === activityFilter))
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      const studentRevs = allRevisions.filter(
        (r) => r.studentId === studentId && (!activityFilter || r.activityId === activityFilter),
      );
      const studentPeerRev = allPeerReviews.find(
        (pr) => pr.reviewerStudentId === studentId || pr.authorStudentId === studentId,
      );
      const studentReview = latestSub ? allReviews.find((r) => r.submissionId === latestSub.id) : undefined;

      let currentPhase: AdiPhase = "orientation";
      if (studentReview) {
        currentPhase = "reflection";
      } else if (latestSub) {
        if (latestSub.workflowState === "revising" || latestSub.workflowState === "revision") {
          currentPhase = "revision";
        } else if (latestSub.workflowState === "peer_review") {
          currentPhase = "peer_review";
        } else {
          currentPhase = "argument";
        }
      } else if (studentEvts.length > 0) {
        currentPhase = "investigation";
      }

      const hintCount = studentEvts.filter((e) => e.eventType === "hint_requested").length;
      const lastActive = studentEvts.length > 0
        ? studentEvts[studentEvts.length - 1].occurredAt
        : (latestSub?.submittedAt ?? joinedAt ?? new Date().toISOString());

      const cycle: PaorCycle = latestSub?.cycle ?? activity?.cycle ?? 1;

      return {
        studentId,
        studentName,
        activityId: activityFilter,
        currentPhase,
        workflowState: latestSub?.workflowState ?? "draft",
        submissionCount: studentSubs.length,
        revisionCount: studentRevs.length,
        hintCount,
        peerReviewCompleted: Boolean(studentPeerRev),
        teacherScore: studentReview?.score,
        lastActiveAt: lastActive,
        cycle,
      };
    });

    const summary: ClassRosterSummary = {
      classId: resolvedClassId,
      className: resolvedClassName,
      courseTitle: resolvedCourseTitle,
      totalStudents: students.length,
      activeActivityId: activityFilter,
      students,
      cycle: activity?.cycle ?? 1,
    };

    return Response.json(summary, {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

