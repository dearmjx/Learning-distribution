"use client";

import { useState } from "react";
import type { Activity, CerResponse, CoachFeedback, HintDepth, Submission } from "@/lib/domain/types";
import { SocraticCoachChat } from "@/components/socratic-coach-chat";
import { AiEvaluatingIndicator } from "@/components/ai-evaluating-indicator";
import { diagnosticLogger } from "@/lib/telemetry-logger";

interface Phase4Props {
  activity: Activity;
  studentId?: string;
  cer: CerResponse;
  onChangeCer: (newCer: CerResponse) => void;
  onNext: (submission: Submission, feedback: CoachFeedback) => void;
  onBack: () => void;
  existingResult?: { submission: Submission; feedback: CoachFeedback } | null;
}

export function Phase4Argumentation({
  activity,
  studentId = "demo-student-01",
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

    const startTime = performance.now();
    diagnosticLogger.log({
      level: "info",
      category: "API",
      message: `[Phase 4] Sending CER submission for student '${studentId}' (activity: ${activity.id})`,
      details: {
        hintDepth,
        cerLength: {
          claim: cer.claim.length,
          evidence: cer.evidence.length,
          reasoning: cer.reasoning.length,
        },
      },
    });

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          activityId: activity.id,
          content: cer,
          hintDepth,
          responseTimeSeconds,
        }),
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error ?? "ไม่สามารถส่งข้อโต้แย้งได้";
        diagnosticLogger.log({
          level: "error",
          category: "API",
          message: `[Phase 4] /api/sessions returned status ${response.status}: ${errMsg}`,
          details: data,
        });
        throw new Error(errMsg);
      }

      const feedback = data.feedback as CoachFeedback;
      diagnosticLogger.log({
        level: "success",
        category: "LLM",
        message: `[Phase 4] AI Coach evaluated CER in ${elapsedMs}ms (${feedback.provider})`,
        telemetry: feedback.telemetry,
        details: {
          targetDimension: feedback.targetDimension,
          citations: feedback.citations,
          directAnswerBlocked: feedback.directAnswerBlocked,
          safetyFlags: feedback.safetyFlags,
        },
      });

      setResult(data);
      if (hintDepth === "deep") setShowChat(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการวิเคราะห์";
      setError(msg);
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
              <strong>2. Evidence (หลักฐานเชิงประจักษ์จาก Phase 3)</strong>
              <small>ยกตัวเลข ค่าสังเกต หรือตารางข้อมูลที่บันทึกไว้</small>
            </label>
            <textarea
              id="cer-evidence"
              className="form-textarea"
              rows={3}
              value={cer.evidence}
              onChange={(e) => onChangeCer({ ...cer, evidence: e.target.value })}
              placeholder="ตัวอย่าง: จากตารางการสืบเสาะ เมื่อประชากรงูลดลงจาก 100 เหลือ 10 ตัว พบว่าจำนวนหนูเพิ่มขึ้นจาก 50 เป็น 280 ตัวใน 3 เดือน..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cer-reasoning">
              <strong>3. Reasoning (หลักการและเหตุผลทางวิทยาศาสตร์)</strong>
              <small>อธิบายกลไกโดยเชื่อมโยงกับกฎการถ่ายทอดพลังงาน 10% หรือสายใยอาหาร</small>
            </label>
            <textarea
              id="cer-reasoning"
              className="form-textarea"
              rows={3}
              value={cer.reasoning}
              onChange={(e) => onChangeCer({ ...cer, reasoning: e.target.value })}
              placeholder="ตัวอย่าง: เพราะงูเป็นผู้บริโภคลำดับที่ 2 ที่คอยควบคุมประชากรหนู และตามกฎ 10% พลังงานจะสูญเสียเป็นความร้อนถึง 90%..."
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
            {loading ? "🧑‍🏫 อาจารย์ AI กำลังตรวจและคิดคำถาม Socratic…" : "ส่งข้อโต้แย้งและรับ Feedback จาก AI Coach"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </div>

        {/* Right Col: AI Feedback, Evaluating Animation or Guide */}
        <div className="right-panel">
          {loading ? (
            <AiEvaluatingIndicator
              title="อาจารย์ AI กำลังตรวจและคิดคำถาม Socratic..."
              subtitle="กำลังประมวลผลผ่าน Local Ollama Engine (โปรดรอสักครู่ ระบบกำลังทำงาน ไม่ได้ค้าง)"
              modelName="ornith:9b"
            />
          ) : result ? (
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

                {result.feedback.telemetry && (
                  <div className="feedback-telemetry-pill">
                    ⚡ {result.feedback.telemetry.tokensPerSecond ?? 0} t/s | ⏱️ {(result.feedback.telemetry.latencyMs / 1000).toFixed(1)}s ({result.feedback.telemetry.model})
                  </div>
                )}
              </div>

              {hintDepth === "deep" || showChat ? (
                <SocraticCoachChat
                  activityId={activity.id}
                  activity={activity}
                  studentId={studentId}
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
          className="primary-button"
          disabled={!result || loading}
          onClick={() => {
            if (result) {
              onNext(result.submission, result.feedback);
            }
          }}
        >
          ไปยังการประเมินเพื่อน (Phase 5) →
        </button>
      </div>
    </div>
  );
}
