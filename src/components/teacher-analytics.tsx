"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

export function TeacherAnalytics() {
  const [data, setData] = useState<TeacherReviewSnapshot | null>(null);
  const [error, setError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [downloading, setDownloading] = useState<"json" | "csv" | "">("");

  useEffect(() => {
    void fetch("/api/teacher/reviews")
      .then((response) => response.json())
      .then((payload: TeacherReviewSnapshot & { error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setData(payload);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลด analytics ไม่สำเร็จ"));
  }, []);

  async function handleDownload(format: "json" | "csv") {
    setDownloading(format);
    try {
      const url = `/api/research/export?format=${format}${activityFilter !== "all" ? `&activityId=${activityFilter}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `learning-evidence-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("ดาวน์โหลดไฟล์ Export ไม่สำเร็จ");
    } finally {
      setDownloading("");
    }
  }

  const events = data?.events ?? [];
  const filteredEvents = events.filter((e) => activityFilter === "all" || e.activityId === activityFilter);

  const eventCounts = filteredEvents.reduce<Record<string, number>>((acc, evt) => {
    acc[evt.eventType] = (acc[evt.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const totalEvents = filteredEvents.length;

  return (
    <main className="simple-page teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LEARNING OS / RESEARCH & EVIDENCE ANALYTICS</p>
          <h1>Evidence Analytics & Research Export</h1>
          <p className="lede">
            สรุปข้อมูลกระบวนการเรียนรู้ (Process Evidence) สำหรับการวิจัยและการติดตามในห้องเรียนตามมาตรฐานความปลอดภัยข้อมูล
          </p>
        </div>
        <div className="page-links">
          <Link className="pill-link" href="/teacher/roster">
            👥 Class Roster
          </Link>
          <Link className="pill-link" href="/teacher/review">
            ✍️ ตรวจงาน Submissions →
          </Link>
          <Link className="pill-link active-link" href="/teacher/analytics">
            📊 Evidence Analytics
          </Link>
          <a className="pill-link" href="/api/research/export">
            📥 Direct JSON Export
          </a>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {!data && !error && <p className="muted-text">กำลังโหลด analytics…</p>}

      {data && (
        <>
          <section className="teacher-metric-grid">
            <div className="metric-card">
              <span>Socratic Feedbacks</span>
              <strong>{data.analytics.feedbackCount}</strong>
            </div>
            <div className="metric-card">
              <span>Hint Requests</span>
              <strong>{data.analytics.hintCount}</strong>
            </div>
            <div className="metric-card">
              <span>Teacher Reviews</span>
              <strong>{data.analytics.teacherReviewCount}</strong>
            </div>
            <div className="metric-card">
              <span>Provider Fallbacks</span>
              <strong>{data.analytics.fallbackCount}</strong>
            </div>
          </section>

          {/* Export & Activity Selector Section */}
          <section className="card export-control-card">
            <div className="export-header-row">
              <div>
                <span className="unit-badge">RESEARCH DATASET</span>
                <h2>Export De-identified Learning Evidence</h2>
                <p className="muted-text">
                  ชุดข้อมูลถูกแปลงเป็นรหัสนิรนาม (De-identified) แยกตารางความยินยอมและตัวตนจริงตามหลัก PDPA / IRB
                </p>
              </div>
              <div className="export-actions-group">
                <select
                  className="activity-dropdown"
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                >
                  <option value="all">ทุกกิจกรรม (All Activities)</option>
                  <option value="ecosystem-food-web-01">🌿 กิจกรรม 1: สายใยอาหาร</option>
                  <option value="ecosystem-energy-flow-01">⚡ กิจกรรม 2: การถ่ายทอดพลังงาน</option>
                </select>

                <div className="export-btn-pair">
                  <button
                    type="button"
                    className="primary-button compact-button"
                    onClick={() => void handleDownload("json")}
                    disabled={downloading !== ""}
                  >
                    {downloading === "json" ? "กำลังสร้าง..." : "📄 Export JSON"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => void handleDownload("csv")}
                    disabled={downloading !== ""}
                  >
                    {downloading === "csv" ? "กำลังสร้าง..." : "📊 Export CSV"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Event Catalog Breakdown */}
          <section className="card analytics-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">TRACEABLE EVENT LOGS</p>
                <h2>แคตตาล็อกเหตุการณ์การเรียนรู้ในห้องเรียน ({totalEvents} รายการ)</h2>
              </div>
            </div>

            {totalEvents === 0 ? (
              <p className="muted-text">ยังไม่มีข้อมูล Event สำหรับกิจกรรมที่เลือก</p>
            ) : (
              <div className="event-breakdown-grid">
                {Object.entries(eventCounts).map(([type, count]) => {
                  const percentage = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
                  return (
                    <div className="event-metric-tile" key={type}>
                      <div className="event-tile-header">
                        <span className="event-type-name">{type}</span>
                        <strong className="event-count">{count} ครั้ง ({percentage}%)</strong>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="research-notice-box">
              <strong>🔒 ข้อกำหนดความปลอดภัยและการวิจัย:</strong>
              <p className="small-note">
                1. รหัสนักเรียนจริงจะไม่ปรากฏในชุดข้อมูล Evidence สำหรับการวิจัย<br />
                2. Authorship Indicator เป็นเพียงสัญญาณสนับสนุนครู ไม่ถูกใช้ตัดสินการทุจริตอัตโนมัติ<br />
                3. Hint Cost เป็นตัวชี้วัดกระบวนการ (Process Metric) เพื่อวิเคราะห์ความช่วยเหลือของ AI Coach
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
