"use client";

import { useState } from "react";

interface Phase2Props {
  onNext: (variablesData: Record<string, string>) => void;
  onBack: () => void;
  savedData?: Record<string, string>;
}

export function Phase2Identification({ onNext, onBack, savedData }: Phase2Props) {
  const [independent, setIndependent] = useState(
    savedData?.independent ?? "การลดลงของประชากรงู (ผู้บริโภคอันดับสูงสุด)",
  );
  const [dependent, setDependent] = useState(
    savedData?.dependent ?? "ประชากรหนูนา, กบ, หญ้า และปริมาณพลังงานในระบบ",
  );
  const [controlled, setControlled] = useState(
    savedData?.controlled ?? "สภาพแวดล้อมทางกายภาพ (แสงแดด, ปริมาณน้ำฝน, อุณหภูมิ)",
  );
  const [hypothesis, setHypothesis] = useState(
    savedData?.hypothesis ?? "หากประชากรงูลดลง ประชากรหนูจะเพิ่มขึ้นอย่างรวดเร็ว ส่งผลให้พืชผู้ผลิตลดลง และพลังงานถ่ายทอดลดลง",
  );

  function handleProceed() {
    onNext({ independent, dependent, controlled, hypothesis });
  }

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 2 / 7 · IDENTIFICATION</span>
        <h2>🔍 กำหนดปัญหา ตัวแปร และสมมติฐาน</h2>
        <p className="phase-lead">
          ก่อนทำการสืบเสาะข้อมูล ให้ระบุตัวแปรสำคัญที่เกี่ยวข้องในระบบนิเวศและตั้งสมมติฐานเบื้องต้น
        </p>
      </div>

      <div className="card content-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">VARIABLES MATRIX</p>
            <h3>ระบุตัวแปรทางวิทยาศาสตร์</h3>
          </div>
        </div>

        <div className="variables-grid">
          <div className="variable-card var-independent">
            <span className="var-badge">ตัวแปรต้น (Independent Variable)</span>
            <label htmlFor="ind-var">สิ่งที่เป็นสาเหตุของการเปลี่ยนแปลง:</label>
            <input
              id="ind-var"
              type="text"
              className="form-input"
              value={independent}
              onChange={(e) => setIndependent(e.target.value)}
              placeholder="เช่น การลดลงของประชากรงู"
            />
            <small>ตัวแปรที่ถูกปรับเปลี่ยนหรือเกิดขึ้นในสถานการณ์</small>
          </div>

          <div className="variable-card var-dependent">
            <span className="var-badge">ตัวแปรตาม (Dependent Variable)</span>
            <label htmlFor="dep-var">ผลที่ต้องการวัดหรือสังเกต:</label>
            <input
              id="dep-var"
              type="text"
              className="form-input"
              value={dependent}
              onChange={(e) => setDependent(e.target.value)}
              placeholder="เช่น ประชากรหนู, กบ, พืช, พลังงาน"
            />
            <small>ตัวแปรที่เปลี่ยนแปลงตามผลของตัวแปรต้น</small>
          </div>

          <div className="variable-card var-controlled">
            <span className="var-badge">ตัวแปรควบคุม (Controlled Variables)</span>
            <label htmlFor="ctrl-var">ปัจจัยที่ต้องควบคุมให้คงที่:</label>
            <input
              id="ctrl-var"
              type="text"
              className="form-input"
              value={controlled}
              onChange={(e) => setControlled(e.target.value)}
              placeholder="เช่น สภาพอากาศ, ปริมาณน้ำฝน, พื้นที่ศึกษา"
            />
            <small>ปัจจัยทางกายภาพอื่นๆ ที่ต้องควบคุมไม่ให้รบกวนการทดลอง</small>
          </div>
        </div>

        <div className="hypothesis-box">
          <label htmlFor="hypo-input">
            <strong>📝 สมมติฐานเชิงเหตุผลของคุณ (Initial Hypothesis):</strong>
          </label>
          <textarea
            id="hypo-input"
            className="form-textarea"
            rows={3}
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="ถ้า... (ตัวแปรต้น) แล้ว... (ตัวแปรตาม) เพราะ... (เหตุผล)"
          />
        </div>

        <div className="action-row space-between">
          <button type="button" className="secondary-button" onClick={onBack}>
            ← กลับไปดูสถานการณ์ (Phase 1)
          </button>
          <button type="button" className="primary-button next-phase-btn" onClick={handleProceed}>
            บันทึกตัวแปร ➔ ไปสำรวจข้อมูลสืบเสาะ (Phase 3)
          </button>
        </div>
      </div>
    </div>
  );
}
