# 02 — Theoretical Framework

> กรอบแนวคิดและทฤษฎีที่รองรับงานวิจัย

---

## แผนที่กรอบแนวคิด

```
┌─────────────────────────────────────────────────────────┐
│                   LEARNING OS                           │
├──────────────────────┬──────────────────────────────────┤
│   PEDAGOGY LAYER     │      AI LAYER                    │
│                      │                                  │
│  ADI Framework       │  Socratic AI Tutoring            │
│  (Argument-Driven    │  (Guided questioning,            │
│   Inquiry)           │   not answer-giving)             │
│         ↕            │           ↕                      │
│  Constructivism      │  Human-in-the-Loop               │
│  (Vygotsky ZPD)      │  (Teacher as final authority)   │
│         ↕            │           ↕                      │
│  Formative           │  AI Literacy Framework           │
│  Assessment          │  (Long & Magerko, 2020)          │
└──────────────────────┴──────────────────────────────────┘
```

---

## 1. Argument-Driven Inquiry (ADI)

### แนวคิดหลัก
ADI คือกระบวนการสืบเสาะทางวิทยาศาสตร์ที่เน้นให้นักเรียนสร้าง **ข้อโต้แย้ง (Argument)**
จากหลักฐาน แล้วนำเสนอและปรับปรุงผ่านการวิจารณ์จากเพื่อนและครู

### ขั้นตอน ADI (8 ขั้น)
```
1. Identify Task          → นักเรียนรับโจทย์/คำถามวิจัย
2. Collect Data           → รวบรวมหลักฐาน/ข้อมูล
3. Develop Argument       → สร้าง claim + evidence + reasoning
4. Argument Session       → นำเสนอและรับ feedback จากกลุ่ม
5. Explicit Reflective    → สะท้อนคิดกระบวนการ
6. Write Investigation    → เขียนรายงาน
7. Double-Blind Review    → เพื่อนตรวจแบบไม่รู้เจ้าของ
8. Revise & Submit        → แก้ไขและส่งงานฉบับสมบูรณ์
```

### การบูรณาการกับ AI ใน Learning OS
| ADI Step | AI Role | Human Role |
|----------|---------|------------|
| ขั้น 1 | Bot Dear ช่วยนักเรียน clarify โจทย์ | ครูออกแบบโจทย์ |
| ขั้น 3 | AI Coach ถามคำถาม Socratic | นักเรียนคิดเอง |
| ขั้น 4 | AI วิเคราะห์ argument structure | เพื่อน + ครูวิจารณ์จริง |
| ขั้น 6 | AI ให้ feedback การเขียน | ครู review สุดท้าย |
| ขั้น 7 | AI ช่วย anonymize + queue | นักเรียน peer review |
| ขั้น 8 | AI สรุป revision history | ครูตัดเกรดสุดท้าย |

---

## 2. Socratic Method in AI Tutoring

### หลักการ
AI ไม่ให้คำตอบโดยตรง แต่ใช้คำถามนำให้นักเรียนค้นพบด้วยตัวเอง

### ลำดับการถามของ AI Coach
```
Level 1 — Clarification
  "คุณหมายความว่าอะไร เมื่อพูดว่า [X]?"

Level 2 — Probe Assumptions  
  "ทำไมคุณถึงสมมติว่า [Y] เป็นจริง?"

Level 3 — Evidence
  "หลักฐานใดในบทเรียนสนับสนุนข้อสรุปของคุณ?"

Level 4 — Alternative Perspectives
  "ถ้าใครมองว่า [Z] จะเกิดอะไรขึ้นกับ argument ของคุณ?"

Level 5 — Implications
  "ถ้าข้อสรุปของคุณถูกต้อง มันนำไปสู่อะไร?"
```

---

## 3. Zone of Proximal Development (Vygotsky)

Bot Dear ทำหน้าที่เป็น **Scaffolding** — ช่วยในระดับที่นักเรียนยังทำไม่ได้คนเดียว
แต่ค่อยๆ ลด scaffolding เมื่อนักเรียนเชี่ยวชาญขึ้น

```
ZPD Model:
┌─────────────────────────────────┐
│    Cannot do (even with help)   │ ← AI ปฏิเสธ (out of scope)
├─────────────────────────────────┤
│    Zone of Proximal Development │ ← AI Coach เข้ามาช่วย
│    (with scaffolding from AI)   │
├─────────────────────────────────┤
│    Can do independently         │ ← AI ลด intervention
└─────────────────────────────────┘
```

---

## 4. AI Literacy Framework

อ้างอิง Long & Magerko (2020) + UNESCO AI Competency Framework (2023)

### 5 มิติของ AI Literacy ที่วัดในงานวิจัยนี้

| มิติ | คำอธิบาย | ตัวบ่งชี้ |
|------|----------|----------|
| **1. What is AI** | เข้าใจว่า AI คืออะไร ทำงานอย่างไร | อธิบาย LLM, RAG ได้ |
| **2. Critical Evaluation** | ประเมิน output ของ AI ได้ | แยก hallucination ออกได้ |
| **3. Ethical Awareness** | ตระหนักถึงผลกระทบของ AI | รู้ bias, privacy, PDPA |
| **4. Collaborative Use** | ใช้ AI เป็นเครื่องมือไม่ใช่ replacement | ใช้ Bot Dear เพื่อคิด ไม่ใช่ copy |
| **5. Agency** | ควบคุมการใช้ AI ของตนเองได้ | เลือกเมื่อไรจะ/ไม่ถาม AI |

---

## 5. Human-in-the-Loop (HITL)

### หลักการในบริบทการศึกษา
ครูคือผู้มีอำนาจสุดท้ายในการตัดสิน — AI เป็นเพียงผู้ช่วยวิเคราะห์

```
Automation Level Scale (สำหรับ Learning OS):

Level 1 — AI แนะนำ, นักเรียนตัดสินใจทุกอย่าง
Level 2 — AI แนะนำ + แจ้งเตือน, นักเรียน/ครูอนุมัติ    ← เราอยู่ที่นี่
Level 3 — AI ทำอัตโนมัติ แต่ครู review ได้
Level 4 — AI ทำอัตโนมัติ, ครู override ได้บางส่วน
Level 5 — AI ตัดสินใจทั้งหมด                           ← ห้ามถึงระดับนี้
```

---

## 6. Formative Assessment Theory

Learning OS ใช้ **Assessment FOR Learning** ไม่ใช่ Assessment OF Learning

| Formative (เราทำ) | Summative (ครูทำ) |
|-------------------|------------------|
| AI Feedback ระหว่างเรียน | ครูตัดเกรดสุดท้าย |
| Peer Review ใน ADI | ข้อสอบปลายภาค |
| Revision tracking | Learning Portfolio |
| Bot Dear memory | ไม่ใช้ AI ตัดเกรด |

---

## TODO

- [ ] เพิ่ม references APA 7th
- [ ] เพิ่มงานวิจัยที่เกี่ยวข้องในบริบทไทย
- [ ] เพิ่ม meta-analysis ของ AI tutoring ในระดับมัธยม
