import { getActivity } from "@/data/course/ecosystem/activities";

export interface ApprovedContextDocument {
  id: string;
  courseId: string;
  activityId: string;
  text: string;
  approvedBy: string;
  approvedAt: string;
}

export interface ApprovedContextRepository {
  getApprovedContext(courseId: string, activityId: string): ApprovedContextDocument | undefined;
}

/** Static MVP adapter. A future RAG implementation must implement this port. */
export class StaticApprovedContextRepository implements ApprovedContextRepository {
  getApprovedContext(courseId: string, activityId: string): ApprovedContextDocument | undefined {
    const activity = getActivity(activityId);
    if (!activity || activity.courseId !== courseId) return undefined;
    return {
      id: `approved-context-${activity.id}`,
      courseId: activity.courseId,
      activityId: activity.id,
      text: activity.context,
      approvedBy: "demo-teacher-01",
      approvedAt: "2026-08-12T00:00:00.000Z",
    };
  }
}

export const approvedContextRepository = new StaticApprovedContextRepository();
