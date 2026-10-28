import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { ecosystemKnowledgeChunks } from "@/data/course/ecosystem/knowledge-base";

/** A reviewable, versioned unit of reusable teacher-approved course content. */
export interface CourseContentPack {
  id: string;
  courseId: string;
  version: string;
  title: string;
  activities: typeof ecosystemActivities;
  knowledgeChunks: typeof ecosystemKnowledgeChunks;
}

function assertUniqueIds(values: readonly { id: string }[], kind: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`Duplicate ${kind} id in course content pack: ${value.id}`);
    ids.add(value.id);
  }
}

function defineContentPack(pack: CourseContentPack): CourseContentPack {
  assertUniqueIds(pack.activities, "activity");
  assertUniqueIds(pack.knowledgeChunks, "knowledge chunk");
  if (pack.activities.some((activity) => activity.courseId !== pack.courseId)) {
    throw new Error(`Activity course scope does not match content pack ${pack.id}`);
  }
  if (pack.knowledgeChunks.some((chunk) => chunk.courseId !== pack.courseId || !chunk.approved)) {
    throw new Error(`Knowledge content must be approved and scoped to content pack ${pack.id}`);
  }
  return pack;
}

export const ecosystemContentPack = defineContentPack({
  id: "biology-m4-ecosystem",
  courseId: "biology-m4",
  version: "1.0.0",
  title: "ระบบนิเวศ · ม.4",
  activities: ecosystemActivities,
  knowledgeChunks: ecosystemKnowledgeChunks,
});
