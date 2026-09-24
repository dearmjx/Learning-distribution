import type { Activity } from "@/lib/domain/types";
import {
  formatApprovedContext,
  formatKnowledgeCitation,
  retrieveKnowledge,
} from "@/lib/knowledge/hybrid-rag";

export interface ApprovedContextDocument {
  id: string;
  courseId: string;
  activityId: string;
  chapterId?: string;
  text: string;
  chunkIds: string[];
  citations: string[];
  approvedBy: string;
  approvedAt: string;
}

export interface ApprovedContextRepository {
  /**
   * Build a scoped context from the activity baseline plus relevant approved
   * chunks. The query is student input used only for retrieval; it is never
   * treated as an instruction or inserted into the approved context.
   */
  getApprovedContext(activity: Activity, query?: string): Promise<ApprovedContextDocument | undefined>;
}

/** Static MVP adapter. Replace the chunk registry with a DB-backed source later. */
export class StaticApprovedContextRepository implements ApprovedContextRepository {
  async getApprovedContext(activity: Activity, query = ""): Promise<ApprovedContextDocument | undefined> {
    if (!activity.courseId || !activity.id || !activity.context.trim()) return undefined;

    const retrievalQuery = [activity.title, activity.prompt, query].filter(Boolean).join("\n");
    const chunks = await retrieveKnowledge(
      retrievalQuery,
      {
        courseId: activity.courseId,
        activityId: activity.id,
        chapterId: activity.chapterId,
      },
      { topK: 3 },
    );
    const citations = [
      `กิจกรรม: ${activity.title}`,
      ...chunks.map(formatKnowledgeCitation),
      "บริบทกิจกรรมที่ครูอนุมัติ",
    ];

    return {
      id: `approved-context-${activity.id}`,
      courseId: activity.courseId,
      activityId: activity.id,
      chapterId: activity.chapterId,
      text: formatApprovedContext(activity.title, activity.context, chunks),
      chunkIds: chunks.map((chunk) => chunk.id),
      citations: [...new Set(citations)],
      approvedBy: chunks[0]?.approvedBy ?? "demo-teacher-01",
      approvedAt: chunks[0]?.approvedAt ?? "2026-08-12T00:00:00.000Z",
    };
  }
}

export const approvedContextRepository = new StaticApprovedContextRepository();
