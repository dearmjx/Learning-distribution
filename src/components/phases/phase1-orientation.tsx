"use client";

import type { Activity } from "@/lib/domain/types";

interface Phase1Props {
  activity: Activity;
  onNext: () => void;
}

export function Phase1Orientation({ activity, onNext }: Phase1Props) {
  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 1 / 7 · ORIENTATION</span>
        <h2>🌱 ปรากฏการณ์และสถานการณ์ปัญหา</h2>
        <p className="phase-lead">
          เริ่มต้นกระบวนการสืบเสาะโดยการทำความเข้าใจบริบทของระบบนิเวศ สังเกตการเปลี่ยนแปลง และตั้งคำถามทางวิทยาศาสตร์
        </p>
      </div>

      <div className="card content-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">SCENARIO & PHENOMENON</p>
            <h3>สถานการณ์: {activity.title}</h3>
          </div>
          <span className="unit-badge">ชีววิทยา ม.4 · {activity.unit}</span>
        </div>

        <div className="story-box">
          <p className="story-text">
            🌾 ในพื้นที่การเกษตรและป่าเบญจพรรณแห่งหนึ่ง เกษตรกรสังเกตพบว่า <strong>จำนวนประชากรงูลดลงอย่างมาก</strong> ในช่วง 2 ปีที่ผ่านมา เนื่องจากการใช้สารเคมีและถูกล่าออกจากพื้นที่
          </p>
          <div className="food-web-visual">
            <div className="food-chain-badge">
              <strong>สายใยอาหาร 1:</strong> หญ้า (ผู้ผลิต) ➔ ตั๊กแตน ➔ กบ ➔ งู (ผู้ล่า)
            </div>
            <div className="food-chain-badge">
              <strong>สายใยอาหาร 2:</strong> หญ้า (ผู้ผลิต) ➔ หนูนา ➔ งู (ผู้ล่า)
            </div>
          </div>
        </div>

        <div className="challenge-callout">
          <h4>🎯 คำถามนำการสืบเสาะ (Guiding Inquiry Question):</h4>
          <blockquote className="inquiry-quote">{activity.prompt}</blockquote>
        </div>

        <div className="objectives-grid">
          <div className="objective-item">
            <span className="obj-icon">🔬</span>
            <div>
              <strong>วิเคราะห์ความสัมพันธ์</strong>
              <p>ระบุการเปลี่ยนแปลงของสิ่งมีชีวิตแต่ละ trophic level ในสายใยอาหาร</p>
            </div>
          </div>
          <div className="objective-item">
            <span className="obj-icon">⚡</span>
            <div>
              <strong>การถ่ายทอดพลังงาน</strong>
              <p>อธิบายการไหลของพลังงานและการสูญเสียพลังงานตามกฎ 10% (10% Energy Rule)</p>
            </div>
          </div>
          <div className="objective-item">
            <span className="obj-icon">✍️</span>
            <div>
              <strong>สร้างข้อโต้แย้ง CER</strong>
              <p>เขียนข้อสรุป (Claim) มีหลักฐาน (Evidence) และเหตุผลเชิงกลไก (Reasoning)</p>
            </div>
          </div>
        </div>

        <div className="action-row">
          <button type="button" className="primary-button next-phase-btn" onClick={onNext}>
            เข้าใจสถานการณ์แล้ว ➔ ไปกำหนดตัวแปร (Phase 2)
          </button>
        </div>
      </div>
    </div>
  );
}
