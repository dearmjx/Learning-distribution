import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";
import type { AdiPhase, ClassRosterSummary, PaorCycle, RosterStudentProgress } from "@/lib/domain/types";

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const activityFilter = url.searchParams.get("activityId") ?? "ecosystem-food-web-01";
    const classIdParam = url.searchParams.get("classId") ?? identity.context.classId ?? "biology-m4-class-a";
    const isClassB = classIdParam === "biology-m4-class-b" || classIdParam.includes("4-2");

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

    // Default 57 student roster: 29 for M.4/1, 28 for M.4/2
    const totalExpectedStudents = isClassB ? 28 : 29;
    const prefix = isClassB ? "402" : "401";
    const rosterStudentIds = Array.from({ length: totalExpectedStudents }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);

    // Group known student IDs from submissions and events
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

    const students: RosterStudentProgress[] = Array.from(studentIdsSet).map((studentId, index) => {
      const studentSubs = submissions.filter(
        (s) => s.studentId === studentId && (!activityFilter || s.activityId === activityFilter),
      );
      const latestSub = studentSubs[studentSubs.length - 1];
      const studentEvts = allEvents.filter(
        (e) => e.studentId === studentId && (!activityFilter || e.activityId === activityFilter),
      );
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
        : (latestSub?.submittedAt ?? new Date().toISOString());

      const cycle: PaorCycle = (activityFilter.includes("energy") || latestSub?.cycle === 2) ? 2 : 1;

      return {
        studentId,
        studentName: `นักเรียนเลขที่ ${index + 1} (${studentId})`,
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
      classId: isClassB ? "biology-m4-class-b" : "biology-m4-class-a",
      className: isClassB ? "ชีววิทยา ม.4 ห้อง 2 (28 คน)" : "ชีววิทยา ม.4 ห้อง 1 (29 คน)",
      courseTitle: "ชีววิทยา ม.4: ระบบนิเวศ (Action Research Cohort 57 คน)",
      totalStudents: students.length,
      activeActivityId: activityFilter,
      students,
      cycle: (activityFilter.includes("energy")) ? 2 : 1,
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

