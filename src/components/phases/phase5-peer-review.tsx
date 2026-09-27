"use client";

import { useCallback, useEffect, useState } from "react";
import type { Activity, PeerReviewSubmission } from "@/lib/domain/types";

interface Phase5Props {
  activity: Activity;
  studentId?: string;
  onNext: () => void;
  onBack: () => void;
}

export function Phase5PeerReview({ activity, studentId = "demo-student-01", onNext, onBack }: Phase5Props) {
  const [peerDraft, setPeerDraft] = useState<PeerReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedReview, setSubmittedReview] = useState(false);
  const [peerReviewEnabled, setPeerReviewEnabled] = useState(true);

  // Rubric scores & feedback: all start empty and must come from the reviewer (LOS-014).
  const [claimScore, setClaimScore] = useState<number | null>(null);
  const [evidenceScore, setEvidenceScore] = useState<number | null>(null);
  const [reasoningScore, setReasoningScore] = useState<number | null>(null);
  const [strengths, setStrengths] = useState("");
  const [suggestions, setSuggestions] = useState("");

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/peer-reviews?activityId=${encodeURIComponent(activity.id)}`);
      const data = (await res.json()) as { assignedDraft?: PeerReviewSubmission | null; peerReviewAllowed?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "โหลดงานของเพื่อนไม่สำเร็จ");
      setPeerReviewEnabled(data.peerReviewAllowed !== false);
      setPeerDraft(data.assignedDraft ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดงานของเพื่อนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [activity.id]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  const missing = [
    claimScore === null && "คะแนน Claim",
    evidenceScore === null && "คะแนน Evidence",
    reasoningScore === null && "คะแนน Reasoning",
    !strengths.trim() && "จุดเด่น",
    !suggestions.trim() && "ข้อเสนอแนะ",
  ].filter(Boolean) as string[];
  // Next is allowed only after a real review, or when there is nothing to review.
  const canProceed = submittedReview || (!loading && !error && (!peerReviewEnabled || !peerDraft));

  async function submitReview() {
    if (!peerDraft || missing.length > 0 || submittedReview) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/peer-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          reviewerStudentId: studentId,
          submissionId: peerDraft.submissionId,
          peerReviewSubmissionId: peerDraft.id,
          authorStudentId: peerDraft.authorStudentId,
          activityId: activity.id,
          scores: {
            claim: claimScore,
            evidence: evidenceScore,
            reasoning: reasoningScore,
          },
          strengths: strengths.trim(),
          suggestions: suggestions.trim(),
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

      {error && !peerDraft && (
        <div className="card content-card" role="alert">
          <p className="error-text">{error}</p>
          <button type="button" className="secondary-button compact-button" onClick={() => void loadAssignment()}>
            ลองใหม่
          </button>
        </div>
      )}

      {!loading && !error && !peerDraft && (
        <div className="card content-card">
          <p className="muted-text">
            {peerReviewEnabled
              ? "ยังไม่มีงานของเพื่อนที่พร้อมให้ประเมินในตอนนี้ ลองกลับมาอีกครั้งเมื่อเพื่อนส่ง Draft 1 แล้ว หรือไปขั้นต่อไปได้"
              : "กิจกรรมนี้ไม่ได้เปิดการประเมินเพื่อน ไปขั้นต่อไปได้เลย"}
          </p>
          {peerReviewEnabled && (
            <button type="button" className="secondary-button compact-button" onClick={() => void loadAssignment()}>
              ตรวจสอบอีกครั้ง
            </button>
          )}
        </div>
      )}

      {peerDraft && (
        <div className="grid-2-col">
          {/* Peer Draft Display */}
          <div className="card content-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">ANONYMIZED PEER ARGUMENT</p>
                <h3>ผลงานของ: {peerDraft.anonymousAuthorAlias}</h3>
              </div>
              <span className="anon-badge">{peerDraft.isSynthetic ? "📘 งานตัวอย่าง (ไม่ใช่ของเพื่อนจริง)" : "🔒 ซ่อนชื่อผู้ส่ง"}</span>
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
                  {([
                    ["Claim ตรงประเด็น", claimScore, setClaimScore],
                    ["Evidence มีตัวเลขหลักฐาน", evidenceScore, setEvidenceScore],
                    ["Reasoning อธิบายกลไกถูกต้อง", reasoningScore, setReasoningScore],
                  ] as const).map(([label, value, setValue]) => (
                    <div className="rubric-row" key={label} role="group" aria-label={label}>
                      <span className="form-label">{label} ({value ?? "ยังไม่เลือก"}/5):</span>
                      <div className="radio-group-row">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            type="button"
                            className={`radio-pill-btn ${value === level ? "pill-selected" : ""}`}
                            aria-pressed={value === level}
                            onClick={() => setValue(level)}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  disabled={submitting || missing.length > 0}
                >
                  {submitting ? "กำลังบันทึก..." : "ส่งการประเมินให้เพื่อน"}
                </button>
                {missing.length > 0 && <p className="small-note">กรุณากรอกให้ครบก่อนส่ง: {missing.join(", ")}</p>}

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
          disabled={!canProceed}
        >
          ไปปรับปรุงข้อโต้แย้งฉบับสมบูรณ์ ➔ (Phase 6)
        </button>
      </div>
    </div>
  );
}
