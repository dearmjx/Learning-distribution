# 03 — System Architecture

> Learning OS — Full Technical Architecture

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        LEARNING OS                           │
├──────────────────┬───────────────────────────────────────────┤
│   FRONTEND       │              BACKEND                      │
│   (Next.js)      │              (Node.js / Hono)             │
│                  │                                           │
│ ┌─────────────┐  │  ┌──────────────────────────────────┐    │
│ │Student View │  │  │         API Gateway               │    │
│ │- Bot Dear   │◄─┼─►│         Auth (JWT/Session)        │    │
│ │- Chat UI    │  │  │         Rate Limiter               │    │
│ │- Timeline   │  │  └──────────────┬───────────────────┘    │
│ └─────────────┘  │                 │                         │
│                  │  ┌──────────────▼───────────────────┐    │
│ ┌─────────────┐  │  │        SECURITY LAYER            │    │
│ │Teacher View │  │  │     (Guardrail + PDPA)            │    │
│ │- Dashboard  │◄─┼─►│     Prompt Injection Filter       │    │
│ │- Review     │  │  │     Access Control                │    │
│ │- Analytics  │  │  └──────────────┬───────────────────┘    │
│ └─────────────┘  │                 │                         │
│                  │  ┌──────────────▼───────────────────┐    │
│                  │  │           AI LAYER                │    │
│                  │  │  ┌────────────┐  ┌─────────────┐ │    │
│                  │  │  │  AI Coach  │  │  Bot Dear   │ │    │
│                  │  │  │ (Subject)  │  │ (Personal)  │ │    │
│                  │  │  └─────┬──────┘  └──────┬──────┘ │    │
│                  │  │        │                 │        │    │
│                  │  │  ┌─────▼─────────────────▼──────┐│    │
│                  │  │  │    LLM Abstraction Layer      ││    │
│                  │  │  │  OpenUI / Hermes Agent        ││    │
│                  │  │  │  Local LLM (self-host)        ││    │
│                  │  │  └─────────────┬─────────────────┘│    │
│                  │  └───────────────┼──────────────────┘    │
│                  │                  │                        │
│                  │  ┌───────────────▼──────────────────┐    │
│                  │  │         DATA LAYER               │    │
│                  │  │  ┌──────────┐  ┌──────────────┐  │    │
│                  │  │  │ Postgres │  │ Vector DB     │  │    │
│                  │  │  │(Supabase)│  │ (RAG Store)   │  │    │
│                  │  │  └──────────┘  └──────────────┘  │    │
│                  │  │  ┌─────────────────────────────┐  │    │
│                  │  │  │  Learning Timeline (immut.) │  │    │
│                  │  │  └─────────────────────────────┘  │    │
│                  │  └──────────────────────────────────┘    │
└──────────────────┴──────────────────────────────────────────┘
```

---

## Data Flow: Student → AI → Feedback

```
Student submits answer
        │
        ▼
[1] Guardrail Check
    - Prompt injection scan
    - Content filter
    - PDPA check (no PII leak)
        │
        ▼
[2] Bot Dear Context Fetch
    - Student learning history
    - Previous attempts
    - Known weak concepts
        │
        ▼
[3] RAG Retrieval
    - Query course knowledge
    - Fetch relevant rubric
    - Pull approved examples
        │
        ▼
[4] AI Coach Analysis
    - Identify reasoning gaps
    - Match against rubric
    - Generate Socratic questions
        │
        ▼
[5] Response Guardrail
    - Never give direct answer
    - Cite course materials
    - Flag if unsure (hallucination risk)
        │
        ▼
[6] Feedback Delivery
    - Socratic questions
    - Hints (not answers)
    - Citation of evidence
        │
        ▼
[7] Timeline Event Logged
    - ai_feedback_received
    - Immutable audit record
        │
        ▼
[8] Student Revises
    - New submission cycle begins
```

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js (App Router) | Factory OS base, reuse |
| **Backend** | Node.js + Hono | lightweight, type-safe |
| **Database** | Postgres (Supabase) | existing infrastructure |
| **Vector DB** | pgvector / Qdrant | RAG embeddings |
| **LLM** | Local LLM (self-host) | PDPA compliance, no data export |
| **LLM Agent** | OpenUI / Hermes Agent | from Factory OS migration |
| **Auth** | JWT + Role-based | Student / Teacher / Admin |
| **Audit Log** | Append-only table | immutable learning evidence |
| **Deploy** | Docker + self-host | school server, data sovereignty |

---

## Roles & Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Student** | Chat with Bot Dear, submit, view own timeline | View other students' data |
| **Teacher** | Review all submissions, view class analytics | Modify student timeline |
| **AI Coach** | Analyze, feedback, ask questions | Give direct answers, access other students |
| **Bot Dear** | Access own student's memory only | Cross-student comparison |
| **Admin** | System config | Read student chat content |

---

## Database Schema (High Level)

```sql
-- Core entities
students          (id, name, class, created_at)
teachers          (id, name, subject, created_at)
courses           (id, name, subject, teacher_id)
learning_activities (id, course_id, adi_phase, prompt)

-- Learning records
student_answers   (id, student_id, activity_id, content, version, submitted_at)
ai_interactions   (id, student_id, session_id, role, content, created_at)
peer_reviews      (id, reviewer_id, reviewee_id, activity_id, feedback, created_at)
teacher_reviews   (id, teacher_id, student_id, activity_id, grade, feedback, created_at)

-- Memory & RAG
student_memory    (id, student_id, concept, status, updated_at)
course_documents  (id, course_id, title, content, embedding, created_at)

-- Immutable audit
learning_events   (id, student_id, event_type, payload, created_at)
-- NO UPDATE, NO DELETE on learning_events
```

---

## Hybrid Database Strategy

จากโน้ต: "Database เพิ่มเติม ↓แบบ Hybrid"

```
Relational (Postgres):
  - User accounts
  - Submissions
  - Reviews
  - Grades

Vector (pgvector):
  - Course document embeddings
  - Student answer semantic search
  - Similar mistake detection

Append-only (separate table/partition):
  - Learning Timeline events
  - AI interaction logs
  - Audit trail
```
