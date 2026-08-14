# 05 — RAG Design

> Course Knowledge Retrieval-Augmented Generation Pipeline

---

## RAG Architecture

```
Teacher uploads materials
         │
         ▼
┌─────────────────────────────────┐
│        INGESTION PIPELINE       │
│                                 │
│  PDF / DOCX / TXT               │
│      ↓                          │
│  Text Extraction                │
│      ↓                          │
│  Chunking Strategy              │
│  (semantic / sliding window)    │
│      ↓                          │
│  Embedding (local model)        │
│      ↓                          │
│  Vector DB (pgvector)           │
└─────────────────────────────────┘
         │
         │ (at query time)
         ▼
┌─────────────────────────────────┐
│        RETRIEVAL PIPELINE       │
│                                 │
│  Student question / answer      │
│      ↓                          │
│  Query Embedding                │
│      ↓                          │
│  Semantic Search                │
│      ↓                          │
│  Top-K relevant chunks          │
│      ↓                          │
│  Reranking (optional)           │
│      ↓                          │
│  Context injection → AI Coach   │
└─────────────────────────────────┘
```

---

## Knowledge Sources (Priority Order)

```
Priority 1: Rubric / Assessment Criteria
  → AI Coach ต้องรู้เกณฑ์ก่อนวิเคราะห์ answer

Priority 2: Teacher Materials / Lesson Content
  → บทเรียนที่ครูอนุมัติแล้ว

Priority 3: Textbook (approved sections)
  → ตำราเรียนที่ครูระบุ

Priority 4: Syllabus / Learning Objectives
  → เพื่อรู้ขอบเขตที่ควร/ไม่ควร answer

Priority 5: Approved Examples / Sample Answers
  → ตัวอย่างที่ผ่านการ review แล้ว

[ห้าม] Web / Wikipedia / general knowledge
  → AI ต้องอ้างอิงแค่ course-approved knowledge
```

---

## Chunking Strategy

```javascript
// Recommended: Semantic chunking by section
{
  chunk_size: 512,          // tokens
  overlap: 64,              // tokens
  split_by: "heading",      // ตัดตามหัวข้อก่อน
  fallback: "sentence",     // ถ้าหัวข้อยาวเกิน ตัดตามประโยค
  metadata: {
    course_id: "...",
    document_type: "textbook|rubric|example",
    chapter: "3",
    page: "45",
    approved_by: "teacher_id",
    approved_at: "timestamp"
  }
}
```

---

## Citation in AI Response

AI Coach ต้อง cite source เสมอเมื่ออ้างอิงเนื้อหา

```
❌ Bad:
"การออสโมซิสทำให้น้ำเคลื่อนที่จากความเข้มข้นต่ำไปสูง"

✅ Good:
"ตามบทที่ 3 หน้า 45 ในหนังสือเรียนที่ครูกำหนด
การออสโมซิสคือกระบวนการที่... [paraphrase]
ลองอ่านส่วนนี้แล้วดูว่าคำอธิบายของคุณสอดคล้องกันไหม?"
```

---

## Hallucination Prevention

```
Rule 1: ถ้า confidence < threshold → บอกนักเรียนว่าไม่แน่ใจ
Rule 2: ถ้าหาใน RAG ไม่เจอ → บอกให้ถามครูโดยตรง
Rule 3: ห้าม generate facts ที่ไม่มีใน course materials
Rule 4: ทุก factual claim ต้องมี source chunk อ้างอิง
Rule 5: ถ้า retrieved chunks ขัดแย้งกัน → แจ้งนักเรียนว่ามีมุมมองต่างกัน
```

---

## Teacher Interface for RAG

```
Teacher Dashboard → Knowledge Base

[Upload Document]
  - File: lesson3_osmosis.pdf
  - Type: Lesson Content
  - Scope: visible to all students in course
  - Status: ✅ Indexed (234 chunks)

[Upload Rubric]
  - File: rubric_activity2.pdf  
  - Type: Assessment Criteria
  - Status: ✅ Active (AI Coach uses this)

[View AI Citations]
  - "ครั้งนี้ AI อ้างอิงอะไรบ้างเมื่อให้ feedback นักเรียน"
  - audit trail ของ RAG usage
```

---

## Privacy in RAG

- **Student answers ไม่ถูก index เป็น RAG** ยกเว้นครูอนุมัติให้ใช้เป็น "approved example"
- **Anonymization required** ก่อนใช้งาน student work ใดๆ เป็น training/example
- **Cross-student RAG ห้าม**: AI Coach ของนักเรียน A ไม่เห็นคำตอบของนักเรียน B
