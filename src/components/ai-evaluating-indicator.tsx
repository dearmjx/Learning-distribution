"use client";

import { useEffect, useState } from "react";

interface AiEvaluatingIndicatorProps {
  title?: string;
  subtitle?: string;
  modelName?: string;
}

const THINKING_STEPS = [
  {
    step: 1,
    icon: "🔍",
    label: "อ่านและจัดระเบียบโครงสร้างข้อโต้แย้ง (Claim, Evidence, Reasoning)",
    detail: "แยกแยะข้อสรุป ข้อมูลเชิงประจักษ์ และเหตุผลทางวิทยาศาสตร์...",
  },
  {
    step: 2,
    icon: "🔬",
    label: "ตรวจสอบความสอดคล้องกับหลักการทางชีววิทยา",
    detail: "เทียบกับบริบทที่ครูอนุมัติ: สายใยอาหาร และกฎการถ่ายทอดพลังงาน 10%...",
  },
  {
    step: 3,
    icon: "💡",
    label: "กำลังเรียบเรียงคำถามนำกระตุ้นคิดแบบ Socratic",
    detail: "ปฏิบัติตามนโยบายความปลอดภัยทางการศึกษา: ห้ามเฉลยคำตอบตรงๆ...",
  },
  {
    step: 4,
    icon: "✨",
    label: "กำลังตรวจทานและสรุปข้อชวนคิดเพื่อส่งกลับให้นักเรียน",
    detail: "ตรวจสอบความสร้างสรรค์และเป้าหมายการประเมิน...",
  },
];

export function AiEvaluatingIndicator({
  title = "อาจารย์ AI กำลังตรวจและคิดคำถาม Socratic...",
  subtitle = "กำลังคิดคำถามชวนคิด รอสักครู่ ระบบไม่ได้ค้าง",
  modelName,
}: AiEvaluatingIndicatorProps) {
  const [seconds, setSeconds] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 5500);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, []);

  const currentStep = THINKING_STEPS[stepIndex];

  return (
    <div className="ai-evaluating-card">
      <div className="evaluating-header">
        <div className="pulsing-brain-wrapper">
          <div className="pulsing-ring ring-1" />
          <div className="pulsing-ring ring-2" />
          <div className="brain-avatar">🧑‍🏫</div>
        </div>

        <div className="evaluating-text-col">
          <div className="evaluating-title-row">
            <h4>{title}</h4>
            <span className="live-timer-badge">
              <span className="timer-dot" />
              ⏱️ {seconds} วินาที
            </span>
          </div>
          <p className="evaluating-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Rotating Thought Steps Carousel */}
      <div className="thinking-step-box">
        <div className="step-badge">
          <span>{currentStep.icon}</span>
          <strong>ขั้นตอนที่ {currentStep.step} / {THINKING_STEPS.length}</strong>
        </div>
        <p className="step-label">{currentStep.label}</p>
        <p className="step-detail">{currentStep.detail}</p>

        {/* Progress Bar Animation */}
        <div className="thinking-progress-track">
          <div
            className="thinking-progress-fill"
            style={{ width: `${Math.min(95, 10 + seconds * 3)}%` }}
          />
        </div>
      </div>

      {/* Backend & Hardware Reassurance Footer */}
      <div className="evaluating-footer">
        {modelName && (
          <div className="footer-metric">
            <span className="metric-dot" />
            <span>โมเดล: <strong>{modelName}</strong></span>
          </div>
        )}
        <div className="footer-metric">
          <span className="reassurance-tag">🔒 ตรวจสอบความปลอดภัยตามเกณฑ์ ADI</span>
        </div>
      </div>
    </div>
  );
}
