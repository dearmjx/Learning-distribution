# 09 — Learning Timeline

> Immutable Event System — Learning Evidence Foundation

---

## หลักการ

Learning Timeline คือบันทึกลำดับเหตุการณ์การเรียนรู้ที่:
- **ไม่สามารถแก้ไข/ลบย้อนหลังได้** (append-only)
- เป็น **หลักฐานการเรียนรู้** ที่ credible
- ใช้เป็นฐานของ **Learning Analytics**
- ครูและนักเรียน (เจ้าของ) ดูได้

---

## Event Catalog

### Student Events

```yaml
activity_started:
  description: นักเรียนเปิดกิจกรรม ADI
  payload:
    student_id: string
    activity_id: string
    adi_phase: 1-8
    started_at: timestamp

question_viewed:
  description: นักเรียนอ่านโจทย์
  payload:
    student_id: string
    activity_id: string
    question_id: string
    viewed_at: timestamp

answer_drafted:
  description: นักเรียนเริ่มเขียน draft
  payload:
    student_id: string
    activity_id: string
    draft_version: integer
    word_count: integer
    started_at: timestamp

answer_submitted:
  description: นักเรียนส่งคำตอบ
  payload:
    student_id: string
    activity_id: string
    answer_id: string
    version: integer
    claim_present: boolean
    evidence_present: boolean
    reasoning_present: boolean
    submitted_at: timestamp

student_revised:
  description: นักเรียนส่งคำตอบฉบับแก้ไข
  payload:
    student_id: string
    activity_id: string
    previous_answer_id: string
    new_answer_id: string
    trigger: "ai_feedback" | "peer_review" | "self_initiated"
    revised_at: timestamp
```

### AI Interaction Events

```yaml
ai_session_started:
  description: นักเรียนเริ่ม session กับ Bot Dear / AI Coach
  payload:
    student_id: string
    activity_id: string
    agent: "bot_dear" | "ai_coach"
    session_id: string
    started_at: timestamp

ai_feedback_received:
  description: AI ส่ง feedback กลับนักเรียน
  payload:
    student_id: string
    activity_id: string
    session_id: string
    feedback_type: "socratic_question" | "hint_l1-4" | "encouragement"
    rag_sources_used: string[]   # document IDs, ไม่ใช่ content
    turn_number: integer
    delivered_at: timestamp

hint_requested:
  description: นักเรียนขอ hint
  payload:
    student_id: string
    activity_id: string
    hint_level: 1-4
    requested_at: timestamp

ai_session_ended:
  description: จบ session
  payload:
    student_id: string
    session_id: string
    turn_count: integer
    duration_seconds: integer
    ended_at: timestamp
```

### Social Learning Events

```yaml
peer_review_assigned:
  description: ระบบ assign งานให้ peer reviewer
  payload:
    reviewer_id: string
    reviewee_id: string          # anonymized in peer interface
    activity_id: string
    answer_id: string
    assigned_at: timestamp

peer_review_submitted:
  description: เพื่อนส่ง review
  payload:
    reviewer_id: string
    activity_id: string
    feedback_summary: string     # ไม่เก็บ full text ใน event
    dimensions_rated: object
    submitted_at: timestamp

peer_review_received:
  description: นักเรียนรับ feedback จากเพื่อน (linked to above)
  payload:
    student_id: string
    activity_id: string
    review_id: string
    received_at: timestamp
```

### Teacher Events

```yaml
teacher_reviewed:
  description: ครู review งานนักเรียน
  payload:
    teacher_id: string
    student_id: string
    activity_id: string
    answer_id: string
    reviewed_at: timestamp
    # ไม่เก็บ grade ใน timeline (ความเป็นส่วนตัว)

teacher_comment_added:
  description: ครูเพิ่ม comment
  payload:
    teacher_id: string
    student_id: string
    activity_id: string
    comment_id: string
    added_at: timestamp

assessment_completed:
  description: ครูตัดเกรดรายวิชาเสร็จ
  payload:
    teacher_id: string
    course_id: string
    student_id: string
    completed_at: timestamp
```

---

## Database Schema

```sql
CREATE TABLE learning_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id),
  event_type    VARCHAR(64) NOT NULL,
  activity_id   UUID REFERENCES learning_activities(id),
  session_id    UUID,
  payload       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit fields
  source        VARCHAR(32) NOT NULL,  -- 'student_ui' | 'ai_coach' | 'bot_dear' | 'teacher_ui' | 'system'
  ip_hash       VARCHAR(64),           -- hash ไม่ใช่ IP จริง (PDPA)
  integrity_hash VARCHAR(64) NOT NULL  -- SHA-256 ของ record (tamper detection)
);

-- CRITICAL: ห้าม UPDATE, DELETE บน table นี้
-- ใช้ Row Security Policy
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Students see only their own events
CREATE POLICY student_own_events ON learning_events
  FOR SELECT TO student_role
  USING (student_id = current_setting('app.student_id')::UUID);

-- Teachers see events of their course's students only
CREATE POLICY teacher_class_events ON learning_events
  FOR SELECT TO teacher_role
  USING (student_id IN (
    SELECT student_id FROM course_enrollments 
    WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = current_user_teacher_id())
  ));
```

---

## Analytics Use Cases

```
Use Case 1: Revision Pattern
  SELECT student_id, COUNT(*) as revision_count
  FROM learning_events
  WHERE event_type = 'student_revised'
    AND activity_id = ?
  GROUP BY student_id

Use Case 2: AI Dependency
  SELECT 
    (SELECT COUNT(*) FROM learning_events WHERE event_type = 'hint_requested' AND student_id = ?) 
    / NULLIF((SELECT COUNT(*) FROM learning_events WHERE event_type = 'answer_submitted' AND student_id = ?), 0)
    AS hint_per_submission_ratio

Use Case 3: Time on Task
  SELECT 
    (ai_session_ended.created_at - ai_session_started.created_at) as session_duration
  FROM learning_events started
  JOIN learning_events ended ON started.session_id = ended.session_id
  WHERE started.event_type = 'ai_session_started'
    AND ended.event_type = 'ai_session_ended'
```

---

## Privacy in Timeline

```
✅ เก็บ: event type, timing, metadata
✅ เก็บ: IDs (anonymizable สำหรับ research)
❌ ไม่เก็บ: full chat content ใน timeline
❌ ไม่เก็บ: actual IP address
❌ ไม่เก็บ: grade ใน timeline (อยู่ใน teacher_reviews table)
❌ ไม่เก็บ: peer reviewer identity ใน event (anonymized)
```
