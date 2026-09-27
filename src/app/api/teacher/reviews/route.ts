import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { teacherReviewInputSchema, recordTeacherReviewWithRepository } from "@/lib/education/teacher-review";
import type { AuthorshipIndicators, LearningEvent } from "@/lib/domain/types";
import { getLearningRepository } from "@/lib/repository/index";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

async function snapshot(repository: Awaited<ReturnType<typeof getLearningRepository>>, courseId: string): Promise<TeacherReviewSnapshot> {
  const submissions = await repository.listSubmissions();
  const revisions = (await Promise.all(submissions.map((submission) => repository.listRevisions(submission.id)))).flat();
  const interactions = (await Promise.all(submissions.map((submission) => repository.listInteractions(submission.studentId, submission.activityId)))).flat();
  const peerReviews = (await Promise.all(submissions.map((submission) => repository.listPeerReviews(submission.id)))).flat();
  const reviews = (await Promise.all(submissions.map((submission) => repository.listTeacherReviews(submission.id)))).flat();
  const events = await repository.listLearningEvents();
  const activities = await repository.listActivities(courseId);
  const authorshipBySubmission: Record<string, AuthorshipIndicators | undefined> = {};
  for (const event of events) {
    if (event.eventType !== "authorship_indicator_created") continue;
    const submissionId = typeof event.payload.submissionId === "string" ? event.payload.submissionId : undefined;
    if (!submissionId) continue;
    const { submissionId: _submissionId, ...indicators } = event.payload;
    authorshipBySubmission[submissionId] = indicators as unknown as AuthorshipIndicators;
  }
  return {
    activities,
    submissions,
    revisions,
    interactions,
    peerReviews,
    reviews,
    events: events as LearningEvent[],
    authorshipBySubmission,
    analytics: {
      submissionCount: submissions.length,
      revisionCount: revisions.length,
      hintCount: events.filter((event) => event.eventType === "hint_requested").length,
      feedbackCount: events.filter((event) => event.eventType === "ai_feedback_received").length,
      fallbackCount: interactions.filter((interaction) => interaction.fallbackUsed).length,
      teacherReviewCount: reviews.length,
    },
  };
}

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher", classId: new URL(request.url).searchParams.get("classId") ?? undefined });
    const repository = await getLearningRepository(identity);
    return Response.json(await snapshot(repository, identity.context.courseId), {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = teacherReviewInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "ข้อมูล teacher review ไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher", classId: new URL(request.url).searchParams.get("classId") ?? undefined });
    const repository = await getLearningRepository(identity);
    const submission = await repository.getSubmission(parsed.data.submissionId);
    if (!submission) return Response.json({ error: "ไม่พบ submission ใน class scope ของครู" }, { status: 404 });
    const activity = await repository.getActivity(submission.activityId);
    if (!activity) return Response.json({ error: "ไม่พบ activity" }, { status: 404 });
    const review = await recordTeacherReviewWithRepository(identity.context, parsed.data, repository);
    return Response.json({ review, snapshot: await snapshot(repository, identity.context.courseId) }, {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    if (error instanceof Error && /scope|scoped teacher|not found/i.test(error.message)) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return authErrorResponse(error);
  }
}

