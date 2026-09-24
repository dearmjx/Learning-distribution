import { describe, expect, it } from "vitest";
import { getActivity } from "@/data/course/ecosystem/activities";
import { approvedContextRepository } from "@/lib/knowledge/approved-context";
import { retrieveKnowledge, tokenizeThai } from "@/lib/knowledge/hybrid-rag";
import type { KnowledgeChunk } from "@/lib/knowledge/types";

const customChunks: KnowledgeChunk[] = [
  {
    id: "chapter-a-core",
    courseId: "course-a",
    chapterId: "chapter-a",
    chapterTitle: "บท A",
    documentType: "lesson",
    title: "การสังเคราะห์ด้วยแสง",
    text: "พืชใช้พลังงานแสงเพื่อสร้างอาหาร",
    keywords: ["พืช", "แสง"],
    sourceTitle: "เอกสาร A",
    approved: true,
    approvedBy: "teacher-a",
    approvedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    id: "chapter-b-core",
    courseId: "course-a",
    chapterId: "chapter-b",
    chapterTitle: "บท B",
    documentType: "lesson",
    title: "การแบ่งเซลล์",
    text: "เซลล์แบ่งตัวเพื่อการเจริญเติบโต",
    keywords: ["เซลล์", "แบ่งตัว"],
    sourceTitle: "เอกสาร B",
    approved: true,
    approvedBy: "teacher-a",
    approvedAt: "2026-08-30T00:00:00.000Z",
  },
  {
    id: "chapter-a-unapproved",
    courseId: "course-a",
    chapterId: "chapter-a",
    chapterTitle: "บท A",
    documentType: "lesson",
    title: "ข้อมูลที่ยังไม่อนุมัติ",
    text: "พืชและแสง",
    sourceTitle: "ร่างเอกสาร",
    approved: false,
    approvedBy: "teacher-a",
    approvedAt: "2026-08-30T00:00:00.000Z",
  },
];

describe("scoped hybrid RAG", () => {
  it("tokenizes Thai text into searchable words", () => {
    const tokens = tokenizeThai("พลังงาน ระบบ นิเวศ");
    expect(tokens).toContain("พลังงาน");
    expect(tokens).toContain("ระบบ");
    expect(tokens).toContain("นิเวศ");
  });

  it("keeps retrieval inside the requested course and chapter", async () => {
    const results = await retrieveKnowledge(
      "พืชใช้พลังงานแสงอย่างไร",
      { courseId: "course-a", activityId: "activity-a", chapterId: "chapter-a" },
      { chunks: customChunks, topK: 5 },
    );

    expect(results.map((result) => result.id)).toEqual(["chapter-a-core"]);
    expect(results.every((result) => result.approved)).toBe(true);
    expect(results.some((result) => result.id === "chapter-b-core")).toBe(false);
  });

  it("fuses a dense ranking without allowing out-of-scope ids", async () => {
    const results = await retrieveKnowledge(
      "เซลล์",
      { courseId: "course-a", activityId: "activity-a", chapterId: "chapter-a" },
      {
        chunks: customChunks,
        denseRetriever: {
          async search() {
            return [
              { id: "chapter-b-core", score: 1 },
              { id: "chapter-a-core", score: 0.5 },
            ];
          },
        },
      },
    );

    expect(results.every((result) => result.id === "chapter-a-core")).toBe(true);
  });

  it("builds approved context from the activity baseline and matching chapter chunks", async () => {
    const activity = getActivity("ecosystem-energy-flow-01");
    expect(activity).toBeDefined();

    const document = await approvedContextRepository.getApprovedContext(activity!, "ความร้อน");

    expect(document).toBeDefined();
    expect(document?.text).toContain(activity!.context);
    expect(document?.text).toContain("[APPROVED_ACTIVITY_CONTEXT]");
    expect(document?.chunkIds.every((id) => id.includes("energy"))).toBe(true);
    expect(document?.citations.some((citation) => citation.includes("การถ่ายทอดพลังงาน"))).toBe(true);
  });
});
