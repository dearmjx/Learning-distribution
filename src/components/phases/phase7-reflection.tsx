"use client";

import { useState } from "react";
import Link from "next/link";
import type { Activity } from "@/lib/domain/types";

interface Phase7Props {
  activity: Activity;
  onBack: () => void;
}

const CONCEPTS_CHECKLIST = [
  "การถ่ายทอดพลังงานตามกฎ 10% (10% Energy Rule)",
  "การสูญเสียพลังงานในรูปความร้อน (Heat Dissipation)",
  "ผลกระทบลูกโซ่ในระบบนิเวศ (Trophic Cascade)",
  "การแยกแยะระหว่าง Claim, Evidence และ Reasoning",
  "การใช้ AI แบบถามนำ (Socratic) โดยไม่ลอกคำตอบตรงๆ",
];

export function Phase7Reflection({ activity, onBack }: Phase7Props) {
  const [analyticalScore, setAnalyticalScore] = useState(4);
  const [aiLiteracyScore, setAiLiteracyScore] = useState(5);
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("high");
  const [reflectionText, setReflectionText] = useState(
    "การทำกิจกรรมทำให้เข้าใจชัดเจนว่าเมื่อผู้ล่าลดลง จะกระทบต่อโครงสร้างประชากรและพลังงานทั้งระบบ และการที่ AI Coach ถามนำทำให้ต้องคิดหาหลักฐานมาสนับสนุนเองแทนที่จะรอคำตอบ",
  );
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(CONCEPTS_CHECKLIST);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function toggleConcept(item: string) {
    if (selectedConcepts.includes(item)) {
      setSelectedConcepts(selectedConcepts.filter((c) => c !== item));
    } else {
      setSelectedConcepts([...selectedConcepts, item]);
    }
  }

  async function submitReflection() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "demo-student-01",
          activityId: activity.id,
          analyticalThinkingScore: analyticalScore,
          aiLiteracyScore: aiLiteracyScore,
          reflectionText,
          keyLearnings: selectedConcepts,
          confidenceRating: confidence,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "บันทึกการสะท้อนคิดไม่สำเร็จ");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 7 / 7 · REFLECTION</span>
        <h2>🌟 การสะท้อนคิดและสรุปการเรียนรู้ (Metacognitive Reflection)</h2>
        <p className="phase-lead">
          ประเมินตนเองด้านการคิดวิเคราะห์ ความเข้าใจมโนทัศน์ชีววิทยา และการรู้เท่าทัน AI (AI Literacy)
        </p>
      </div>

      <div className="grid-2-col">
        {/* Left Column: Reflection Form */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SELF-EVALUATION</p>
              <h3>แบบประเมินตนเอง</h3>
            </div>
            <span className="unit-badge">การรู้เท่าทัน AI</span>
          </div>

          <div className="rubric-sliders">
            <div className="rubric-row">
              <label>ความมั่นใจในการคิดวิเคราะห์ทางวิทยาศาสตร์ ({analyticalScore}/5):</label>
              <input
                type="range"
                min="1"
                max="5"
                value={analyticalScore}
                onChange={(e) => setAnalyticalScore(Number(e.target.value))}
              />
            </div>

            <div className="rubric-row">
              <label>ความเข้าใจในการใช้ AI Coach อย่างสร้างสรรค์ ({aiLiteracyScore}/5):</label>
              <input
                type="range"
                min="1"
                max="5"
                value={aiLiteracyScore}
                onChange={(e) => setAiLiteracyScore(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <strong>ระดับความมั่นใจในบทเรียนระบบนิเวศ:</strong>
            </label>
            <div className="radio-group-row">
              {(["low", "medium", "high"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`radio-pill-btn ${confidence === lvl ? "pill-selected" : ""}`}
                  onClick={() => setConfidence(lvl)}
                >
                  {lvl === "low" ? "🌱 เริ่มเข้าใจ" : lvl === "medium" ? "🌿 ปานกลาง" : "🌳 มั่นใจมาก"}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ref-textarea">
              <strong>📝 สรุปสิ่งที่คุณได้เรียนรู้และประสบการณ์การใช้ AI Coach:</strong>
            </label>
            <textarea
              id="ref-textarea"
              className="form-textarea"
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="พิมพ์ข้อคิดเห็นและการเรียนรู้ของคุณที่นี่..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <strong>🎯 มโนทัศน์ที่คุณเข้าใจชัดเจนแล้วในรอบนี้:</strong>
            </label>
            <div className="concept-checklist">
              {CONCEPTS_CHECKLIST.map((concept) => {
                const checked = selectedConcepts.includes(concept);
                return (
                  <label key={concept} className="concept-checkbox-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleConcept(concept)}
                    />
                    <span>{concept}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="primary-button submit-btn"
            onClick={() => void submitReflection()}
            disabled={submitting}
          >
            {submitting ? "กำลังบันทึก..." : "ส่งการสะท้อนคิดและเสร็จสิ้นกระบวนการ ADI"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </div>

        {/* Right Column: Completion Card / Certificate Preview */}
        <div className="card content-card complete-summary-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ADI INQUIRY CYCLE</p>
              <h3>สรุปผลการเรียนรู้รอบนี้</h3>
            </div>
            <span className="phase-label">7/7 Complete</span>
          </div>

          {submitted ? (
            <div className="certificate-banner">
              <div className="trophy-icon">🏆</div>
              <h4>ยินดีด้วย! คุณผ่านกระบวนการ ADI ครบ 7 ขั้นตอน</h4>
              <p className="cert-lead">
                ข้อมูลทุกขั้นตอนถูกบันทึกเป็นหลักฐานการเรียนรู้เชิงพัฒนาการ (Learning Evidence) ในระบบเรียบร้อยแล้ว
              </p>
              <div className="cert-stats">
                <div><span>กระบวนการ</span><strong>7 Phases</strong></div>
                <div><span>ข้อโต้แย้ง</span><strong>2 Versions (CER)</strong></div>
                <div><span>ประเมินเพื่อน</span><strong>1 Peer Review</strong></div>
                <div><span>สถานะ</span><strong className="status-done">บันทึกสำเร็จ</strong></div>
              </div>
              <div className="cert-links">
                <Link className="primary-button compact-button" href="/student/timeline">
                  📜 ดู Learning Timeline ของฉัน →
                </Link>
                <Link className="secondary-button compact-button" href="/teacher/review">
                  👩‍🏫 มุมมองครูผู้ตรวจ (Teacher Dashboard) →
                </Link>
              </div>
            </div>
          ) : (
            <div className="summary-pending-box">
              <div className="pending-icon">⏳</div>
              <h4>พร้อมส่งการสะท้อนคิด</h4>
              <p>
                เมื่อกดส่ง ระบบจะสร้างสรุปกระบวนการเรียนรู้และอัปเดต Timeline สำหรับการประเมินเพื่อพัฒนาการ (Formative Assessment)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="action-row space-between bottom-nav">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← กลับไปดูฉบับปรับปรุง (Phase 6)
        </button>
      </div>
    </div>
  );
}
