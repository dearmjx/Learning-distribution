"use client";

import { useEffect, useState } from "react";
import type { Activity, CerResponse, CoachFeedback, PeerReview, Submission } from "@/lib/domain/types";

interface Phase6Props {
  activity: Activity;
  initialCer: CerResponse;
  initialFeedback?: CoachFeedback | null;
  onNext: (revisedSubmission: Submission) => void;
  onBack: () => void;
}

export function Phase6Revision({
  activity,
  initialCer,
  initialFeedback,
  onNext,
  onBack,
}: Phase6Props) {
  const [revisedCer, setRevisedCer] = useState<CerResponse>({
    claim: initialCer.claim,
    evidence: initialCer.evidence,
    reasoning: initialCer.reasoning,
  });

  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revisedSubmission, setRevisedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    void fetch(`/api/peer-reviews?activityId=${activity.id}&authorId=demo-student-01`)
      .then((res) => res.json())
      .then((data: { reviews?: PeerReview[] }) => {
        if (data.reviews && data.reviews.length > 0) {
          setPeerReviews(data.reviews);
        } else {
          // Synthetic peer review received
          setPeerReviews([
            {
              id: "peer-feedback-01",
              submissionId: "demo-sub-01",
              reviewerStudentId: "peer-student-05",
              authorStudentId: "demo-student-01",
              activityId: activity.id,
              feedback: "อธิบายเรื่องการเพิ่มขึ้นของหนูได้ชัดเจนมาก แต่อยากให้เพิ่มตัวเลข kcal ของพลังงานที่สูญเสียไปตามกฎ 10% ในส่วน Reasoning จะทำให้ข้อโต้แย้งน่าเชื่อถือยิ่งขึ้น",
              createdAt: new Date().toISOString(),
              scores: { claim: 5, evidence: 4, reasoning: 4 },
              strengths: "ระบุตัวเลขและแนวโน้มการเปลี่ยนแปลงได้ตรงจุด",
              suggestions: "ระบุกฎ 10% และการสูญเสียพลังงานความร้อนเพิ่มเติม",
            },
          ]);
        }
      })
      .catch(() => {});
  }, [activity.id]);

  async function submitRevision() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "demo-student-01",
          activityId: activity.id,
          content: revisedCer,
          hintDepth: "none",
          responseTimeSeconds: 60,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ส่งฉบับปรับปรุงไม่สำเร็จ");

      setRevisedSubmission(data.submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกฉบับปรับปรุง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 6 / 7 · REVISION</span>
        <h2>🔄 ปรับปรุงข้อโต้แย้งฉบับสมบูรณ์ (Final Argument Revision)</h2>
        <p className="phase-lead">
          นำคำถามนำจาก AI Coach และข้อคิดเห็นจากเพื่อน มาขัดเกลาและปรับปรุงข้อโต้แย้ง CER ให้สมบูรณ์และรัดกุมที่สุด
        </p>
      </div>

      <div className="grid-2-col">
        {/* Left Column: Feedback Received (AI Coach + Peers) */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">FEEDBACK SUMMARY</p>
              <h3>ข้อเสนอแนะที่ได้รับ</h3>
            </div>
            <span className="unit-badge">AI & Peer Insights</span>
          </div>

          {/* AI Coach Suggestion */}
          {initialFeedback && (
            <div className="feedback-sub-card">
              <span className="feedback-origin-tag">🌿 คำถามนำจาก AI Coach</span>
              <blockquote>{initialFeedback.message}</blockquote>
              <small className="muted-text">มิติมโนทัศน์ที่เน้น: {initialFeedback.targetDimension}</small>
            </div>
          )}

          {/* Peer Feedback List */}
          <div className="peer-feedback-list">
            <span className="feedback-origin-tag">👥 ความเห็นจากเพื่อนร่วมชั้น</span>
            {peerReviews.map((rev) => (
              <div key={rev.id} className="peer-review-bubble">
                <p><strong>ความคิดเห็น:</strong> &ldquo;{rev.feedback}&rdquo;</p>
                {rev.suggestions && (
                  <p className="peer-sugg-line">
                    💡 <strong>จุดแนะนำ:</strong> {rev.suggestions}
                  </p>
                )}
                {rev.scores && (
                  <div className="mini-score-bar">
                    <span>คะแนน: Claim {rev.scores.claim}/5 · Evidence {rev.scores.evidence}/5 · Reasoning {rev.scores.reasoning}/5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Revised CER Editor */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">FINAL REVISION</p>
              <h3>CER ฉบับปรับปรุง (Version 2)</h3>
            </div>
            <span className="phase-label">Final Draft</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-claim">
              <strong>1. Claim ฉบับปรับปรุง</strong>
            </label>
            <textarea
              id="rev-claim"
              className="form-textarea"
              rows={3}
              value={revisedCer.claim}
              onChange={(e) => setRevisedCer({ ...revisedCer, claim: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-evidence">
              <strong>2. Evidence ฉบับปรับปรุง (ระบุตัวเลขครบถ้วน)</strong>
            </label>
            <textarea
              id="rev-evidence"
              className="form-textarea"
              rows={3}
              value={revisedCer.evidence}
              onChange={(e) => setRevisedCer({ ...revisedCer, evidence: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-reasoning">
              <strong>3. Reasoning ฉบับปรับปรุง (เชื่อมโยงกฎ 10% & กลไก)</strong>
            </label>
            <textarea
              id="rev-reasoning"
              className="form-textarea"
              rows={4}
              value={revisedCer.reasoning}
              onChange={(e) => setRevisedCer({ ...revisedCer, reasoning: e.target.value })}
            />
          </div>

          <button
            type="button"
            className="primary-button submit-btn"
            onClick={() => void submitRevision()}
            disabled={submitting}
          >
            {submitting ? "กำลังบันทึกฉบับปรับปรุง..." : "บันทึกและยืนยันข้อโต้แย้งฉบับสมบูรณ์ (Version 2)"}
          </button>

          {revisedSubmission && (
            <div className="success-banner revision-success">
              <h4>🎉 บันทึกฉบับสมบูรณ์แล้ว (Version {revisedSubmission.version})</h4>
              <p>ระบบบันทึกประวัติการพัฒนา (Authorship Evolution) และส่งให้ครูผู้สอนตรวจเรียบร้อยแล้ว</p>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>
      </div>

      <div className="action-row space-between bottom-nav">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← กลับไปดูการประเมินเพื่อน (Phase 5)
        </button>
        <button
          type="button"
          className="primary-button next-phase-btn"
          onClick={() => {
            if (revisedSubmission) onNext(revisedSubmission);
            else void submitRevision();
          }}
        >
          {revisedSubmission ? "ไปสะท้อนคิดและสรุปบทเรียน ➔ (Phase 7)" : "บันทึกและไป Phase 7 ➔"}
        </button>
      </div>
    </div>
  );
}
