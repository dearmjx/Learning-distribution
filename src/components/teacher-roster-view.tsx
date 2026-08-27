"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClassRosterSummary, RosterStudentProgress } from "@/lib/domain/types";

export function TeacherRosterView() {
  const [summary, setSummary] = useState<ClassRosterSummary | null>(null);
  const [activityId, setActivityId] = useState("ecosystem-food-web-01");
  const [filter, setFilter] = useState<"all" | "inquiry" | "revision" | "needs_review" | "completed">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRoster(selectedActivity: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/teacher/roster?activityId=${encodeURIComponent(selectedActivity)}`);
      const payload = (await response.json()) as ClassRosterSummary & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "โหลดข้อมูลห้องเรียนไม่สำเร็จ");
      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลห้องเรียนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoster(activityId);
  }, [activityId]);

  const students = summary?.students ?? [];

  const filteredStudents = students.filter((student) => {
    if (filter === "all") return true;
    if (filter === "inquiry") return student.currentPhase === "orientation" || student.currentPhase === "investigation" || student.currentPhase === "argument";
    if (filter === "revision") return student.currentPhase === "peer_review" || student.currentPhase === "revision";
    if (filter === "needs_review") return student.workflowState === "submitted" || (!student.teacherScore && student.submissionCount > 0);
    if (filter === "completed") return Boolean(student.teacherScore);
    return true;
  });

  const completedCount = students.filter((s) => Boolean(s.teacherScore)).length;
  const needsReviewCount = students.filter((s) => !s.teacherScore && s.submissionCount > 0).length;
  const inProgressCount = students.filter((s) => !s.teacherScore && s.submissionCount === 0).length;

  return (
    <main className="simple-page teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LEARNING OS / TEACHER PILOT HUB</p>
          <h1>Class Roster & Activity Progress</h1>
          <p className="lede">
            ติดตามสถานะและกระบวนการเรียนรู้ (7-Phase ADI) ของนักเรียนในห้องเรียน พร้อมจัดการกิจกรรม
          </p>
        </div>
        <div className="page-links">
          <Link className="pill-link active-link" href="/teacher/roster">
            👥 Class Roster
          </Link>
          <Link className="pill-link" href="/teacher/review">
            ✍️ ตรวจงาน Submissions →
          </Link>
          <Link className="pill-link" href="/teacher/analytics">
            📊 Evidence Analytics →
          </Link>
          <a className="pill-link" href="/api/research/export">
            📥 Research Export
          </a>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <>
          <section className="class-info-card card">
            <div className="class-info-header">
              <div>
                <span className="unit-badge">{summary.classId}</span>
                <h2>{summary.className}</h2>
                <p className="muted-text">{summary.courseTitle}</p>
              </div>
              <div className="activity-picker">
                <label htmlFor="activity-select" className="eyebrow">
                  เลือกกิจกรรมการเรียนรู้:
                </label>
                <select
                  id="activity-select"
                  className="activity-dropdown"
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                >
                  <option value="ecosystem-food-web-01">
                    🌿 กิจกรรมที่ 1: สายใยอาหารและการถ่ายทอดพลังงาน (Food Web)
                  </option>
                  <option value="ecosystem-energy-flow-01">
                    ⚡ กิจกรรมที่ 2: กฎ 10% และการถ่ายทอดพลังงานในระบบนิเวศ
                  </option>
                </select>
              </div>
            </div>

            <div className="teacher-metric-grid roster-metric-grid">
              <div className="metric-card">
                <span>นักเรียนทั้งหมด</span>
                <strong>{summary.totalStudents} คน</strong>
              </div>
              <div className="metric-card">
                <span>กำลังสืบเสาะ / ร่างงาน</span>
                <strong>{inProgressCount} คน</strong>
              </div>
              <div className="metric-card">
                <span>ส่งแล้ว / รอตรวจ</span>
                <strong style={{ color: "#cf5636" }}>{needsReviewCount} ชิ้น</strong>
              </div>
              <div className="metric-card">
                <span>ตรวจเสร็จสิ้นแล้ว</span>
                <strong style={{ color: "#208769" }}>{completedCount} ชิ้น</strong>
              </div>
            </div>
          </section>

          <section className="roster-table-section card">
            <div className="roster-table-toolbar">
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  ทั้งหมด ({students.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "needs_review" ? "active" : ""}`}
                  onClick={() => setFilter("needs_review")}
                >
                  📌 รอตรวจ ({needsReviewCount})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "revision" ? "active" : ""}`}
                  onClick={() => setFilter("revision")}
                >
                  🔄 กำลังปรับปรุง ({students.filter((s) => s.currentPhase === "revision" || s.currentPhase === "peer_review").length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "inquiry" ? "active" : ""}`}
                  onClick={() => setFilter("inquiry")}
                >
                  🔍 กำลังสืบเสาะ ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "completed" ? "active" : ""}`}
                  onClick={() => setFilter("completed")}
                >
                  ✅ ตรวจแล้ว ({completedCount})
                </button>
              </div>
            </div>

            {loading && <p className="muted-text" style={{ padding: "20px" }}>กำลังอัปเดตข้อมูลห้องเรียน…</p>}

            {!loading && filteredStudents.length === 0 && (
              <div className="empty-roster-state">
                <p className="muted-text">ไม่พบนักเรียนในหมวดหมู่นี้</p>
              </div>
            )}

            {!loading && filteredStudents.length > 0 && (
              <div className="table-responsive">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>นักเรียน</th>
                      <th>สถานะ ADI ขั้นปัจจุบัน</th>
                      <th>ความคืบหน้า (Sub / Rev)</th>
                      <th>คำใบ้ AI</th>
                      <th>ประเมินเพื่อน (Peer)</th>
                      <th>คะแนนครู</th>
                      <th>ใช้งานล่าสุด</th>
                      <th>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.studentId}>
                        <td>
                          <strong>{student.studentName}</strong>
                          <span className="sub-detail">{student.studentId}</span>
                        </td>
                        <td>
                          <span className={`status-badge phase-${student.currentPhase}`}>
                            {student.currentPhase === "orientation" && "1. ปฐมนิเทศ"}
                            {student.currentPhase === "identification" && "2. สำรวจตัวแปร"}
                            {student.currentPhase === "investigation" && "3. สืบเสาะข้อมูล"}
                            {student.currentPhase === "argument" && "4. สร้างข้อโต้แย้ง (CER)"}
                            {student.currentPhase === "peer_review" && "5. ประเมินเพื่อน"}
                            {student.currentPhase === "revision" && "6. ปรับปรุงข้อโต้แย้ง"}
                            {student.currentPhase === "reflection" && "7. สะท้อนการเรียนรู้"}
                          </span>
                        </td>
                        <td>
                          <span>{student.submissionCount} ส่ง / {student.revisionCount} ฉบับแก้</span>
                        </td>
                        <td>
                          <span className="hint-pill">💡 {student.hintCount} ครั้ง</span>
                        </td>
                        <td>
                          {student.peerReviewCompleted ? (
                            <span className="peer-done">✓ เสร็จแล้ว</span>
                          ) : (
                            <span className="peer-pending">—</span>
                          )}
                        </td>
                        <td>
                          {student.teacherScore !== undefined ? (
                            <strong className="score-tag">{student.teacherScore} / 100</strong>
                          ) : (
                            <span className="score-pending">ยังไม่ตรวจ</span>
                          )}
                        </td>
                        <td className="time-col">
                          {new Date(student.lastActiveAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <Link
                            className="action-btn"
                            href={`/teacher/review?studentId=${encodeURIComponent(student.studentId)}`}
                          >
                            ดูหลักฐาน & ตรวจ →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
