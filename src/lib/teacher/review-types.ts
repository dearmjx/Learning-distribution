import type { Activity, AiInteraction, AuthorshipIndicators, LearningEvent, PeerReview, Revision, Submission, TeacherReview } from "@/lib/domain/types";

export interface TeacherReviewSnapshot {
  activities: Activity[];
  submissions: Submission[];
  revisions: Revision[];
  interactions: AiInteraction[];
  peerReviews: PeerReview[];
  reviews: TeacherReview[];
  events: LearningEvent[];
  authorshipBySubmission: Record<string, AuthorshipIndicators | undefined>;
  analytics: {
    submissionCount: number;
    revisionCount: number;
    hintCount: number;
    feedbackCount: number;
    fallbackCount: number;
    teacherReviewCount: number;
  };
}
