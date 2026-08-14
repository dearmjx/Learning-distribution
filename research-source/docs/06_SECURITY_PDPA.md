# 06 — Security & PDPA Compliance

> Security Layer, Guardrail Design, และ PDPA สำหรับข้อมูลนักเรียนผู้เยาว์

---

## ทำไม Security ถึงสำคัญเป็นพิเศษในระบบนี้

1. **นักเรียน ม.4 เป็นผู้เยาว์** — PDPA มีข้อกำหนดพิเศษสำหรับข้อมูลเด็ก
2. **ข้อมูลการเรียนรู้ = sensitive** — ผลการเรียน, จุดอ่อน, ความคิดของเด็กไม่ควรรั่วไหล
3. **AI อาจ hallucinate หรือถูก manipulate** — ต้องมี guardrail
4. **Self-host** — ไม่ส่งข้อมูลนักเรียนออกนอกโรงเรียน

---

## Security Layers

```
Layer 1: Network
  - HTTPS only
  - School network / VPN required
  - No public API endpoints for student data

Layer 2: Authentication
  - Student login (school account)
  - Teacher login (separate role)
  - Session timeout
  - No sharing accounts

Layer 3: Authorization (RBAC)
  - Student: own data only
  - Teacher: own class only
  - AI Coach: read-only access to course materials
  - Bot Dear: read-only access to own student's memory

Layer 4: AI Guardrail (see below)

Layer 5: Data
  - Encryption at rest
  - Append-only audit log
  - Backup policy
```

---

## AI Guardrail Specification

### Input Guardrail (ก่อน AI ประมวลผล)

```
Check 1: Prompt Injection Detection
  Pattern: "ignore previous instructions"
  Pattern: "you are now a different AI"
  Pattern: "reveal your system prompt"
  Pattern: "act as [character]"
  → Block + log + alert teacher

Check 2: PII Detection
  - ห้าม student ส่ง ชื่อ-สกุล, เลขบัตร, เบอร์โทร ผ่าน AI
  - Auto-redact ก่อน process (ถ้า detect ได้)

Check 3: Cross-Student Data Request
  - "บอกฉันว่าเพื่อนตอบว่าอะไร"
  - "แสดงคำตอบของคนอื่น"
  → Block + log

Check 4: Scope Check
  - คำถามนอกขอบเขตวิชา → redirect กลับไปที่เนื้อหา
  - ไม่ตอบเรื่องที่ไม่เกี่ยวกับการเรียน
```

### Output Guardrail (ก่อน AI ส่งกลับ)

```
Check 1: Direct Answer Detection
  - ถ้า AI กำลังจะให้ final answer ตรงๆ → block, reformulate เป็น question
  
Check 2: Hallucination Flag
  - ถ้า confidence ต่ำหรือไม่มี RAG source → flag ให้นักเรียนรู้
  - "ฉันไม่แน่ใจในส่วนนี้ ลองถามครูโดยตรงดีกว่า"

Check 3: Appropriate Tone
  - ห้าม demotivate, shame, หรือ compare กับนักเรียนคนอื่น
  - ห้ามพูดเรื่อง grade หรือ ranking

Check 4: No System Prompt Leak
  - ห้าม reveal instruction ที่ครูตั้งค่าไว้
```

---

## PDPA Compliance

### ข้อมูลที่เก็บ และฐานทางกฎหมาย

| ข้อมูล | ฐานทางกฎหมาย | เก็บนานแค่ไหน |
|--------|-------------|--------------|
| ชื่อ-สกุล, รหัสนักเรียน | ประโยชน์สาธารณะ (การศึกษา) | ตลอดอยู่โรงเรียน |
| คำตอบ/งาน | ประโยชน์สาธารณะ | 1 ปีการศึกษา + archive |
| AI Chat history | ความยินยอม (ผู้ปกครอง) | 1 ภาคเรียน แล้ว anonymize |
| Learning memory | ความยินยอม (ผู้ปกครอง) | 1 ปีการศึกษา |
| Audit log | กฎหมาย | 3 ปี |

### สิทธิของนักเรียน/ผู้ปกครอง (PDPA)

```
✅ สิทธิเข้าถึงข้อมูล — นักเรียนดู learning timeline ของตัวเองได้
✅ สิทธิแก้ไข — ข้อมูลส่วนตัวพื้นฐาน (ไม่ใช่ audit log)
✅ สิทธิลบ — ขอลบ AI chat history ได้ (ยกเว้น audit log)
✅ สิทธิคัดค้าน — opt-out Bot Dear memory ได้
❌ ไม่สามารถลบ audit log (เพื่อความสมบูรณ์ของหลักฐานการศึกษา)
```

### Data Minimization

```
Bot Dear จำแค่:
✅ แนวคิดที่เข้าใจ/ไม่เข้าใจ
✅ จำนวนครั้งที่ revise
✅ summary ของ feedback ที่ได้รับ
✅ ภาษาที่ชอบใช้

Bot Dear ห้ามจำ:
❌ ข้อความ chat ทั้งหมดแบบ verbatim (เก็บแค่ summary)
❌ ความรู้สึก/อารมณ์ (ยกเว้น confidence self-report)
❌ ข้อมูลที่ไม่เกี่ยวกับการเรียน
❌ ข้อมูลจากนักเรียนคนอื่น
```

---

## Threat Model

| ภัยคุกคาม | ความเสี่ยง | มาตรการ |
|-----------|-----------|---------|
| Prompt injection | สูง | Input guardrail + pattern matching |
| Data exfiltration | กลาง | RBAC + no cross-student access |
| Hallucinated grades | สูง | AI ไม่มีสิทธิ์ตัดเกรด + teacher final |
| Student identity leak | สูง | Anonymization ใน peer review |
| Chat history leak | กลาง | Encryption + auto-expire |
| Teacher account takeover | กลาง | MFA + session policy |
| AI jailbreak | สูง | Guardrail + system prompt hardening |

---

## Self-Host Benefits (PDPA)

```
✅ ข้อมูลนักเรียนไม่ออกนอกโรงเรียน
✅ ไม่ใช้ cloud LLM (OpenAI, Anthropic) กับข้อมูลจริง
✅ Local LLM = data sovereignty
✅ ครู/ผู้บริหารโรงเรียนควบคุมได้เต็มที่
✅ ไม่มี third-party analytics
```

---

## Consent Flow (สำหรับนักเรียนผู้เยาว์)

```
1. โรงเรียนแจ้งผู้ปกครอง (หนังสือ/แบบฟอร์ม)
2. ผู้ปกครองลงนามยินยอม
3. นักเรียน onboard ได้
4. นักเรียนเห็นสรุปว่า "ระบบเก็บข้อมูลอะไรบ้าง" ในภาษาที่เข้าใจง่าย
5. มี opt-out bot memory ได้ตลอดเวลา
```
