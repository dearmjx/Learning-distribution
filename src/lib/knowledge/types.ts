export type KnowledgeDocumentType = "lesson" | "rubric" | "objective" | "example";

/**
 * A teacher-approved, retrieval-ready piece of course content.
 *
 * Keep this type free of student data. Student answers must not be added to
 * the course knowledge base unless they have been explicitly anonymised and
 * approved as an example.
 */
export interface KnowledgeChunk {
  id: string;
  courseId: string;
  chapterId: string;
  chapterTitle: string;
  activityIds?: readonly string[];
  documentType: KnowledgeDocumentType;
  title: string;
  text: string;
  keywords?: readonly string[];
  sourceTitle: string;
  sourceSection?: string;
  sourcePage?: string;
  approved: boolean;
  approvedBy: string;
  approvedAt: string;
}

export interface KnowledgeScope {
  courseId: string;
  activityId: string;
  chapterId?: string;
}

export interface RetrievedKnowledgeChunk extends KnowledgeChunk {
  sparseScore: number;
  denseScore?: number;
  fusedScore: number;
  rank: number;
}
