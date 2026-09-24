# วิธีเปลี่ยนเนื้อหาและใช้ RAG กับบทอื่น

เอกสารนี้อธิบายวิธีเพิ่มบทเรียนหรือเปลี่ยนจากหน่วย **ระบบนิเวศ** ไปเป็นบทอื่น โดยไม่ต้องแก้ API หรือ prompt ของ AI Coach ทุกครั้ง

## ภาพรวมการทำงาน

```text
Activity (courseId + chapterId)
        │
        ├─ activity.context          บริบทพื้นฐานที่ครูอนุมัติ
        └─ student question / CER    ใช้เป็น query เท่านั้น
                    │
                    ▼
        scoped retrieval: course → chapter → activity
                    │
                    ▼
        Thai BM25 + optional dense RRF
                    │
                    ▼
        approved context → Socratic AI Coach
```

RAG จะค้นเฉพาะ chunk ที่ `approved: true`, `courseId` ตรงกัน, `chapterId` ตรงกัน และถ้า chunk ระบุ `activityIds` จะต้องตรงกับกิจกรรมด้วย ดังนั้นเนื้อหาของบทหนึ่งจะไม่ไหลไปปนกับอีกบท หาก activity จากฐานข้อมูลเก่ายังไม่มี `chapterId` ระบบจะใช้เฉพาะ chunk ที่ระบุ `activityIds` ตรงกิจกรรมนั้น เพื่อป้องกันข้อมูลข้ามบท

## ไฟล์ที่ต้องแก้

| ต้องการทำอะไร | ไฟล์ |
|---|---|
| แก้โจทย์/บริบท/กิจกรรม | `src/data/course/ecosystem/activities.ts` |
| เพิ่ม knowledge chunk ของบทเดิม | `src/data/course/ecosystem/knowledge-base.ts` |
| เพิ่ม course ใหม่เข้า registry | `src/data/course/knowledge-base.ts` |
| เปลี่ยนกติกาการค้นหรือจำนวน chunk | `src/lib/knowledge/hybrid-rag.ts` |
| ตรวจจุดประกอบ approved context | `src/lib/knowledge/approved-context.ts` |

## ขั้นตอนเพิ่มบทใหม่ใน course เดิม

### 1. เพิ่ม `chapterId` ให้ activity

ใน `src/data/course/ecosystem/activities.ts` ให้ใช้ key เดียวกันระหว่าง activity กับ knowledge chunks

```ts
{
  id: "ecosystem-carbon-cycle-01",
  courseId: "biology-m4",
  unit: "ระบบนิเวศ",
  chapterId: "carbon-cycle",
  title: "อธิบายวัฏจักรคาร์บอน",
  adiPhase: "investigation",
  prompt: "อธิบายการเคลื่อนย้ายคาร์บอนโดยเขียนเป็น Claim–Evidence–Reasoning",
  context: "บริบทสถานการณ์ที่ครูอนุมัติสำหรับกิจกรรมนี้",
  rubricDimensions: ["claim", "evidence", "reasoning"],
  peerReviewAllowed: true,
}
```

`chapterId` ควรเป็นภาษาอังกฤษแบบสั้นและไม่เปลี่ยนภายหลัง เช่น `carbon-cycle`, `photosynthesis`, `cell-division`

### 2. เพิ่ม chunks ที่ครูตรวจแล้ว

เพิ่ม object ใน `src/data/course/ecosystem/knowledge-base.ts`

```ts
{
  id: "biology-m4-carbon-cycle-core-01",
  courseId: "biology-m4",
  chapterId: "carbon-cycle",
  chapterTitle: "วัฏจักรคาร์บอน",
  documentType: "lesson",
  title: "การหมุนเวียนคาร์บอน",
  text: "ข้อเท็จจริงหรือกลไกจากเอกสารที่ครูอนุมัติแล้วหนึ่งแนวคิด",
  keywords: ["คาร์บอน", "สังเคราะห์ด้วยแสง", "การหายใจ"],
  sourceTitle: "ใบความรู้ครู: วัฏจักรคาร์บอน",
  sourceSection: "การหมุนเวียนสาร",
  approved: true,
  approvedBy: "teacher-id",
  approvedAt: "2026-08-30T00:00:00.000Z",
}
```

