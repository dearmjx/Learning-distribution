import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";
import type { AdiPhase, ClassRosterSummary, RosterStudentProgress } from "@/lib/domain/types";

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const activityFilter = url.searchParams.get("activityId") ?? "ecosystem-food-web-01";

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

    // Group known student IDs from submissions and events
    const studentIdsSet = new Set<string>();
    for (const sub of submissions) studentIdsSet.add(sub.studentId);
    for (const evt of allEvents) {
      if (evt.studentId && evt.studentId !== "demo-teacher-01") {
        studentIdsSet.add(evt.studentId);
      }
    }
    // If no students yet, provide synthetic roster default for classroom preview
    if (studentIdsSet.size === 0) {
      studentIdsSet.add("demo-student-01");
      studentIdsSet.add("student-02");
      studentIdsSet.add("student-03");
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
      };
    });

    const summary: ClassRosterSummary = {
      classId: identity.context.classId || "biology-m4-class-a",
      className: "ชีววิทยา ม.4 ห้อง A (ประจำปีการศึกษา 2026)",
      courseTitle: "ชีววิทยา ม.4: ระบบนิเวศและสายใยอาหาร",
      totalStudents: students.length,
      activeActivityId: activityFilter,
      students,
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
