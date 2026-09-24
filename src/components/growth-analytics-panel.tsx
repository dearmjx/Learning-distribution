"use client";

import { useEffect, useState } from "react";
import type { ResearchParticipantRecord } from "@/lib/research/export";
import { buildGrowthSummary, type GrowthSummary, type MeanStat } from "@/lib/research/growth";

function show(stat: MeanStat, suffix = ""): string {
  return stat.mean === null ? "—" : `${stat.mean}${suffix} (n=${stat.n})`;
}

function showRate(stat: MeanStat): string {
  return stat.mean === null ? "—" : `${Math.round(stat.mean * 100)}% (n=${stat.n})`;
}

/** Descriptive Cycle 1 → Cycle 2 and Draft 1 → Final growth (LOS-012). */
export function GrowthAnalyticsPanel() {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/research/export?format=json&mode=wide")
      .then((response) => response.json())
      .then((payload: { records?: ResearchParticipantRecord[]; error?: string }) => {
        if (payload.error || !payload.records) throw new Error(payload.error ?? "โหลดข้อมูลการเติบโตไม่สำเร็จ");
        setSummary(buildGrowthSummary(payload.records));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดข้อมูลการเติบโตไม่สำเร็จ"));
  }, []);

  const rows: Array<[string, (cycle: GrowthSummary["cycles"][number]) => string]> = [
    ["ผู้เข้าร่วม / ตรวจแล้ว", (c) => `${c.participants} / ${c.reviewed}`],
    ["1. เลือกสรรข้อมูล (1–4)", (c) => show(c.syntheticDims.selectingInfo)],
    ["2. เชื่อมโยงข้อมูล (1–4)", (c) => show(c.syntheticDims.connectingInfo)],
    ["3. ภาษาของตนเอง (1–4)", (c) => show(c.syntheticDims.reconstructingLanguage)],
    ["4. ตอบตรงประเด็น (1–4)", (c) => show(c.syntheticDims.directAnswering)],
    ["คะแนนคิดสังเคราะห์รวม (%)", (c) => show(c.syntheticTotal)],
    ["ความยาว Draft 1 → Final (ตัวอักษร)", (c) => show(c.draftLengthChange)],
    ["สัดส่วนปฏิเสธ/ปรับคำแนะนำ AI", (c) => showRate(c.criticalDecisionRate)],
  ];

  return (
    <section className="card analytics-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">PRE / POST GROWTH · DESCRIPTIVE</p>
          <h2>การเติบโตของการคิดสังเคราะห์ (Cycle 1 → Cycle 2)</h2>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!summary && !error && <p className="muted-text">กำลังคำนวณ...</p>}

      {summary && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ตัวชี้วัด</th>
                  <th>Cycle 1</th>
                  <th>Cycle 2</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {summary.cycles.map((cycle) => (
                      <td key={cycle.cycle}>{value(cycle)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: "12px" }}>
            <strong>นักเรียนที่มีคะแนนทั้ง 2 วงรอบ (paired):</strong>{" "}
            {summary.paired.pairedN === 0
              ? "ยังไม่มี"
              : `n=${summary.paired.pairedN} · เฉลี่ย ${summary.paired.meanCycle1} → ${summary.paired.meanCycle2} (ผลต่าง ${summary.paired.meanDifference}) · ดีขึ้น ${summary.paired.improved} · เท่าเดิม ${summary.paired.unchanged} · ลดลง ${summary.paired.declined}`}
          </p>
          {summary.unassignedCycleRecords > 0 && (
            <p className="small-note" style={{ color: "#b45309" }}>
              ⚠️ มี {summary.unassignedCycleRecords} รายการที่ยังไม่ระบุ Cycle จึงไม่ถูกนับในตารางนี้
            </p>
          )}
          <p className="small-note">
            ค่าที่หายไปจะไม่ถูกเติมแทน (n แสดงจำนวนข้อมูลจริง) · ใช้สถิติอนุมาน เช่น paired t-test จากไฟล์ CSV ใน SPSS/R
          </p>
        </>
      )}
    </section>
  );
}