ถ้าข้อมูลใช้ได้กับทุกกิจกรรมในบท ให้ไม่ต้องใส่ `activityIds` ถ้าข้อมูลเป็นเฉพาะกิจกรรม ให้ใส่ดังนี้

```ts
activityIds: ["ecosystem-carbon-cycle-01"],
```

ควรแยกหนึ่ง chunk ต่อหนึ่งแนวคิดหรือหนึ่งเกณฑ์ CER ไม่ควรนำหนังสือทั้งบทใส่เป็น chunk เดียว และต้องเก็บ `sourceTitle/sourceSection` เพื่อให้ Coach อ้างอิงได้

### 3. ตรวจ registry

ถ้าเพิ่ม chunk ใน `ecosystem/knowledge-base.ts` ไม่ต้องแก้ registry เพราะถูก import อยู่แล้ว ถ้าเพิ่ม course ใหม่ ให้เพิ่ม import และ spread ใน `src/data/course/knowledge-base.ts`

```ts
import { photosynthesisKnowledgeChunks } from "@/data/course/photosynthesis/knowledge-base";

export const approvedKnowledgeChunks: KnowledgeChunk[] = [
  ...ecosystemKnowledgeChunks,
  ...photosynthesisKnowledgeChunks,
];
```

### 4. ไม่ต้องแก้ route หรือ prompt

`/api/sessions` และ `/api/coach/chat` จะส่งคำถาม/ร่าง CER เข้า retriever ให้อัตโนมัติ ส่วน Coach จะได้รับเฉพาะ activity context และ chunk ที่ผ่าน scope แล้ว จึงไม่ต้อง copy prompt ชุดใหม่สำหรับทุกบท

## การเปลี่ยนบทเดิม

1. แก้ `prompt` และ `context` ของ activity
2. แก้หรือเพิ่ม chunks ที่ `chapterId` เดิม
3. ตรวจว่า `approved: true` เฉพาะเนื้อหาที่ครูอนุมัติแล้ว
4. รันคำสั่งตรวจสอบด้านล่าง

ระบบจะใส่ `activity.context` ไว้เป็นฐานเสมอ แล้วจึงต่อ retrieved chunks ดังนั้น policy จะยังตรวจได้ว่าบริบทกิจกรรมที่อนุมัติอยู่ใน prompt แม้จะเพิ่ม RAG context เข้าไปแล้ว

## Dense/vector search ในอนาคต

ปัจจุบันค่าเริ่มต้นเป็น BM25 ที่ใช้ `Intl.Segmenter("th")` จึงรันได้โดยไม่ต้องมี embedding service `src/lib/knowledge/hybrid-rag.ts` มี port ชื่อ `DenseKnowledgeRetriever` ให้ต่อกับ pgvector, Ollama embeddings หรือบริการอื่นได้ เมื่อส่ง adapter เข้า `retrieveKnowledge` ระบบจะรวมอันดับ sparse และ dense ด้วย Reciprocal Rank Fusion (RRF)

อย่าเอา student answer เข้า registry นี้โดยอัตโนมัติ หากต้องใช้เป็นตัวอย่างต้อง anonymise และให้ครูอนุมัติก่อนตามนโยบายวิจัย

## ตรวจสอบหลังแก้ไฟล์

```bash
npm run typecheck
npm test
```

ถ้าเพิ่มบทใหม่ ควรเพิ่ม test ที่ตรวจอย่างน้อยว่า:

- query ของบท A ไม่ได้ผลลัพธ์จากบท B
- chunk ที่ `approved: false` ไม่ถูกคืนผล
- chunk ที่มี `activityIds` ไม่ไปปรากฏในกิจกรรมอื่น
- citation แสดง chapter และ source ถูกต้อง

## ขอบเขตที่ยังเป็น ecosystem-specific

การเปลี่ยน RAG และ Coach ทำให้ชั้นความรู้ตอบได้กับบทอื่น แต่หน้าจอ ADI บางส่วนยังมีตัวอย่างสถานการณ์ระบบนิเวศแบบเขียนตายตัว เช่น `phase1-orientation.tsx`, `phase2-identification.tsx` และ `phase3-investigation.tsx` หากต้องการเปลี่ยนทั้งประสบการณ์ UI ให้เป็นบทใหม่ ต้องย้ายข้อมูลตัวอย่างเหล่านั้นมาเป็น config ต่อ activity เพิ่มเติม นอกเหนือจากการเพิ่ม knowledge chunks
