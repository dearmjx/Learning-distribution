import type { KnowledgeChunk } from "@/lib/knowledge/types";

/**
 * Teacher-approved knowledge for the ecosystem activities.
 *
 * To add another chapter, copy one object, give it a new chapterId, and link
 * it to an activity with the same chapterId. See docs/CUSTOMIZE_RAG.md.
 */
export const ecosystemKnowledgeChunks: KnowledgeChunk[] = [
  {
    id: "biology-m4-food-web-basics",
    courseId: "biology-m4",
    chapterId: "food-web",
    chapterTitle: "สายใยอาหารและความสัมพันธ์ของสิ่งมีชีวิต",
    documentType: "lesson",
    title: "โครงสร้างสายใยอาหาร",
    text:
      "สายใยอาหารประกอบด้วยห่วงโซ่อาหารหลายเส้นที่เชื่อมโยงกัน ผู้ผลิตเป็นจุดเริ่มต้นของการถ่ายทอดพลังงาน ส่วนผู้บริโภคแต่ละลำดับขั้นรับพลังงานจากสิ่งมีชีวิตที่กิน",
    keywords: ["ผู้ผลิต", "ผู้บริโภค", "ผู้ล่า", "ห่วงโซ่อาหาร", "สายใยอาหาร"],
    sourceTitle: "ใบความรู้ครู: ระบบนิเวศ",
    sourceSection: "โครงสร้างระบบนิเวศ",
    approved: true,
    approvedBy: "demo-teacher-01",
    approvedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "biology-m4-food-web-cascade",
    courseId: "biology-m4",
    chapterId: "food-web",
    chapterTitle: "สายใยอาหารและความสัมพันธ์ของสิ่งมีชีวิต",
    activityIds: ["ecosystem-food-web-01"],
    documentType: "lesson",
    title: "ผลกระทบแบบลูกโซ่เมื่อผู้ล่าลดลง",
    text:
      "เมื่อผู้ล่าลดลง เหยื่อของผู้ล่าอาจเพิ่มขึ้นและใช้ทรัพยากรมากขึ้น การเปลี่ยนแปลงนั้นสามารถส่งต่อไปยังผู้ผลิตและสิ่งมีชีวิตระดับอื่นในสายใยอาหารได้ แต่ควรสรุปจากหลักฐานของสถานการณ์ที่กำหนด",
    keywords: ["ผู้ล่าลดลง", "ประชากรเหยื่อ", "ผลกระทบลูกโซ่", "ทรัพยากร"],
    sourceTitle: "ใบความรู้ครู: ระบบนิเวศ",
    sourceSection: "การเปลี่ยนแปลงในสายใยอาหาร",
    approved: true,
    approvedBy: "demo-teacher-01",
    approvedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "biology-m4-energy-flow",
    courseId: "biology-m4",
    chapterId: "energy-flow",
    chapterTitle: "การถ่ายทอดพลังงานในระบบนิเวศ",
    documentType: "lesson",
    title: "พลังงานไหลผ่านลำดับขั้นการกิน",
    text:
      "ผู้ผลิตเปลี่ยนพลังงานแสงเป็นพลังงานเคมี พลังงานจะถ่ายทอดไปยังผู้บริโภคเมื่อเกิดการกิน แต่พลังงานส่วนหนึ่งถูกใช้ในการดำรงชีวิตและสูญเสียเป็นความร้อน จึงมีพลังงานส่งต่อไปยังลำดับขั้นถัดไปน้อยลง",
    keywords: ["พลังงาน", "ผู้ผลิต", "ผู้บริโภค", "ความร้อน", "ลำดับขั้นการกิน"],
    sourceTitle: "ใบความรู้ครู: ระบบนิเวศ",
    sourceSection: "การไหลของพลังงาน",
    approved: true,
    approvedBy: "demo-teacher-01",
    approvedAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "biology-m4-energy-rubric",
    courseId: "biology-m4",
    chapterId: "energy-flow",
    chapterTitle: "การถ่ายทอดพลังงานในระบบนิเวศ",
    activityIds: ["ecosystem-energy-flow-01"],
    documentType: "rubric",
    title: "จุดตรวจ CER เรื่องการถ่ายทอดพลังงาน",
    text:
      "คำอธิบายที่มีคุณภาพควรเปรียบเทียบพลังงานระหว่างลำดับขั้น ใช้หลักฐานจากข้อมูลของกิจกรรม และอธิบายกลไกว่าการดำรงชีวิตกับการสูญเสียความร้อนทำให้พลังงานที่ถ่ายทอดลดลงอย่างไร",
    keywords: ["CER", "หลักฐาน", "เหตุผลเชิงกลไก", "เปรียบเทียบพลังงาน"],
    sourceTitle: "รูบริกครู: การไหลของพลังงาน",
    sourceSection: "เกณฑ์ Claim–Evidence–Reasoning",
    approved: true,
    approvedBy: "demo-teacher-01",
    approvedAt: "2026-08-12T00:00:00.000Z",
  },
];
