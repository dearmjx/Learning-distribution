import { getActivity } from "@/data/course/ecosystem/activities";
import { DEMO_SCOPE, createDemoTeacherContext } from "@/lib/context/learning-context";
import { teacherReviewInputSchema, recordTeacherReview } from "@/lib/education/teacher-review";
import { listLearningEvents } from "@/lib/events/timeline";
import type { AuthorshipIndicators } from "@/lib/domain/types";
import { listAiInteractions, listPeerReviews, listRevisions, listSubmissions, listTeacherReviews, getSubmission } from "@/lib/repository/memory-repository";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

function snapshot(): TeacherReviewSnapshot {
  const submissions = listSubmissions(DEMO_SCOPE.studentId);
  const revisions = submissions.flatMap((submission) => listRevisions(submission.id));
  const interactions = listAiInteractions(DEMO_SCOPE.studentId);
  const peerReviews = submissions.flatMap((submission) => listPeerReviews(submission.id));
  const reviews = submissions.flatMap((submission) => listTeacherReviews(submission.id));
  const events = listLearningEvents(DEMO_SCOPE.studentId);
  const authorshipBySubmission: Record<string, AuthorshipIndicators | undefined> = {};
  for (const event of events) {
    if (event.eventType !== "authorship_indicator_created") continue;
    const submissionId = typeof event.payload.submissionId === "string" ? event.payload.submissionId : undefined;
    if (!submissionId) continue;
    const { submissionId: _submissionId, ...indicators } = event.payload;
    authorshipBySubmission[submissionId] = indicators as unknown as AuthorshipIndicators;
  }
  return {
    submissions,
    revisions,
    interactions,
    peerReviews,
    reviews,
    events,
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

export function GET() {
  return Response.json(snapshot());
}

export async function POST(request: Request) {
  const parsed = teacherReviewInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "ข้อมูล teacher review ไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  const submission = getSubmission(parsed.data.submissionId);
  if (!submission) return Response.json({ error: "ไม่พบ submission" }, { status: 404 });
  const activity = getActivity(submission.activityId);
  if (!activity) return Response.json({ error: "ไม่พบ activity" }, { status: 404 });
  if (parsed.data.teacherId !== DEMO_SCOPE.teacherId) return Response.json({ error: "ไม่อนุญาตให้ครูคนอื่น review" }, { status: 403 });

  try {
    const review = recordTeacherReview(createDemoTeacherContext(activity.id), parsed.data);
    return Response.json({ review, snapshot: snapshot() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "บันทึก review ไม่สำเร็จ" }, { status: 409 });
  }
}
