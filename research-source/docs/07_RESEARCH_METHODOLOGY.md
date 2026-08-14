# 07 — Research Methodology

> วิธีดำเนินการวิจัย — Educational Research Design

---

## Research Design

**ประเภท:** Mixed Methods (เชิงปริมาณ + เชิงคุณภาพ)
**วิธีวิจัยหลัก:** One-group pretest-posttest design (Quasi-experimental)

```
Pretest → [ADI + AI Learning OS] → Posttest
   T1                                   T2

ตัวแปรวัด T1 และ T2:
- การคิดวิเคราะห์ (Analytical Thinking Test)
- AI Literacy (AI Literacy Scale)
```

---

## Population & Sample

**ประชากร:** นักเรียนชั้น ม.4 โรงเรียน [ระบุ]
**กลุ่มตัวอย่าง:** นักเรียน ม.4 จำนวน [ระบุ] คน

**วิธีสุ่ม:** Purposive sampling
- เรียนวิชา [ระบุ] ภาคเรียนที่ [ระบุ]
- ได้รับการยินยอมจากผู้ปกครอง
- มี device สำหรับเข้าระบบ

---

## Instruments

### 1. แบบทดสอบการคิดวิเคราะห์
- อ้างอิง: Watson-Glaser Critical Thinking Appraisal (ดัดแปลง)
  หรือ แบบทดสอบของ [อาจารย์ที่ปรึกษาแนะนำ]
- จำนวน: [ระบุ] ข้อ
- ลักษณะ: Multiple choice + short answer
- ค่าความเชื่อมั่น: Cronbach's α ≥ 0.70

### 2. แบบวัด AI Literacy
- อ้างอิง: AI Literacy Scale (Long & Magerko, 2020 ปรับปรุง)
- 5 มิติ × [ระบุ] ข้อ = [ระบุ] ข้อ
- ลักษณะ: Likert 5 ระดับ
- ค่าความเชื่อมั่น: Cronbach's α ≥ 0.70

### 3. แบบสอบถามความพึงพอใจ
- ต่อ Bot Dear, AI Coach, ระบบโดยรวม
- Likert 5 ระดับ + open-ended

### 4. Learning Timeline Data (System Log)
- จำนวนครั้งที่ revise
- เวลาที่ใช้ต่อกิจกรรม
- ประเภท AI interaction
- จำนวน Socratic questions ที่ตอบ

### 5. แบบสังเกตพฤติกรรม (Qualitative)
- ผู้สังเกต: ผู้วิจัย + ผู้ช่วย
- ประเด็น: engagement, การใช้ AI, interaction กับเพื่อน

---

## ขั้นตอนการดำเนินการวิจัย

```
Phase 1: Preparation (สัปดาห์ที่ 1-2)
  ├── พัฒนาและทดสอบระบบ Learning OS
  ├── สร้างเครื่องมือวัด
  ├── ตรวจสอบโดยผู้เชี่ยวชาญ 3 ท่าน
  ├── ทดลองใช้ (pilot) กับ [ระบุ] คน
  └── แก้ไขตามผล pilot

Phase 2: Pretest (สัปดาห์ที่ 3)
  ├── ทดสอบการคิดวิเคราะห์ (T1)
  ├── วัด AI Literacy (T1)
  └── รับการยินยอม, onboard ระบบ

Phase 3: Intervention (สัปดาห์ที่ 4-11)
  ├── [ระบุจำนวน] กิจกรรม ADI
  ├── ใช้ Bot Dear + AI Coach ทุกกิจกรรม
  ├── Peer Review ทุกกิจกรรม
  └── Teacher Review สุดท้าย

Phase 4: Posttest (สัปดาห์ที่ 12)
  ├── ทดสอบการคิดวิเคราะห์ (T2)
  ├── วัด AI Literacy (T2)
  └── แบบสอบถามความพึงพอใจ

Phase 5: Data Analysis & Report
  └── วิเคราะห์ข้อมูล, เขียนรายงาน
```

---

## Statistical Analysis

### ข้อมูลเชิงปริมาณ

| การวิเคราะห์ | เครื่องมือ | วัตถุประสงค์ |
|-------------|-----------|------------|
| Descriptive statistics | SPSS/R | mean, SD, min, max |
| Normality test | Shapiro-Wilk | ตรวจสอบการแจกแจง |
| Paired t-test | SPSS | เปรียบ pre-post (ถ้า normal) |
| Wilcoxon signed-rank | SPSS | เปรียบ pre-post (ถ้าไม่ normal) |
| Effect size (Cohen's d) | R | ขนาดของผล |
| Correlation | Pearson/Spearman | ความสัมพันธ์ตัวแปร |

### ข้อมูลเชิงคุณภาพ
- Thematic Analysis (Braun & Clarke, 2006)
- Content Analysis ของ AI interaction logs (anonymized)

---

## Ethical Considerations

```
✅ ได้รับอนุมัติจาก IRB / คณะกรรมการจริยธรรมวิจัย
✅ ได้รับความยินยอมจากผู้ปกครอง (เด็กผู้เยาว์)
✅ นักเรียนยินยอมเองด้วย (assent)
✅ Anonymize ข้อมูลทั้งหมดก่อนวิเคราะห์
✅ นักเรียนถอนตัวได้ตลอดโดยไม่มีผลต่อการเรียน
✅ ข้อมูลไม่ส่งออกนอกโรงเรียน (self-host)
✅ ข้อมูลใช้เพื่อการวิจัยเท่านั้น
```

---

## Timeline

| สัปดาห์ | กิจกรรม |
|---------|---------|
| 1-2 | พัฒนาระบบ + เครื่องมือ |
| 3 | Pretest |
| 4-11 | Intervention (8 สัปดาห์) |
| 12 | Posttest + แบบสอบถาม |
| 13-14 | วิเคราะห์ข้อมูล |
| 15-16 | เขียนรายงาน |
