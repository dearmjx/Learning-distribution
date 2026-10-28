import type { KnowledgeScope } from "@/lib/knowledge/types";

/** Synthetic retrieval checks. Expected IDs are reviewed alongside course content changes. */
export interface RagEvaluationCase {
  id: string;
  query: string;
  scope: KnowledgeScope;
  expectedChunkIds: string[];
}

export const ecosystemRagEvaluationCases: RagEvaluationCase[] = [
  {
    id: "food-web-predator-decline",
    query: "ถ้าประชากรงูลดลง เหยื่อและพืชจะเปลี่ยนแปลงอย่างไร",
    scope: { courseId: "biology-m4", activityId: "ecosystem-food-web-01", chapterId: "food-web" },
    expectedChunkIds: ["biology-m4-food-web-cascade"],
  },
  {
    id: "food-web-structure",
    query: "ผู้ผลิตและผู้บริโภคเชื่อมโยงกันในสายใยอาหารอย่างไร",
    scope: { courseId: "biology-m4", activityId: "ecosystem-food-web-01", chapterId: "food-web" },
    expectedChunkIds: ["biology-m4-food-web-basics"],
  },
  {
    id: "energy-flow-mechanism",
    query: "พลังงานลดลงระหว่างลำดับขั้นการกินเพราะเหตุใด",
    scope: { courseId: "biology-m4", activityId: "ecosystem-energy-flow-01", chapterId: "energy-flow" },
    expectedChunkIds: ["biology-m4-energy-flow"],
  },
  {
    id: "energy-cer-rubric",
    query: "CER ที่ดีควรใช้หลักฐานและอธิบายกลไกการสูญเสียความร้อนอย่างไร",
    scope: { courseId: "biology-m4", activityId: "ecosystem-energy-flow-01", chapterId: "energy-flow" },
    expectedChunkIds: ["biology-m4-energy-rubric"],
  },
  {
    id: "activity-scope-isolation",
    query: "อธิบายวัฏจักรไนโตรเจนและการตรึงไนโตรเจน",
    scope: { courseId: "biology-m4", activityId: "ecosystem-food-web-01", chapterId: "food-web" },
    expectedChunkIds: [],
  },
];
