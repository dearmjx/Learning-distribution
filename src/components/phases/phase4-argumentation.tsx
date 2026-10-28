"use client";

import { useState } from "react";
import type { Activity, CerResponse, CoachFeedback, HintDepth, Submission } from "@/lib/domain/types";
import { SocraticCoachChat } from "@/components/socratic-coach-chat";
import { AiEvaluatingIndicator } from "@/components/ai-evaluating-indicator";
import { diagnosticLogger } from "@/lib/telemetry-logger";
import { studentFriendlyError } from "@/lib/ui/student-errors";

// Sentence starters scaffold the structure without writing the content (no answers, LOS-014).
const SENTENCE_STARTERS: Record<keyof CerResponse, string[]> = {
  claim: ["ฉันคิดว่า...", "เมื่อ... ลดลง จะทำให้..."],
  evidence: ["จากข้อมูลพบว่า...", "ตัวเลขที่แสดงคือ... เพิ่มจาก... เป็น..."],
  reasoning: ["สิ่งนี้เกิดขึ้นเพราะ...", "หลักการที่อธิบายได้คือ...", "ดังนั้นจึงแสดงว่า..."],
};

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
  // Research field: real seconds spent drafting before the freeze, not a constant.
  const [phaseStartedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFrozen, setIsFrozen] = useState(Boolean(existingResult?.submission?.draft1Frozen ?? existingResult?.submission));
  const [frozenAt, setFrozenAt] = useState<string | null>(existingResult?.submission?.draft1FrozenAt ?? null);
  const [result, setResult] = useState<{ submission: Submission; feedback: CoachFeedback } | null>(
    existingResult ?? null,
  );
  const [showChat, setShowChat] = useState(true);

  async function handleFreezeAndSubmit() {
    if (!cer.claim.trim() || !cer.evidence.trim() || !cer.reasoning.trim()) {
      setError("กรุณากรอก Claim, Evidence, และ Reasoning ให้ครบถ้วนเพื่อ Freeze Draft 1 Baseline ก่อนรับคำแนะนำจาก AI Coach");
      return;
    }

    setLoading(true);
    setError("");
    const now = new Date().toISOString();

    const startTime = performance.now();
    diagnosticLogger.log({
      level: "info",
      category: "API",
      message: `[Phase 4] Freezing Draft 1 Baseline for student '${studentId}' (activity: ${activity.id})`,
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
        // No studentId: the server records the signed-in student.
        body: JSON.stringify({
          activityId: activity.id,
          content: cer,
          hintDepth,
          responseTimeSeconds: Math.round((Date.now() - phaseStartedAt) / 1000),
          draft1Frozen: true,
        }),
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error ?? "ไม่สามารถบันทึก Draft 1 Baseline ได้";
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
        message: `[Phase 4] Draft 1 frozen & AI Coach evaluated in ${elapsedMs}ms (${feedback.provider})`,
        telemetry: feedback.telemetry,
        details: {
          targetDimension: feedback.targetDimension,
          citations: feedback.citations,
          directAnswerBlocked: feedback.directAnswerBlocked,
          safetyFlags: feedback.safetyFlags,
        },
      });

      setIsFrozen(true);
      setFrozenAt(now);
      setResult(data);
      if (hintDepth === "deep") setShowChat(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการวิเคราะห์";
      setError(studentFriendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

  function starterChips(field: keyof CerResponse) {
    if (isFrozen) return null;
    return (
      <div className="starter-chips" role="group" aria-label="ตัวช่วยเริ่มประโยค">
        <span className="starter-label">ไม่รู้จะเริ่มยังไง? กดเลือก:</span>
        {SENTENCE_STARTERS[field].map((starter) => (
          <button
            key={starter}
            type="button"
            className="quick-chip"
            onClick={() => {
              // The chip shows "..." as a cue; the student continues typing where it stops.
              const text = starter.replace(/\.\.\.$/, "").replace(/\.\.\.\s*/g, " ");
              onChangeCer({ ...cer, [field]: cer[field].trim() ? `${cer[field].trimEnd()} ${text}` : text });
            }}
          >
            {starter}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 4 / 7 · ARGUMENTATION</span>
        <h2>✍️ สร้างข้อโต้แย้งทางวิทยาศาสตร์ (CER)</h2>
        <p className="phase-lead">
          เขียนข้อสรุป (Claim) ที่มีข้อมูลหลักฐานรองรับ (Evidence) และเชื่อมโยงด้วยหลักการทางวิทยาศาสตร์ (Reasoning) แล้วกด Freeze Draft 1 เพื่อรับคำถามนำจาก AI Coach
        </p>
      </div>

      {/* CAR Baseline Freeze Status Alert */}
      <div className={`status-banner ${isFrozen ? "status-frozen" : "status-draft"}`} style={{
        padding: "12px 18px",
        borderRadius: "8px",
        marginBottom: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: isFrozen ? "#ecfdf5" : "#eff6ff",
        border: `1px solid ${isFrozen ? "#a7f3d0" : "#bfdbfe"}`,
        color: isFrozen ? "#065f46" : "#1e40af",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.3rem" }}>{isFrozen ? "🔒" : "📝"}</span>
          <div>
            <strong>{isFrozen ? "Draft 1 Baseline: แช่แข็งแล้ว (Frozen Baseline)" : "Draft 1: กำลังร่างอิสระ (ยังไม่ Freeze)"}</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
              {isFrozen
                ? `บันทึกเป็นฐานข้อมูลวิจัยก่อนรับการโค้ช (Frozen at: ${frozenAt ? new Date(frozenAt).toLocaleTimeString("th-TH") : "เรียบร้อย"})`
                : "นักเรียนต้องสร้างข้อโต้แย้งด้วยตนเองอย่างอิสระ จากนั้นกด Freeze เพื่อปลดล็อค AI Socratic Coach"}
            </p>
          </div>
        </div>
        {isFrozen && (
          <button
            type="button"
            className="secondary-button compact-button"
            style={{ fontSize: "0.8rem", padding: "4px 10px" }}
            onClick={() => {
              if (window.confirm("คุณต้องการแก้ไขเนื้อหา Draft 1 หรือไม่? (การแก้ไขหลังจากนี้จะถูกบันทึกเป็น Revision สำหรับ Phase 6)")) {
                setIsFrozen(false);
              }
            }}
          >
            ✏️ ปลดล็อคเพื่อแก้ไข
          </button>
        )}
      </div>

      <div className="grid-2-col">
        {/* Left Col: CER Form */}
        <div className="card content-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ARGUMENT DRAFT 1</p>
              <h3>ร่างข้อโต้แย้งของคุณ {isFrozen && <span style={{ fontSize: "0.8rem", color: "#059669" }}>[Frozen Baseline]</span>}</h3>
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
              readOnly={isFrozen}
              style={isFrozen ? { backgroundColor: "#f8fafc", cursor: "not-allowed", borderColor: "#cbd5e1" } : {}}
              value={cer.claim}
              onChange={(e) => onChangeCer({ ...cer, claim: e.target.value })}
              placeholder="ตัวอย่าง: หากประชากรงูลดลงอย่างมาก จะทำให้ประชากรหนูนาเพิ่มขึ้นอย่างรวดเร็ว ส่วนพืชผู้ผลิตจะลดลง และพลังงานรวมในระบบสูญเสียมากขึ้น..."
            />
            {starterChips("claim")}
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
              readOnly={isFrozen}
              style={isFrozen ? { backgroundColor: "#f8fafc", cursor: "not-allowed", borderColor: "#cbd5e1" } : {}}
              value={cer.evidence}
              onChange={(e) => onChangeCer({ ...cer, evidence: e.target.value })}
              placeholder="ตัวอย่าง: จากตารางการสืบเสาะ เมื่อประชากรงูลดลงจาก 100 เหลือ 10 ตัว พบว่าจำนวนหนูเพิ่มขึ้นจาก 50 เป็น 280 ตัวใน 3 เดือน..."
            />
            {starterChips("evidence")}
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
              readOnly={isFrozen}
              style={isFrozen ? { backgroundColor: "#f8fafc", cursor: "not-allowed", borderColor: "#cbd5e1" } : {}}
              value={cer.reasoning}
              onChange={(e) => onChangeCer({ ...cer, reasoning: e.target.value })}
              placeholder="ตัวอย่าง: เพราะงูเป็นผู้บริโภคลำดับที่ 2 ที่คอยควบคุมประชากรหนู และตามกฎ 10% พลังงานจะสูญเสียเป็นความร้อนถึง 90%..."
            />
            {starterChips("reasoning")}
          </div>

          {!isFrozen && (
            <div className="hint-selector-box">
              <label htmlFor="hint-level"><strong>เลือกระดับคำแนะนำจาก AI Coach เมื่อ Freeze:</strong></label>
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
          )}

          {!isFrozen ? (
            <button
              type="button"
              className="primary-button submit-btn"
              onClick={() => void handleFreezeAndSubmit()}
              disabled={loading}
              style={{ background: "#059669", borderColor: "#047857" }}
            >
              {loading ? "🔒 กำลัง Freeze Baseline และเรียก AI Coach..." : "🔒 ยืนยันและแช่แข็ง Draft 1 Baseline (Freeze) เพื่อขอโค้ช"}
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "8px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", color: "#15803d", fontSize: "0.9rem" }}>
              ✓ Draft 1 Baseline ถูกบันทึกอย่างสมบูรณ์แล้ว พร้อมเข้าสู่กระบวนการโค้ชด้านขวามือ
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>

        {/* Right Col: AI Feedback, Evaluating Animation or Guide */}
        <div className="right-panel">
          {loading ? (
            <AiEvaluatingIndicator
              title="AI Coach กำลังอ่านงานของคุณ..."
              subtitle="กำลังคิดคำถามชวนคิด รอสักครู่ ระบบไม่ได้ค้าง"
            />
          ) : result && isFrozen ? (
            <div className="feedback-wrapper">
              <div className="card feedback-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">SOCRATIC AI COACH</p>
                    <h3>คำถามชวนคิดเพื่อการสังเคราะห์</h3>
                  </div>
                  <span className="target-badge">{result.feedback.targetDimension}</span>
                </div>
                <blockquote>{result.feedback.message}</blockquote>
                <div className="citation">อ้างอิง: {result.feedback.citations.join(" · ")}</div>
                <p className="guardrail-note">✓ Direct answer ถูกบล็อก · AI Coach ตั้งคำถามนำเพื่อฝึกคิดสังเคราะห์</p>

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
                  <p className="eyebrow">DRAFT 1 BASELINE LOCK</p>
                  <h3>คำแนะนำก่อนกด Freeze Baseline</h3>
                </div>
              </div>
              <ul className="guide-list">
                <li><strong>Claim:</strong> ต้องเป็นประโยคบอกเล่าที่ตอบคำถามได้ตรงประเด็นและชัดเจน</li>
                <li><strong>Evidence:</strong> ต้องมีตัวเลขหรือข้อเท็จจริงจากการสืบเสาะใน Phase 3</li>
                <li><strong>Reasoning:</strong> ต้องใช้กฎ 10% หรือความสัมพันธ์ในสายใยอาหารเพื่ออธิบายกลไก</li>
              </ul>
              <div style={{ margin: "14px 0", padding: "12px", background: "#f8fafc", borderRadius: "6px", border: "1px dashed #94a3b8", fontSize: "0.88rem", color: "#334155" }}>
                🔒 <strong>ทำไมต้อง Freeze Draft 1?</strong><br />
                เพื่อเก็บบันทึกระดับการคิดเริ่มต้นของนักเรียนเป็นข้อมูลวิจัย ก่อนที่จะได้รับคำถามชี้แนะจาก AI Coach ในขั้นตอนถัดไป
              </div>
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
