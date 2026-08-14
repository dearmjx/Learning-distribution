"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Activity, AuthorshipIndicators, CoachFeedback, HintDepth, LearningEvent, Submission } from "@/lib/domain/types";
import { SocraticCoachChat } from "@/components/socratic-coach-chat";

interface SessionResult {
  submission: Submission;
  feedback: CoachFeedback;
  authorship: AuthorshipIndicators;
  submissions: Submission[];
  revisions: Array<{ id: string; submissionId: string; version: number; createdAt: string }>;
  events: LearningEvent[];
}

const emptyCer = { claim: "", evidence: "", reasoning: "" };

interface StudentWorkbenchProps {
  initialActivityId?: string;
}

export function StudentWorkbench({ initialActivityId }: StudentWorkbenchProps = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState("");
  const [cer, setCer] = useState(emptyCer);
  const [hintDepth, setHintDepth] = useState<HintDepth>("none");
  const [responseTimeSeconds, setResponseTimeSeconds] = useState(90);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/activities")
      .then((response) => response.json())
      .then((data: { activities: Activity[] }) => {
        setActivities(data.activities);
        setActivityId(data.activities.find((item) => item.id === initialActivityId)?.id ?? data.activities[0]?.id ?? "");
      })
      .catch(() => setError("โหลดกิจกรรมไม่สำเร็จ"));
  }, [initialActivityId]);

  const activity = useMemo(() => activities.find((item) => item.id === activityId), [activities, activityId]);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "demo-student-01",
          activityId,
          content: cer,
          hintDepth,
          responseTimeSeconds,
        }),
      });
      const data = (await response.json()) as SessionResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ส่งคำตอบไม่สำเร็จ");
      setResult(data);
      if (hintDepth === "deep") {
        setShowChat(true);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "ส่งคำตอบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">LEARNING OS / RESEARCH PROTOTYPE</p>
          <h1>ADI Ecosystem Lab</h1>
          <p className="lede">ทดลอง flow นักเรียนหนึ่งรอบ: เขียน CER → รับคำถาม Socratic → ปรับคำตอบ</p>
        </div>
        <div className="hero-actions">
          <Link className="text-link" href="/student/timeline">My learning timeline →</Link>
          <div className="status-pill"><span className="status-dot" /> Mock-safe mode</div>
        </div>
      </header>

      <section className="notice">
        <strong>ขอบเขตการทดลอง</strong>
        <span>Primary: การคิดวิเคราะห์ · Secondary/exploratory: AI Literacy · Authorship = สัญญาณให้ครูตรวจ ไม่ใช่คำตัดสิน</span>
      </section>

      <div className="workspace-grid">
        <section className="card activity-card">
          <div className="card-heading">
            <div><p className="eyebrow">01 / ACTIVITY</p><h2>เลือกกิจกรรม</h2></div>
            <span className="phase-label">ADI</span>
          </div>
          <label htmlFor="activity">กิจกรรมชีววิทยา ม.4</label>
          <select id="activity" value={activityId} onChange={(event) => setActivityId(event.target.value)}>
            {activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          {activity && <div className="prompt-box"><p>{activity.prompt}</p><small>{activity.context}</small></div>}
          <div className="meta-row"><span>หน่วย: {activity?.unit ?? "กำลังโหลด"}</span><span>Peer review: {activity?.peerReviewAllowed ? "เปิด" : "ปิด"}</span></div>
        </section>

        <section className="card cer-card">
          <div className="card-heading">
            <div><p className="eyebrow">02 / YOUR ARGUMENT</p><h2>เขียน Claim–Evidence–Reasoning</h2></div>
            <span className="cer-mark">C·E·R</span>
          </div>
          <label>Claim <textarea value={cer.claim} onChange={(event) => setCer({ ...cer, claim: event.target.value })} placeholder="ข้อสรุปของคุณคืออะไร?" /></label>
          <label>Evidence <textarea value={cer.evidence} onChange={(event) => setCer({ ...cer, evidence: event.target.value })} placeholder="หลักฐานจากข้อมูลหรือบทเรียนคืออะไร?" /></label>
          <label>Reasoning <textarea value={cer.reasoning} onChange={(event) => setCer({ ...cer, reasoning: event.target.value })} placeholder="หลักฐานสนับสนุน claim อย่างไร?" /></label>
          <div className="controls">
            <label>ความช่วยเหลือที่ขอ
              <select value={hintDepth} onChange={(event) => setHintDepth(event.target.value as HintDepth)}>
                <option value="none">ไม่ขอความช่วยเหลือ (0)</option>
                <option value="shallow">ถามตื้น (-1, บันทึกเป็น process metric)</option>
                <option value="concept">ถามกลาง (-2, บันทึกเป็น process metric)</option>
                <option value="deep">Socratic deep dive (-3, บันทึกเป็น process metric)</option>
              </select>
            </label>
            <label>เวลาที่ใช้ (วินาที)
              <input type="number" min="0" value={responseTimeSeconds} onChange={(event) => setResponseTimeSeconds(Number(event.target.value))} />
            </label>
          </div>
          <button className="primary-button" onClick={() => void submit()} disabled={loading || !activityId}>
            {loading ? "กำลังให้ AI Coach วิเคราะห์…" : "ส่งคำตอบให้ AI Coach"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </section>
      </div>

      {result && <section className="results-grid">
        <div className="card feedback-card">
          <div className="card-heading">
            <div><p className="eyebrow">03 / COACH FEEDBACK</p><h2>คำถามต่อยอด</h2></div>
            <span className="target-badge">{result.feedback.targetDimension}</span>
          </div>
          <blockquote>{result.feedback.message}</blockquote>
          <div className="citation">อ้างอิง: {result.feedback.citations.join(" · ") || "บริบทกิจกรรมที่ครูอนุมัติ"}</div>
          <p className="guardrail-note">✓ Direct answer ถูกบล็อก · AI ทำหน้าที่เป็น coach ไม่ใช่ผู้เขียนคำตอบ</p>
          {result.feedback.fallbackUsed && <p className="fallback-note">LLM ไม่พร้อมใช้งาน: แสดงคำถาม Socratic แบบ manual fallback แล้ว คุณสามารถแก้ไขและส่งใหม่ได้</p>}

          {!showChat && (
            <div className="unlock-chat-banner">
              <div>
                <p>💬 อยากสนทนาต่อยอดเพื่อค้นหาคำตอบ?</p>
                <small>ปลดล็อก Socratic Mini-Chat (3 points) เพื่อคุยกับ AI Coach ได้โดยตรง</small>
              </div>
              <button
                type="button"
                className="primary-button compact-button unlock-btn"
                onClick={() => setShowChat(true)}
              >
                เปิด Mini-Chat (3 pt)
              </button>
            </div>
          )}
        </div>

        {showChat ? (
          <SocraticCoachChat
            activityId={activityId}
            activity={activity}
            studentCer={cer}
            initialCoachFeedback={result.feedback.message}
          />
        ) : (
          <div className="card evidence-card">
            <div className="card-heading"><div><p className="eyebrow">04 / LEARNING EVIDENCE</p><h2>ข้อมูลที่เก็บให้ครู</h2></div></div>
            <div className="metric-list">
              <div><span>Draft version</span><strong>{result.submission.version}</strong></div>
              <div><span>Hint cost (แยกจากคะแนนงาน)</span><strong>{result.submission.hintCost}</strong></div>
              <div><span>Response time</span><strong>{result.authorship.responseTimeSeconds}s</strong></div>
              <div><span>Prompt similarity</span><strong>{Math.round(result.authorship.copySimilarityToPrompt * 100)}%</strong></div>
              <div><span>Teacher review signal</span><strong className={`signal-${result.authorship.status}`}>{result.authorship.status}</strong></div>
            </div>
            <p className="small-note">ระบบแสดง indicator เพื่อให้ครูตรวจสอบร่วมกับงานและบทสนทนา ไม่สร้างข้อกล่าวหาอัตโนมัติ</p>
          </div>
        )}
      </section>}

      {result && <section className="student-evidence-grid">
        <div className="card">
          <div className="card-heading"><div><p className="eyebrow">05 / REVISION HISTORY</p><h2>ประวัติการแก้ไข</h2></div><span className="phase-label">{result.submissions.length} versions</span></div>
          <div className="history-list">
            {result.submissions.slice().reverse().map((submission) => <div className="history-item" key={submission.id}>
              <div><strong>Version {submission.version}</strong><span>{new Date(submission.submittedAt).toLocaleString("th-TH")}</span></div>
              <small>{submission.workflowState} · hint cost {submission.hintCost}</small>
            </div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-heading"><div><p className="eyebrow">06 / MY TIMELINE</p><h2>หลักฐานการเรียนรู้</h2></div><Link className="text-link" href="/student/timeline">ดูทั้งหมด</Link></div>
          <div className="timeline-list">
            {result.events.slice(0, 8).map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot" /><div><strong>{event.eventType}</strong><small>{new Date(event.createdAt).toLocaleString("th-TH")}</small></div></div>)}
          </div>
        </div>
      </section>}

      <footer><span>Learning OS · Biology M.4 · Ecosystem</span><span>One-group pre/post research prototype</span></footer>
    </main>
  );
}
