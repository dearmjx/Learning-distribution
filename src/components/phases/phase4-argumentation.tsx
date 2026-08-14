"use client";

import { useState } from "react";
import type { Activity, CerResponse, CoachFeedback, HintDepth, Submission } from "@/lib/domain/types";
import { SocraticCoachChat } from "@/components/socratic-coach-chat";

interface Phase4Props {
  activity: Activity;
  cer: CerResponse;
  onChangeCer: (newCer: CerResponse) => void;
  onNext: (submission: Submission, feedback: CoachFeedback) => void;
  onBack: () => void;
  existingResult?: { submission: Submission; feedback: CoachFeedback } | null;
}

export function Phase4Argumentation({
  activity,
  cer,
  onChangeCer,
  onNext,
  onBack,
  existingResult,
}: Phase4Props) {
  const [hintDepth, setHintDepth] = useState<HintDepth>("deep");
  const [responseTimeSeconds, setResponseTimeSeconds] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ submission: Submission; feedback: CoachFeedback } | null>(
    existingResult ?? null,
  );
  const [showChat, setShowChat] = useState(true);

  async function submitCer() {
    if (!cer.claim.trim() || !cer.evidence.trim()) {
      setError("กรุณากรอก Claim และ Evidence ให้ครบถ้วนก่อนส่งให้ AI Coach");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "demo-student-01",
          activityId: activity.id,
          content: cer,
          hintDepth,
          responseTimeSeconds,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถส่งข้อโต้แย้งได้");

      setResult(data);
      if (hintDepth === "deep") setShowChat(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการวิเคราะห์");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 4 / 7 · ARGUMENTATION</span>
        <h2>✍️ สร้างข้อโต้แย้งทางวิทยาศาสตร์ (CER)</h2>
        <p className="phase-lead">
          เขียนข้อสรุป (Claim) ที่มีข้อมูลหลักฐานรองรับ (Evidence) และเชื่อมโยงด้วยหลักการทางวิทยาศาสตร์ (Reasoning) พร้อมรับคำถามนำจาก AI Coach
        </p>
      </div>

      <div className="grid-2-col">
        {/* Left Col: CER Form */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ARGUMENT DRAFT</p>
              <h3>ร่างข้อโต้แย้งของคุณ</h3>
            </div>
            <span className="cer-mark">Claim · Evidence · Reasoning</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cer-claim">
              <strong>1. Claim (ข้อสรุป/คำตอบของปัญหา)</strong>
              <small>ตอบคำถามนำว่าการลดลงของงูส่งผลต่อสิ่งมีชีวิตและพลังงานอย่างไร</small>
            </label>
            <textarea
              id="cer-claim"
              className="form-textarea"
              rows={3}
              value={cer.claim}
              onChange={(e) => onChangeCer({ ...cer, claim: e.target.value })}
              placeholder="ตัวอย่าง: หากประชากรงูลดลงอย่างมาก จะทำให้ประชากรหนูนาเพิ่มขึ้นอย่างรวดเร็ว ส่วนพืชผู้ผลิตจะลดลง และพลังงานรวมในระบบสูญเสียมากขึ้น..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cer-evidence">
              <strong>2. Evidence (ข้อมูลเชิงประจักษ์/ตัวเลขจาก Phase 3)</strong>
              <small>อ้างอิงข้อมูลตัวเลขหรือการเปลี่ยนแปลงจากตารางสืบเสาะ</small>
            </label>
            <textarea
              id="cer-evidence"
              className="form-textarea"
              rows={3}
              value={cer.evidence}
              onChange={(e) => onChangeCer({ ...cer, evidence: e.target.value })}
              placeholder="ตัวอย่าง: จากข้อมูลสืบเสาะ เมื่อประชากรงูลดจาก 80 เหลือ 5 ตัว พบว่าหนูนาเพิ่มจาก 300 เป็น 1,250 ตัว (+317%) และหญ้าลดลงจาก 50,000 เหลือ 22,000 ต้น (-56%)..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cer-reasoning">
              <strong>3. Reasoning (คำอธิบายเชิงกลไก & กฎ 10%)</strong>
              <small>อธิบายว่าทำไมหลักฐานถึงสนับสนุนข้อสรุปโดยใช้ทฤษฎีทางชีววิทยา</small>
            </label>
            <textarea
              id="cer-reasoning"
              className="form-textarea"
              rows={3}
              value={cer.reasoning}
              onChange={(e) => onChangeCer({ ...cer, reasoning: e.target.value })}
              placeholder="ตัวอย่าง: เนื่องจากงูเป็นผู้บริโภคอันดับสุดท้ายที่ควบคุมประชากรหนู เมื่อผู้ล่าลดลงทำให้หนูขยายพันธุ์เร็วและกินหญ้ามากขึ้น และตามกฎ 10% การถ่ายทอดพลังงาน..."
            />
          </div>

          <div className="hint-selector-box">
            <label htmlFor="hint-level"><strong>เลือกระดับคำแนะนำจาก AI Coach:</strong></label>
            <select
              id="hint-level"
              className="form-select"
              value={hintDepth}
              onChange={(e) => setHintDepth(e.target.value as HintDepth)}
            >
              <option value="none">ไม่ขอคำแนะนำ (0 pt)</option>
              <option value="shallow">คำถามกระตุ้นความจำเบื้องต้น (-1 pt)</option>
              <option value="concept">คำถามเชื่อมโยงมโนทัศน์ (-2 pt)</option>
              <option value="deep">🌟 Socratic Deep Dive + Mini-Chat (-3 pt)</option>
            </select>
          </div>

          <button
            type="button"
            className="primary-button submit-btn"
            onClick={() => void submitCer()}
            disabled={loading}
          >
            {loading ? "กำลังให้ AI Coach วิเคราะห์…" : "ส่งข้อโต้แย้งและรับ Feedback จาก AI Coach"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </div>

        {/* Right Col: AI Feedback & Mini-Chat */}
        <div className="right-panel">
          {result ? (
            <div className="feedback-wrapper">
              <div className="card feedback-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">SOCRATIC AI COACH</p>
                    <h3>คำถามชวนคิด</h3>
                  </div>
                  <span className="target-badge">{result.feedback.targetDimension}</span>
                </div>
                <blockquote>{result.feedback.message}</blockquote>
                <div className="citation">อ้างอิง: {result.feedback.citations.join(" · ")}</div>
                <p className="guardrail-note">✓ Direct answer ถูกบล็อก · AI Coach ตั้งคำถามนำเพื่อฝึกคิดวิเคราะห์</p>
              </div>

              {hintDepth === "deep" || showChat ? (
                <SocraticCoachChat
                  activityId={activity.id}
                  activity={activity}
                  studentCer={cer}
                  initialCoachFeedback={result.feedback.message}
                />
              ) : (
                <div className="unlock-chat-banner">
                  <p>💬 ต้องการคุยถาม-ตอบกับ AI Coach แบบเจาะลึก?</p>
                  <button
                    type="button"
                    className="primary-button compact-button"
                    onClick={() => setShowChat(true)}
                  >
                    เปิด Socratic Mini-Chat (3 pt)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card guide-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">COACH READY</p>
                  <h3>คำแนะนำการเขียน CER</h3>
                </div>
              </div>
              <ul className="guide-list">
                <li><strong>Claim:</strong> ต้องเป็นประโยคบอกเล่าที่ตอบคำถามได้ตรงประเด็นและชัดเจน</li>
                <li><strong>Evidence:</strong> ต้องมีตัวเลขหรือข้อเท็จจริงจากการสืบเสาะใน Phase 3</li>
                <li><strong>Reasoning:</strong> ต้องใช้กฎ 10% หรือความสัมพันธ์ในสายใยอาหารเพื่ออธิบายกลไก</li>
              </ul>
              <p className="small-note">
                เมื่อกดส่ง AI Coach จะวิเคราะห์และตั้งคำถามนำแบบ Socratic ให้คุณทบทวนและปรับปรุง
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="action-row space-between bottom-nav">
        <button type="button" className="secondary-button" onClick={onBack}>
          ← กลับไปดูข้อมูลสืบเสาะ (Phase 3)
        </button>
        <button
          type="button"
          className="primary-button next-phase-btn"
          onClick={() => {
            if (result) onNext(result.submission, result.feedback);
            else void submitCer();
          }}
          disabled={!cer.claim.trim() || !cer.evidence.trim()}
        >
          {result ? "ไปประเมินข้อโต้แย้งของเพื่อน ➔ (Phase 5)" : "ส่ง CER และไปต่อ Phase 5 ➔"}
        </button>
      </div>
    </div>
  );
}
