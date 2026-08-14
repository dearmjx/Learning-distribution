"use client";

import { useState } from "react";

interface Phase3Props {
  onNext: () => void;
  onBack: () => void;
}

interface OrganismData {
  name: string;
  role: string;
  trophicLevel: string;
  populationBefore: number;
  populationAfter: number;
  biomassKg: number;
  energyKcal: number;
}

const ECOSYSTEM_DATA: OrganismData[] = [
  {
    name: "หญ้า & พืชผล",
    role: "ผู้ผลิต (Producer)",
    trophicLevel: "Trophic 1",
    populationBefore: 50000,
    populationAfter: 22000,
    biomassKg: 10000,
    energyKcal: 100000,
  },
  {
    name: "ตั๊กแตน",
    role: "ผู้บริโภคพืช (Primary Consumer)",
    trophicLevel: "Trophic 2",
    populationBefore: 4500,
    populationAfter: 4300,
    biomassKg: 1000,
    energyKcal: 10000,
  },
  {
    name: "หนูนา",
    role: "ผู้บริโภคพืช (Primary Consumer)",
    trophicLevel: "Trophic 2",
    populationBefore: 300,
    populationAfter: 1250,
    biomassKg: 300,
    energyKcal: 10000,
  },
  {
    name: "กบ",
    role: "ผู้บริโภคสัตว์ (Secondary Consumer)",
    trophicLevel: "Trophic 3",
    populationBefore: 250,
    populationAfter: 240,
    biomassKg: 100,
    energyKcal: 1000,
  },
  {
    name: "งู (ประชากรที่ถูกรบกวน)",
    role: "ผู้บริโภคอันดับสูงสุด (Top Predator)",
    trophicLevel: "Trophic 3 & 4",
    populationBefore: 80,
    populationAfter: 5,
    biomassKg: 20,
    energyKcal: 100,
  },
];

export function Phase3Investigation({ onNext, onBack }: Phase3Props) {
  const [selectedOrganism, setSelectedOrganism] = useState<OrganismData | null>(ECOSYSTEM_DATA[2]); // Mouse by default

  return (
    <div className="phase-container">
      <div className="phase-header-banner">
        <span className="phase-pill">PHASE 3 / 7 · INVESTIGATION</span>
        <h2>📊 การสืบเสาะและรวบรวมหลักฐาน</h2>
        <p className="phase-lead">
          สำรวจตารางข้อมูลเชิงประจักษ์ (Empirical Evidence) ของประชากร พลังงาน และมวลชีวภาพ เพื่อนำไปใช้เป็นหลักฐานใน CER
        </p>
      </div>

      <div className="card content-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">EMPIRICAL DATASET</p>
            <h3>ตารางการเปลี่ยนแปลงประชากรและพีระมิดพลังงาน</h3>
          </div>
          <span className="unit-badge">สืบเสาะข้อมูล</span>
        </div>

        <div className="table-responsive">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>สิ่งมีชีวิต</th>
                <th>บทบาทในระบบนิเวศ</th>
                <th>Trophic Level</th>
                <th>ก่อนงูลดลง (ตัว)</th>
                <th>หลังงูลดลง (ตัว)</th>
                <th>การเปลี่ยนแปลง</th>
                <th>พลังงานที่ได้รับ (kcal)</th>
              </tr>
            </thead>
            <tbody>
              {ECOSYSTEM_DATA.map((org) => {
                const diff = org.populationAfter - org.populationBefore;
                const isPositive = diff > 0;
                const isSelected = selectedOrganism?.name === org.name;

                return (
                  <tr
                    key={org.name}
                    className={`table-row-clickable ${isSelected ? "row-selected" : ""}`}
                    onClick={() => setSelectedOrganism(org)}
                  >
                    <td><strong>{org.name}</strong></td>
                    <td><span className="role-tag">{org.role}</span></td>
                    <td>{org.trophicLevel}</td>
                    <td>{org.populationBefore.toLocaleString()}</td>
                    <td>{org.populationAfter.toLocaleString()}</td>
                    <td>
                      <span className={`diff-tag ${diff < 0 ? "diff-down" : diff > 0 ? "diff-up" : "diff-same"}`}>
                        {isPositive ? `+${diff.toLocaleString()} (+${Math.round((diff / org.populationBefore) * 100)}%)` : `${diff.toLocaleString()} (${Math.round((diff / org.populationBefore) * 100)}%)`}
                      </span>
                    </td>
                    <td>{org.energyKcal.toLocaleString()} kcal</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedOrganism && (
          <div className="organism-insight-card">
            <h4>💡 ข้อมูลวิเคราะห์เชิงลึก: {selectedOrganism.name}</h4>
            <div className="insight-stat-grid">
              <div>
                <span>การเปลี่ยนแปลงประชากร:</span>
                <strong>{selectedOrganism.populationBefore} ➔ {selectedOrganism.populationAfter} ตัว</strong>
              </div>
              <div>
                <span>พลังงานตามกฎ 10% (10% Rule):</span>
                <strong>{selectedOrganism.energyKcal.toLocaleString()} kcal (สูญเสียเป็นความร้อน 90%)</strong>
              </div>
              <div>
                <span>มวลชีวภาพ (Biomass):</span>
                <strong>{selectedOrganism.biomassKg} กก.</strong>
              </div>
            </div>
            <p className="note-text">
              📌 <em>ข้อสังเกตสำหรับ Evidence:</em> เมื่อผู้ล่า (งู) หายไป ประชากรหนูเพิ่มขึ้นกว่า 300% ทำให้พืชผู้ผลิตถูกกินจนลดลงกว่า 56% ซึ่งส่งผลกระทบลูกโซ่ (Trophic Cascade) ต่อยอดรวมของพลังงานในระบบ
            </p>
          </div>
        )}

        <div className="rule-10-box">
          <div className="rule-badge">⚡ กฎการถ่ายทอดพลังงาน 10% (10% Energy Transfer Law)</div>
          <p>
            พลังงานเคมีที่ถ่ายทอดจากผู้ผลิตไปยังผู้บริโภคแต่ละลำดับขั้นจะส่งผ่านได้เพียงประมาณ <strong>10%</strong> เท่านั้น ส่วนอีก <strong>90%</strong> จะถูกใช้ไปในกระบวนการดำรงชีวิตและการหายใจระดับเซลล์ และสูญเสียออกจากระบบในรูปของพลังงานความร้อน
          </p>
        </div>

        <div className="action-row space-between">
          <button type="button" className="secondary-button" onClick={onBack}>
            ← กลับไปดูตัวแปร (Phase 2)
          </button>
          <button type="button" className="primary-button next-phase-btn" onClick={onNext}>
            มีหลักฐานครบแล้ว ➔ ไปสร้างข้อโต้แย้ง CER (Phase 4)
          </button>
        </div>
      </div>
    </div>
  );
}
