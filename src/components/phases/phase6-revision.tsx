"use client";

import { useCallback, useEffect, useState } from "react";
import type { Activity, CerResponse, CoachFeedback, FeedbackDecision, PeerReview, Submission } from "@/lib/domain/types";

interface Phase6Props {
  activity: Activity;
  studentId?: string;
  initialCer: CerResponse;
  initialFeedback?: CoachFeedback | null;
  onNext: (revisedSubmission: Submission) => void;
  onBack: () => void;
}

export function Phase6Revision({
  activity,
  studentId = "40101",
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
  const [feedbackDecisions, setFeedbackDecisions] = useState<Record<string, FeedbackDecision>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revisedSubmission, setRevisedSubmission] = useState<Submission | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  // Only real peer reviews of this student's work are shown; never synthetic ones (LOS-014).
  const loadReceivedReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const res = await fetch(`/api/peer-reviews?activityId=${encodeURIComponent(activity.id)}`);
      const data = (await res.json()) as { receivedReviews?: PeerReview[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "โหลดข้อเสนอแนะจากเพื่อนไม่สำเร็จ");
      setPeerReviews(data.receivedReviews ?? []);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "โหลดข้อเสนอแนะจากเพื่อนไม่สำเร็จ");
    } finally {
      setReviewsLoading(false);
    }
  }, [activity.id]);

  useEffect(() => {
    void loadReceivedReviews();
  }, [loadReceivedReviews]);

  function handleDecisionChange(key: string, source: "ai_coach" | "peer", feedbackItem: string, status: "accept" | "reject" | "modify") {
    setFeedbackDecisions((prev) => ({
      ...prev,
      [key]: {
        id: prev[key]?.id ?? crypto.randomUUID(),
        feedbackItem,
        source,
        status,
        // The justification is the student's own reasoning; never pre-filled.
        justificationText: prev[key]?.justificationText ?? "",
        createdAt: new Date().toISOString(),
      },
    }));
  }

  function handleJustificationChange(key: string, text: string) {
    setFeedbackDecisions((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        justificationText: text,
      },
    }));
  }

  const aiKey = "ai-coach-feedback";
  const requiredKeys = [
    ...(initialFeedback ? [aiKey] : []),
    ...peerReviews.map((rev, idx) => `peer-feedback-${rev.id || idx}`),
  ];
  const undecided = requiredKeys.filter((key) => !feedbackDecisions[key]?.status || !feedbackDecisions[key]?.justificationText.trim());
  const canSubmit = !submitting && !revisedSubmission && !reviewsLoading && undecided.length === 0;

  async function submitRevision() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    const decisionsList = requiredKeys.map((key) => ({
      ...feedbackDecisions[key],
      justificationText: feedbackDecisions[key].justificationText.trim(),
    }));

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          activityId: activity.id,
          content: revisedCer,
          hintDepth: "none",
          responseTimeSeconds: 60,
          feedbackDecisions: decisionsList,
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
        <span className="phase-pill">PHASE 6 / 7 · REVISION & CRITICAL EVALUATION</span>
        <h2>🔄 ปรับปรุงข้อโต้แย้งและประเมิน Feedback (AI Literacy)</h2>
        <p className="phase-lead">
          ประเมินและตัดสินใจต่อคำแนะนำจาก AI Coach และเพื่อนร่วมชั้น (ยอมรับ / ปฏิเสธ / ปรับแก้ พร้อมระบุเหตุผล) เพื่อพัฒนาข้อโต้แย้ง CER ฉบับสมบูรณ์
        </p>
      </div>

      <div className="grid-2-col">
        {/* Left Column: Feedback Evaluation Panel (AI Coach + Peers) */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">FEEDBACK CRITICAL EVALUATION</p>
              <h3>ประเมินและตัดสินใจต่อ Feedback</h3>
            </div>
            <span className="unit-badge">AI Literacy · Critical Thinking</span>
          </div>

          {/* AI Coach Suggestion Decision Block */}
          {initialFeedback && (
            <div className="feedback-decision-box" style={{
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: "8px",
              padding: "14px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="feedback-origin-tag" style={{ background: "#ccfbf1", color: "#0f766e" }}>🌿 คำถามนำจาก AI Coach</span>
                <span className="target-badge" style={{ fontSize: "0.75rem" }}>{initialFeedback.targetDimension}</span>
              </div>
              <blockquote style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#134e4a" }}>
                {initialFeedback.message}
              </blockquote>

              <div style={{ margin: "10px 0 6px 0" }}>
                <strong style={{ fontSize: "0.85rem", color: "#0f766e" }}>การตัดสินใจต่อนักโค้ช AI:</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {(["accept", "reject", "modify"] as const).map((status) => {
                    const active = feedbackDecisions[aiKey]?.status === status;
                    const labels = { accept: "✅ ยอมรับ (Accept)", reject: "❌ ปฏิเสธ (Reject)", modify: "✏️ ปรับแก้ (Modify)" };
                    const colors = { accept: "#059669", reject: "#dc2626", modify: "#d97706" };
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleDecisionChange(aiKey, "ai_coach", initialFeedback.message, status)}
                        style={{
                          flex: 1,
                          padding: "6px 4px",
                          fontSize: "0.8rem",
                          fontWeight: active ? 600 : 400,
                          borderRadius: "6px",
                          border: `1px solid ${active ? colors[status] : "#cbd5e1"}`,
                          background: active ? `${colors[status]}15` : "#ffffff",
                          color: active ? colors[status] : "#475569",
                          cursor: "pointer",
                        }}
                      >
                        {labels[status]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {feedbackDecisions[aiKey] && (
                <div style={{ marginTop: "10px" }}>
                  <label htmlFor="ai-justification" style={{ fontSize: "0.8rem", color: "#0f766e", fontWeight: 600 }}>
                    ระบุเหตุผลการตัดสินใจ (Justification):
                  </label>
                  <input
                    id="ai-justification"
                    type="text"
                    className="form-input"
                    style={{ width: "100%", marginTop: "4px", fontSize: "0.85rem" }}
                    value={feedbackDecisions[aiKey]?.justificationText ?? ""}
                    onChange={(e) => handleJustificationChange(aiKey, e.target.value)}
                    placeholder="เช่น ยอมรับเพราะช่วยให้อธิบายกลไกกฎ 10% ได้ตรงประเด็นขึ้น..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Peer Feedback List with Decisions */}
          <div className="peer-feedback-list">
            <span className="feedback-origin-tag" style={{ marginBottom: "10px", display: "inline-block" }}>👥 ข้อเสนอแนะจากเพื่อนร่วมชั้น</span>
            {reviewsLoading && <p className="muted-text">กำลังโหลดข้อเสนอแนะจากเพื่อน…</p>}
            {reviewsError && (
              <div role="alert">
                <p className="error-text">{reviewsError}</p>
                <button type="button" className="secondary-button compact-button" onClick={() => void loadReceivedReviews()}>
                  ลองใหม่
                </button>
              </div>
            )}
            {!reviewsLoading && !reviewsError && peerReviews.length === 0 && (
              <p className="muted-text">ยังไม่มีเพื่อนประเมินงานของคุณ ปรับปรุงงานจากคำแนะนำของ AI Coach ได้เลย</p>
            )}
            {peerReviews.map((rev, idx) => {
              const peerKey = `peer-feedback-${rev.id || idx}`;
              const itemText = rev.suggestions || rev.feedback;
              return (
                <div key={peerKey} className="peer-review-bubble" style={{ marginBottom: "14px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: "0 0 6px 0" }}><strong>ความคิดเห็น:</strong> &ldquo;{rev.feedback}&rdquo;</p>
                  {rev.suggestions && (
                    <p className="peer-sugg-line" style={{ margin: "0 0 8px 0" }}>
                      💡 <strong>จุดแนะนำ:</strong> {rev.suggestions}
                    </p>
                  )}

                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["accept", "reject", "modify"] as const).map((status) => {
                        const active = feedbackDecisions[peerKey]?.status === status;
                        const labels = { accept: "✅ ยอมรับ", reject: "❌ ปฏิเสธ", modify: "✏️ ปรับแก้" };
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleDecisionChange(peerKey, "peer", itemText, status)}
                            style={{
                              flex: 1,
                              padding: "4px 2px",
                              fontSize: "0.75rem",
                              borderRadius: "4px",
                              border: active ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                              background: active ? "#eff6ff" : "#fff",
                              color: active ? "#1d4ed8" : "#475569",
                              cursor: "pointer",
                            }}
                          >
                            {labels[status]}
                          </button>
                        );
                      })}
                    </div>

                    {feedbackDecisions[peerKey] && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: "100%", marginTop: "6px", fontSize: "0.8rem", padding: "4px 8px" }}
                        value={feedbackDecisions[peerKey]?.justificationText ?? ""}
                        onChange={(e) => handleJustificationChange(peerKey, e.target.value)}
                        placeholder="เหตุผลการตัดสินใจต่อข้อเสนอแนะเพื่อน..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Revised CER Editor (Version 2) */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">FINAL REVISION (VERSION 2)</p>
              <h3>CER ฉบับสมบูรณ์หลังพิจารณา Feedback</h3>
            </div>
            <span className="phase-label">Final Draft</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-claim">
              <strong>1. Claim ฉบับปรับปรุง (ตอบตรงประเด็น ชัดเจน)</strong>
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
              <strong>2. Evidence ฉบับปรับปรุง (เลือกสรรข้อมูลและตัวเลขครบถ้วน)</strong>
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
              <strong>3. Reasoning ฉบับปรับปรุง (สังเคราะห์ด้วยภาษาตนเอง & เชื่อมโยงกฎ 10%)</strong>
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
            disabled={!canSubmit}
          >
            {submitting ? "กำลังบันทึกฉบับปรับปรุง..." : revisedSubmission ? "✓ บันทึกแล้ว" : "บันทึกและยืนยันข้อโต้แย้งฉบับสมบูรณ์ (Version 2)"}
          </button>
          {!revisedSubmission && undecided.length > 0 && (
            <p className="small-note">เลือก ยอมรับ / ปฏิเสธ / ปรับแก้ และเขียนเหตุผลของคุณเองให้ครบทุกข้อเสนอแนะก่อนบันทึก</p>
          )}

          {revisedSubmission && (
            <div className="success-banner revision-success">
              <h4>🎉 บันทึกฉบับสมบูรณ์แล้ว (Version {revisedSubmission.version})</h4>
              <p>ระบบบันทึกประวัติการพัฒนา (Authorship Evolution) และการประเมิน Feedback เรียบร้อยแล้ว</p>
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
          disabled={!revisedSubmission && !canSubmit}
        >
          {revisedSubmission ? "ไปสะท้อนคิดและสรุปบทเรียน ➔ (Phase 7)" : "บันทึกและไป Phase 7 ➔"}
        </button>
      </div>
    </div>
  );
}
