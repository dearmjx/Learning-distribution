"use client";

import { useEffect, useState } from "react";
import type { Activity, PeerReviewSubmission } from "@/lib/domain/types";

interface Phase5Props {
  activity: Activity;
  onNext: () => void;
  onBack: () => void;
}

export function Phase5PeerReview({ activity, onNext, onBack }: Phase5Props) {
  const [peerDraft, setPeerDraft] = useState<PeerReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedReview, setSubmittedReview] = useState(false);

  // Rubric scores & feedback
  const [claimScore, setClaimScore] = useState(4);
  const [evidenceScore, setEvidenceScore] = useState(3);
  const [reasoningScore, setReasoningScore] = useState(3);
  const [strengths, setStrengths] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    void fetch(`/api/peer-reviews?activityId=${activity.id}&studentId=demo-student-01`)
      .then((res) => res.json())
      .then((data: { assignedDraft?: PeerReviewSubmission; error?: string }) => {
        if (data.assignedDraft) {
          setPeerDraft(data.assignedDraft);
        } else {
          // Fallback realistic synthetic draft
          setPeerDraft({
            id: "synthetic-peer-01",
            submissionId: "sub-synthetic-01",
            authorStudentId: "peer-student-02",
            activityId: activity.id,
            anonymousAuthorAlias: "นักเรียนนิรนาม A-14",
            content: {
              claim: "ถ้าไม่มีงู หนูนาจะเพิ่มขึ้น และพลังงานในระบบจะหมุนเวียนกลับมาให้พืชใช้ใหม่",
              evidence: "จากตาราง หนูเพิ่มขึ้นจาก 300 เป็น 1250 ตัว",
              reasoning: "เพราะงูไม่กินหนูแล้ว และพลังงานถูกถ่ายทอดกลับไปเป็นปุ๋ยให้พืชโตขึ้น",
            },
            submittedAt: new Date().toISOString(),
            isSynthetic: true,
            misconceptionTag: "energy_is_recycled",
          });
        }
      })
      .catch(() => setError("โหลดงานของเพื่อนไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [activity.id]);

  async function submitReview() {
    if (!peerDraft) return;
    const combinedFeedback = feedbackText.trim()
      ? feedbackText
      : `[จุดเด่น]: ${strengths || "ระบุประชากรหนูชัดเจน"} | [ข้อเสนอแนะ]: ${suggestions || "ควรตรวจสอบว่าพลังงานหมุนเวียนได้จริงหรือไม่ หรือสูญเสียเป็นความร้อนตามกฎ 10%"}`;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/peer-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerStudentId: "demo-student-01",
          submissionId: peerDraft.submissionId,
          authorStudentId: peerDraft.authorStudentId,
          activityId: activity.id,
          feedback: combinedFeedback,
          scores: {
            claim: claimScore,
            evidence: evidenceScore,
            reasoning: reasoningScore,
          },
          strengths,
          suggestions,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "บันทึกการประเมินไม่สำเร็จ");
      setSubmittedReview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งการประเมิน");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 5 / 7 · PEER REVIEW</span>
        <h2>👥 ประเมินข้อโต้แย้งของเพื่อน (Argumentation Session)</h2>
        <p className="phase-lead">
          อ่านข้อโต้แย้ง CER ของเพื่อนร่วมชั้นแบบไม่ระบุชื่อ (Anonymized) และให้ข้อเสนอแนะเชิงสร้างสรรค์ตามเกณฑ์วิทยาศาสตร์
        </p>
      </div>

      {loading && <p className="muted-text">กำลังค้นหาข้อโต้แย้งของเพื่อนในระบบ…</p>}

      {peerDraft && (
        <div className="grid-2-col">
          {/* Peer Draft Display */}
          <div className="card content-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">ANONYMIZED PEER ARGUMENT</p>
                <h3>ผลงานของ: {peerDraft.anonymousAuthorAlias}</h3>
              </div>
              <span className="anon-badge">🔒 ซ่อนชื่อผู้ส่ง</span>
            </div>

            <div className="peer-cer-display">
              <div className="peer-cer-block">
                <span className="cer-tag tag-claim">Claim ของเพื่อน:</span>
                <p>{peerDraft.content.claim || "ไม่มีข้อความ"}</p>
              </div>

              <div className="peer-cer-block">
                <span className="cer-tag tag-evidence">Evidence ของเพื่อน:</span>
                <p>{peerDraft.content.evidence || "ไม่มีข้อความ"}</p>
              </div>

              <div className="peer-cer-block">
                <span className="cer-tag tag-reasoning">Reasoning ของเพื่อน:</span>
                <p>{peerDraft.content.reasoning || "ไม่มีข้อความ"}</p>
              </div>
            </div>

            {/* AI Review Coach Assist */}
            <div className="ai-coach-review-box">
              <div className="coach-review-header">
                <span>🤖 AI Socratic Review Coach (ตัวช่วยผู้ประเมิน)</span>
              </div>
              <p>
                💡 <strong>คำถามชวนสังเกต:</strong> ลองดูส่วน Reasoning ของเพื่อนว่า <em>&ldquo;พลังงานสามารถหมุนเวียนกลับมาใช้ใหม่ได้จริงหรือไม่?&rdquo;</em> หรือสอดคล้องกับ <strong>กฎ 10% และการสูญเสียความร้อน</strong> อย่างไร?
              </p>
            </div>
          </div>

          {/* Reviewer Rubric & Feedback Form */}
          <div className="card content-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">YOUR EVALUATION</p>
                <h3>ให้คะแนนและข้อเสนอแนะแก่เพื่อน</h3>
              </div>
            </div>

            {submittedReview ? (
              <div className="success-banner">
                <h4>✅ บันทึกข้อเสนอแนะสำเร็จ!</h4>
                <p>ความคิดเห็นของคุณถูกส่งไปยังคิวของเพื่อนและบันทึกลงใน Learning Timeline เรียบร้อยแล้ว</p>
                <div className="score-summary">
                  <span>คะแนนประเมิน: Claim ({claimScore}/5) · Evidence ({evidenceScore}/5) · Reasoning ({reasoningScore}/5)</span>
                </div>
              </div>
            ) : (
              <div className="review-form-body">
                <div className="rubric-sliders">
                  <div className="rubric-row">
                    <label>Claim ตรงประเด็น ({claimScore}/5):</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={claimScore}
                      onChange={(e) => setClaimScore(Number(e.target.value))}
                    />
                  </div>

                  <div className="rubric-row">
                    <label>Evidence มีตัวเลขหลักฐาน ({evidenceScore}/5):</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={evidenceScore}
                      onChange={(e) => setEvidenceScore(Number(e.target.value))}
                    />
                  </div>

                  <div className="rubric-row">
                    <label>Reasoning อธิบายกลไกถูกต้อง ({reasoningScore}/5):</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={reasoningScore}
                      onChange={(e) => setReasoningScore(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="strengths-text">
                    <strong>🌟 สิ่งที่เพื่อนทำได้ดี (จุดเด่น):</strong>
                  </label>
                  <input
                    id="strengths-text"
                    type="text"
                    className="form-input"
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="เช่น ระบุตัวเลขการเพิ่มขึ้นของหนูได้ชัดเจน..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="suggs-text">
                    <strong>💡 สิ่งที่ควรปรับปรุงหรือคิดต่อ (ข้อเสนอแนะ):</strong>
                  </label>
                  <textarea
                    id="suggs-text"
                    className="form-textarea"
                    rows={3}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    placeholder="เช่น ควรทบทวนเรื่องพลังงานว่าพลังงานสูญเสียเป็นความร้อน ไม่สามารถหมุนเวียนกลับมาได้..."
                  />
                </div>

                <button
                  type="button"
                  className="primary-button submit-btn"
                  onClick={() => void submitReview()}
                  disabled={submitting}
                >
                  {submitting ? "กำลังบันทึก..." : "ส่งการประเมินให้เพื่อน"}
                </button>

                {error && <p className="error-text">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="action-row space-between bottom-nav">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← กลับไปดู CER ของตนเอง (Phase 4)
        </button>
        <button
          type="button"
          className="primary-button next-phase-btn"
          onClick={onNext}
          disabled={!submittedReview && !peerDraft}
        >
          ไปปรับปรุงข้อโต้แย้งฉบับสมบูรณ์ ➔ (Phase 6)
        </button>
      </div>
    </div>
  );
}
