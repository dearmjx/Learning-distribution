# Learning OS — Ecosystem ADI MVP

ต้นแบบระบบ Learning OS สำหรับงานวิจัย **ADI + AI Coach** ของนักเรียน ม.4
หน่วยการเรียนรู้ชีววิทยาเรื่อง **ระบบนิเวศ**

โครงการนี้เริ่มจากเอกสารวิจัยใน `learning-os-research-docs.zip` และ scaffold ให้เป็น
MVP ที่สามารถต่อยอดไปสู่ระบบทดลองจริงได้ โดยยึดหลักดังนี้:

- Primary outcome: การคิดวิเคราะห์ผ่านโครงสร้าง Claim–Evidence–Reasoning (CER)
- Secondary/exploratory outcome: AI Literacy
- Research design: one-group pretest–posttest; หลีกเลี่ยง causal claim ที่เกินข้อมูล
- AI Coach: ถามนำแบบ Socratic และไม่เขียนคำตอบแทนนักเรียน
- Evidence: เก็บ draft, revision, AI interaction, peer review และ immutable timeline event
- LLM: เรียกผ่าน provider abstraction เพื่อสลับ DeepSeek V3/R1 API หรือ mock provider ได้
- Q4 point deduction: แยก `activity_score` กับ `ai_independence_score` ไว้ก่อนจนกว่าอาจารย์ยืนยัน

## Quick start

```bash
npm install
copy .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000`

ถ้าไม่มี `DEEPSEEK_API_KEY` ระบบจะใช้ mock provider สำหรับทดสอบ flow โดยไม่เรียก API ภายนอก

## Project map

```text
src/
├── app/                         # Next.js UI และ API routes
│   └── api/
├── components/                  # UI components
├── data/course/ecosystem/       # เนื้อหาและกิจกรรมชีวะ ม.4
└── lib/
    ├── ai/                      # LLM provider + coach policy
    ├── analytics/               # authorship indicators
    ├── domain/                  # domain types
    ├── events/                  # learning timeline
    └── repository/              # in-memory MVP adapters

docs/
├── 00_IMPLEMENTATION_PLAN.md    # แผน scaffold และ research mapping
├── 11_ADVISOR_QA_SESSION.md     # script ถาม–ตอบเพื่อขออนุมัติ scope
├── phase-x.md                    # master plan: Factory OS → Learning OS, Phase 1–3
└── DECISIONS.md                 # decision log โดยเฉพาะ Q4

research-source/
└── docs/                         # เอกสารวิจัยเดิมที่แตกจาก ZIP และเก็บเป็น reference
```

เอกสารสำหรับคุยกับอาจารย์อยู่ที่ [`docs/11_ADVISOR_QA_SESSION.md`](docs/11_ADVISOR_QA_SESSION.md)
แผน migration หลักอยู่ที่ [`docs/phase-x.md`](docs/phase-x.md)
ส่วนเอกสารต้นฉบับจาก ZIP อยู่ที่ [`research-source/`](research-source/)

## Important limitation

ตอนนี้ repository เป็น MVP แบบ in-memory เพื่อให้ทดสอบ interaction flow ได้เร็ว ข้อมูลจะหายเมื่อ process restart
ขั้นถัดไปคือเปลี่ยน repository เป็น Postgres/Supabase และทำ consent/authentication ก่อน pilot กับนักเรียนจริง
