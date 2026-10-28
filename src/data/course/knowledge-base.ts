import { ecosystemContentPack } from "@/data/course/ecosystem/content-pack";
import type { KnowledgeChunk } from "@/lib/knowledge/types";

/**
 * The application-wide approved knowledge registry.
 *
 * Add a course import and spread it into this array when a new course is
 * introduced. Retrieval always filters this registry by course and activity
 * scope before scoring anything.
 */
export const approvedKnowledgeChunks: KnowledgeChunk[] = [
  ...ecosystemContentPack.knowledgeChunks.map((chunk) => ({
    ...chunk,
    contentVersion: ecosystemContentPack.version,
  })),
];
