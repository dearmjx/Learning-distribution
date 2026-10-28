"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";
import type { TeacherObservationNote } from "@/lib/domain/types";

interface SyntheticRubricDraft {
  selectingInfo: number; // 1-4
  connectingInfo: number; // 1-4
  reconstructingLanguage: number; // 1-4
  directAnswering: number; // 1-4
  // D-012: CER is a separate instrument, scored independently.
  claim: number; // 1-4
  evidence: number; // 1-4
  reasoning: number; // 1-4
  score: number; // 0-100
  comment: string;
}

export function TeacherReviewDashboard() {
  const [data, setData] = useState<TeacherReviewSnapshot | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SyntheticRubricDraft>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");
  const [cycleFilter, setCycleFilter] = useState<"all" | "1" | "2" | "unassigned">("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});

  // Teacher Observation State (PAOR Cycles)
  const [observations, setObservations] = useState<TeacherObservationNote[]>([]);
  const [obsCycle, setObsCycle] = useState<1 | 2>(1);
  const [obsPhase, setObsPhase] = useState<"plan" | "act" | "observe" | "reflect">("observe");
  const [obsContent, setObsContent] = useState("");
  const [obsActivityId, setObsActivityId] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [showObsPanel, setShowObsPanel] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [reviewRes, obsRes] = await Promise.all([
        fetch("/api/teacher/reviews"),
        fetch("/api/teacher/observations"),
      ]);
      const payload = (await reviewRes.json()) as TeacherReviewSnapshot & { error?: string };
      if (!reviewRes.ok || payload.error) throw new Error(payload.error ?? "โหลดข้อมูลครูไม่สำเร็จ");
      setData(payload);

      if (obsRes.ok) {
        const obsData = await obsRes.json();
        setObservations(obsData.notes ?? []);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "โหลดข้อมูลครูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function getDraft(submissionId: string): SyntheticRubricDraft {
    if (drafts[submissionId]) return drafts[submissionId];
    return {
      selectingInfo: 3,
      connectingInfo: 3,
      reconstructingLanguage: 3,
      directAnswering: 3,
      claim: 3,
      evidence: 3,
      reasoning: 3,
      score: 75,
      comment: "",
    };
  }

  function updateRubricDimension(
    submissionId: string,
    dimension: "selectingInfo" | "connectingInfo" | "reconstructingLanguage" | "directAnswering" | "claim" | "evidence" | "reasoning",
    val: number,
  ) {
    const current = getDraft(submissionId);
    const updated = { ...current, [dimension]: val };
    // The 0-100 score reflects the synthetic-thinking instrument only.
    const totalPoints = (updated.selectingInfo + updated.connectingInfo + updated.reconstructingLanguage + updated.directAnswering) / 16;
    updated.score = Math.round(totalPoints * 100);
    setDrafts({ ...drafts, [submissionId]: updated });
  }

  function toggleExpand(submissionId: string) {
    setExpandedSubmissions((prev) => ({ ...prev, [submissionId]: !prev[submissionId] }));
  }

  async function saveReview(submissionId: string) {
    const draft = getDraft(submissionId);
    setSaving(submissionId);
    setError("");
    try {
      const response = await fetch("/api/teacher/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          score: Number(draft.score),
          comment: draft.comment,
          rubricScores: {
            claim: draft.claim,
            evidence: draft.evidence,
            reasoning: draft.reasoning,
          },
          syntheticScores: {
            selectingInfo: draft.selectingInfo,
            connectingInfo: draft.connectingInfo,
            reconstructingLanguage: draft.reconstructingLanguage,
            directAnswering: draft.directAnswering,
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "บันทึก review ไม่สำเร็จ");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึก review ไม่สำเร็จ");
    } finally {
      setSaving("");
    }
  }

  async function handleAddObservation() {
    if (!obsContent.trim() || !(obsActivityId || cycleActivities[0]?.id)) return;
    setSavingObs(true);
    try {
      const res = await fetch("/api/teacher/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle: obsCycle,
          activityId: obsActivityId || cycleActivities[0]?.id,
          phase: obsPhase,
          content: obsContent,
        }),
      });
      if (!res.ok) throw new Error("บันทึก Observation ไม่สำเร็จ");
      setObsContent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึก Observation ไม่สำเร็จ");
    } finally {
      setSavingObs(false);
    }
  }

  const submissions = data?.submissions ?? [];
  const reviews = data?.reviews ?? [];
  const activities = data?.activities ?? [];
  const cycleActivities = activities.filter((activity) => activity.cycle === obsCycle);

  function cycleOf(sub: { activityId: string; cycle?: 1 | 2 }): 1 | 2 | undefined {
    return sub.cycle ?? activities.find((activity) => activity.id === sub.activityId)?.cycle;
  }

  const filteredSubmissions = submissions.filter((sub) => {
    const review = reviews.find((r) => r.submissionId === sub.id);
    if (filter === "pending" && review) return false;
    if (filter === "reviewed" && !review) return false;
    if (cycleFilter !== "all") {
      const subCycle = cycleOf(sub);
      if ((subCycle === undefined ? "unassigned" : String(subCycle)) !== cycleFilter) return false;
    }
    if (activityFilter !== "all" && sub.activityId !== activityFilter) return false;
    if (studentSearch.trim() && !sub.studentId.toLowerCase().includes(studentSearch.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => !reviews.some((r) => r.submissionId === s.id)).length;
  const reviewedCount = submissions.filter((s) => reviews.some((r) => r.submissionId === s.id)).length;
  const averageScore = reviews.length > 0 ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length) : 0;

  return (
    <main className="simple-page teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LEARNING OS · CAR RESEARCH DASHBOARD (PAOR CYCLES)</p>
          <h1>Teacher Review & Synthetic Thinking Rubrics</h1>
          <p className="lede">
            ประเมินทักษะการคิดสังเคราะห์ 4 มิติ (16 คะแนน), ตรวจสอบ Side-by-Side Diff (Draft 1 Baseline vs AI Chat vs Final Draft), และบันทึก PAOR Observation
          </p>
        </div>
        <div className="page-links">
          <Link className="pill-link" href="/teacher/roster">
            👥 Roster
          </Link>
          <Link className="pill-link active-link" href="/teacher/review">
            ✍️ ตรวจ Submissions
          </Link>
          <Link className="pill-link" href="/teacher/analytics">
            📊 Evidence Analytics
          </Link>
          <a
            className="pill-link"
            style={{ background: "#059669", color: "#fff", borderColor: "#047857" }}
            href="/api/research/export?format=csv&mode=wide"
            download="research-wide-dataset-spss-r.csv"
          >
            📥 Export SPSS/R Dataset (CSV)
          </a>
          {/* Signs this device out of teacher tools; matters on a shared classroom iPad. */}
          <a className="pill-link" href="/api/teacher/lock">
            🔒 ล็อกแดชบอร์ด
          </a>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* PAOR Observation & Reflection Collapsible Panel */}
      <section style={{ marginBottom: "24px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", color: "#475569", fontWeight: 700 }}>
              CAR ACTION RESEARCH LOG
            </span>
            <h3 style={{ margin: "2px 0 0 0", color: "#1e293b" }}>📝 บันทึกการสังเกตและสะท้อนคิดของครู (PAOR Cycle Logs)</h3>
          </div>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => setShowObsPanel(!showObsPanel)}
          >
            {showObsPanel ? "▲ ย่อแบบฟอร์ม" : `▼ ขยายบันทึก (${observations.length} บันทึก)`}
          </button>
        </div>

        {showObsPanel && (
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", color: "#334155" }}>วงรอบ (PAOR Cycle):</label>
                <select
                  className="form-select"
                  value={obsCycle}
                  onChange={(e) => {
                    setObsCycle(Number(e.target.value) as 1 | 2);
                    setObsActivityId("");
                  }}
                  style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                >
                  <option value={1}>Cycle 1 (สายใยอาหาร)</option>
                  <option value={2}>Cycle 2 (การไหลของพลังงาน)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", color: "#334155" }}>กิจกรรม:</label>
                <select
                  className="form-select"
                  value={obsActivityId || cycleActivities[0]?.id || ""}
                  onChange={(e) => setObsActivityId(e.target.value)}
                  style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                >
                  {cycleActivities.length === 0 && <option value="">ไม่มีกิจกรรมใน Cycle นี้</option>}
                  {cycleActivities.map((activity) => (
                    <option key={activity.id} value={activity.id}>{activity.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", color: "#334155" }}>ขั้นตอนวิจัย (Phase):</label>
                <select
                  className="form-select"
                  value={obsPhase}
                  onChange={(e) => setObsPhase(e.target.value as "plan" | "act" | "observe" | "reflect")}
                  style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                >
                  <option value="plan">Plan (วางแผนการจัดกิจกรรม)</option>
                  <option value="act">Act (ปฏิบัติการสืบเสาะ)</option>
                  <option value="observe">Observe (สังเกตพฤติกรรม & การคิดสังเคราะห์)</option>
                  <option value="reflect">Reflect (สะท้อนผลและวางแผนปรับปรุง)</option>
                </select>
              </div>
            </div>

            <textarea
              className="teacher-comment-textarea"
              rows={3}
              placeholder="บันทึกข้อสังเกต เช่น นักเรียนเริ่มมีการถาม-ตอบกับ AI Coach มากขึ้น และสามารถนำตัวเลขตารางใน Phase 3 มาสนับสนุนเหตุผลใน Draft 2 ได้ชัดเจน..."
              value={obsContent}
              onChange={(e) => setObsContent(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => void handleAddObservation()}
                disabled={savingObs || !obsContent.trim() || cycleActivities.length === 0}
              >
                {savingObs ? "กำลังบันทึก..." : "💾 บันทึก Note การสังเกต"}
              </button>
            </div>

            {observations.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <h4 style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "8px" }}>บันทึกล่าสุด:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {observations.slice(-3).map((obs) => (
                    <div key={obs.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: "4px", fontSize: "0.75rem" }}>
                        <span><strong>Cycle {obs.cycle} · {obs.phase.toUpperCase()}</strong></span>
                        <span>{new Date(obs.createdAt).toLocaleString("th-TH")}</span>
                      </div>
                      <p style={{ margin: 0, color: "#1e293b" }}>{obs.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {data && (
        <>
          <section className="teacher-metric-grid">
            <div className="metric-card">
              <span>Submissions ทั้งหมด</span>
              <strong>{data.analytics.submissionCount}</strong>
            </div>
            <div className="metric-card">
              <span>รอการตรวจ (Pending)</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="metric-card">
              <span>ตรวจแล้ว (Reviewed)</span>
              <strong>{reviewedCount}</strong>
            </div>
            <div className="metric-card">
              <span>คะแนนเฉลี่ย</span>
              <strong>{reviews.length > 0 ? `${averageScore} / 100` : "—"}</strong>
            </div>
          </section>

          {/* Filter Bar */}
          <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                ทั้งหมด ({submissions.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${filter === "pending" ? "active" : ""}`}
                onClick={() => setFilter("pending")}
              >
                รอตรวจ ({pendingCount})
              </button>
              <button
                type="button"
                className={`filter-pill ${filter === "reviewed" ? "active" : ""}`}
                onClick={() => setFilter("reviewed")}
              >
                ตรวจแล้ว ({reviewedCount})
              </button>
            </div>

            {/* PAOR Cycle Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label htmlFor="cycle-filter" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>วงรอบ PAOR:</label>
              <select
                id="cycle-filter"
                className="form-select"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value as "all" | "1" | "2" | "unassigned")}
                style={{ padding: "4px 10px", fontSize: "0.85rem" }}
              >
                <option value="all">ทุก Cycle (1 & 2)</option>
                <option value="1">PAOR Cycle 1 (สายใยอาหาร)</option>
                <option value="2">PAOR Cycle 2 (การไหลของพลังงาน)</option>
                <option value="unassigned">ยังไม่ระบุ Cycle</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label htmlFor="student-search" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>ค้นหา:</label>
              <input
                id="student-search"
                type="text"
                className="form-input"
                placeholder="รหัสนักเรียน เช่น 40101"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ padding: "4px 10px", fontSize: "0.85rem", width: "160px" }}
              />
            </div>
          </div>

          <div className="teacher-submission-list">
            {filteredSubmissions.length === 0 && (
              <section className="card empty-state">
                <p className="muted-text">ไม่พบรายการ Submission ตามเงื่อนไขที่เลือก</p>
              </section>
            )}

            {filteredSubmissions.slice().reverse().map((submission) => {
              const draft = getDraft(submission.id);
              const review = reviews.find((item) => item.submissionId === submission.id);
              const authorship = data.authorshipBySubmission[submission.id];
              const revisions = data.revisions.filter((item) => item.studentId === submission.studentId && item.activityId === submission.activityId);
              const interactions = data.interactions.filter((item) => item.activityId === submission.activityId && item.studentId === submission.studentId);
              const peerReviews = data.peerReviews.filter((item) => item.submissionId === submission.id || item.authorStudentId === submission.studentId);
              const isExpanded = expandedSubmissions[submission.id] ?? false;

              // Find Draft 1 baseline and Final Draft
              const draft1Revision = revisions.find((r) => r.version === 1);
              const draft1Content = draft1Revision?.content ?? submission.content;
              const feedbackDecisions = submission.feedbackDecisions ?? [];

              return (
                <section className="card teacher-submission" key={submission.id} style={{ marginBottom: "24px" }}>
                  <div className="card-heading">
                    <div>
                      <div className="submission-meta-tags">
                        <span className="unit-badge">Student: {submission.studentId}</span>
                        <span className="anon-badge">PAOR {cycleOf(submission) ? `Cycle ${cycleOf(submission)}` : "ยังไม่ระบุ Cycle"}</span>
                        <span className="phase-label">v{submission.version} · {submission.workflowState}</span>
                        {submission.draft1Frozen && (
                          <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>
                            🔒 Draft 1 Frozen
                          </span>
                        )}
                      </div>
                      <h2>{submission.activityId}</h2>
                      <small className="muted-text">
                        ส่งเมื่อ: {new Date(submission.submittedAt).toLocaleString("th-TH")} · เวลาตอบ {submission.responseTimeSeconds} วิ
                      </small>
                    </div>

                    {review ? (
                      <div className="reviewed-badge-container">
                        <span className="badge-reviewed">✓ ตรวจแล้ว</span>
                        <strong className="reviewed-score-large">{review.score} / 100</strong>
                      </div>
                    ) : (
                      <span className="badge-pending-review">รอครูประเมิน</span>
                    )}
                  </div>

                  {/* Side-by-Side 3-Column Diff Viewer */}
                  <div className="diff-viewer-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "14px",
                    marginTop: "16px",
                    marginBottom: "16px",
                  }}>
                    {/* Column 1: Draft 1 Baseline (Frozen) */}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                        <strong style={{ color: "#334155", fontSize: "0.9rem" }}>🔒 1. Draft 1 (Frozen Baseline)</strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>ก่อนรับคำแนะนำ AI</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#1e40af", display: "block" }}>Claim (v1):</span>
                          <p style={{ margin: "2px 0", color: "#334155" }}>{draft1Content.claim || "—"}</p>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#047857", display: "block" }}>Evidence (v1):</span>
                          <p style={{ margin: "2px 0", color: "#334155" }}>{draft1Content.evidence || "—"}</p>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#b45309", display: "block" }}>Reasoning (v1):</span>
                          <p style={{ margin: "2px 0", color: "#334155" }}>{draft1Content.reasoning || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: AI Socratic Chat & Critical Decisions */}
                    <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #ccfbf1", paddingBottom: "6px" }}>
                        <strong style={{ color: "#0f766e", fontSize: "0.9rem" }}>💬 2. AI Socratic & Decisions</strong>
                        <span style={{ fontSize: "0.75rem", color: "#0d9488" }}>{interactions.length} Interactions</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {interactions.length > 0 ? (
                          interactions.slice(-2).map((inter, i) => (
                            <div key={inter.id || i} style={{ background: "#fff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccfbf1" }}>
                              <span style={{ fontSize: "0.75rem", color: "#0f766e", fontWeight: 600 }}>
                                AI ถาม ({inter.response?.targetDimension ?? "socratic"}):
                              </span>
                              <p style={{ margin: "2px 0", fontSize: "0.8rem", color: "#134e4a" }}>{inter.response?.message ?? "—"}</p>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: "#64748b", margin: "4px 0" }}>ไม่มีประวัติการแชท</p>
                        )}

                        {feedbackDecisions.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <span style={{ fontWeight: 600, color: "#0f766e", display: "block", fontSize: "0.8rem" }}>การตัดสินใจของผู้เรียน (AI Literacy):</span>
                            {feedbackDecisions.map((dec, di) => (
                              <div key={dec.id || di} style={{ fontSize: "0.75rem", marginTop: "4px", background: "#fff", padding: "4px 6px", borderRadius: "4px" }}>
                                <span style={{ fontWeight: 600, color: dec.status === "accept" ? "#059669" : dec.status === "reject" ? "#dc2626" : "#d97706" }}>
                                  [{dec.status.toUpperCase()}]
                                </span>{" "}
                                {dec.justificationText}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Final Draft (Version 2) */}
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #dbeafe", paddingBottom: "6px" }}>
                        <strong style={{ color: "#1e40af", fontSize: "0.9rem" }}>✨ 3. Final Draft (Version {submission.version})</strong>
                        <span style={{ fontSize: "0.75rem", color: "#2563eb" }}>ฉบับสมบูรณ์ที่ตรวจ</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#1e40af", display: "block" }}>Claim (Final):</span>
                          <p style={{ margin: "2px 0", color: "#1e293b" }}>{submission.content.claim || "—"}</p>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#047857", display: "block" }}>Evidence (Final):</span>
                          <p style={{ margin: "2px 0", color: "#1e293b" }}>{submission.content.evidence || "—"}</p>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#b45309", display: "block" }}>Reasoning (Final):</span>
                          <p style={{ margin: "2px 0", color: "#1e293b" }}>{submission.content.reasoning || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Process Evidence */}
                  <div className="evidence-summary-bar">
                    <button
                      type="button"
                      className="toggle-expand-btn"
                      onClick={() => toggleExpand(submission.id)}
                    >
                      {isExpanded ? "▲ ซ่อนรายละเอียดเพิ่มเติม" : `▼ ดูรายละเอียดเพิ่มเติม (Authorship & Peer Reviews)`}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="teacher-evidence-grid" style={{ marginTop: "12px" }}>
                      <div className="evidence-block">
                        <h3>Authorship Indicators</h3>
                        <p className={`authorship-status status-${authorship?.status ?? "none"}`}>
                          สถานะ: {authorship?.status ?? "ปกติ"}
                        </p>
                        <small className="block-line">
                          {authorship?.reasons?.join(", ") || "ไม่มีข้อสังเกตผิดปกติ"}
                        </small>
                        <small className="warning-note">
                          * สัญญาณเพื่อประกอบการตัดสินใจของครูเท่านั้น ไม่ใช่ระบบตัดสินการทุจริตอัตโนมัติ
                        </small>
                      </div>

                      <div className="evidence-block">
                        <h3>Peer Feedback</h3>
                        <p>{peerReviews.length} ความคิดเห็น</p>
                        {peerReviews.length === 0 && <small className="muted-text">ยังไม่มีเพื่อนส่งข้อเสนอแนะ</small>}
                        {peerReviews.map((pr) => (
                          <div className="history-item" key={pr.id}>
                            <p className="small-text">{pr.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Rubric & Review Form (4 Dimensions of Synthetic Thinking) */}
                  {review ? (
                    <div className="teacher-review-result-card" style={{ marginTop: "14px" }}>
                      <div className="result-header">
                        <h3>ผลการประเมินการคิดสังเคราะห์ (Synthetic Thinking Score)</h3>
                        <span className="final-score-pill">{review.score} / 100 คะแนน</span>
                      </div>
                      {review.syntheticScores && (
                        <div className="rubric-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", margin: "10px 0" }}>
                          <div>1. เลือกสรรข้อมูล: <strong>{review.syntheticScores.selectingInfo} / 4</strong></div>
                          <div>2. เชื่อมโยงข้อมูล: <strong>{review.syntheticScores.connectingInfo} / 4</strong></div>
                          <div>3. ภาษาของตนเอง: <strong>{review.syntheticScores.reconstructingLanguage} / 4</strong></div>
                          <div>4. ตอบตรงประเด็น: <strong>{review.syntheticScores.directAnswering} / 4</strong></div>
                        </div>
                      )}
                      {review.rubricScores?.claim !== undefined && (
                        <div className="rubric-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", margin: "10px 0" }}>
                          <div>CER Claim: <strong>{review.rubricScores.claim} / 4</strong></div>
                          <div>CER Evidence: <strong>{review.rubricScores.evidence} / 4</strong></div>
                          <div>CER Reasoning: <strong>{review.rubricScores.reasoning} / 4</strong></div>
                        </div>
                      )}
                      <p className="teacher-comment-box" style={{ marginTop: "8px" }}>
                        <strong>ข้อคิดเห็นของครู:</strong> {review.comment || "ไม่มีความคิดเห็นเพิ่มเติม"}
                      </p>
                    </div>
                  ) : (
                    <div className="rubric-review-form card-subtle" style={{ marginTop: "14px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                      <div className="rubric-form-heading">
                        <h3 style={{ margin: 0, color: "#1e293b" }}>เกณฑ์การคิดสังเคราะห์ 4 มิติ (Synthetic Thinking Rubric 1–4 ระดับ, เต็ม 16 แต้ม)</h3>
                        <p className="small-note" style={{ color: "#64748b" }}>
                          * อ้างอิงตามกรอบงานวิจัยในชั้นเรียน (CAR) สำหรับนักเรียนชั้น ม.4
                        </p>
                      </div>

                      <div className="rubric-dimension-selectors" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                        {/* Dimension 1 */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>1. การเลือกสรรข้อมูลที่เกี่ยวข้อง (Selecting Information)</strong>
                            <small>การคัดเลือกตัวเลข หลักฐานเชิงประจักษ์ และข้อเท็จจริงที่ตรงประเด็น</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.selectingInfo === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "selectingInfo", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dimension 2 */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>2. การเชื่อมโยงความสัมพันธ์ของข้อมูล (Connecting Information)</strong>
                            <small>การอธิบายความสัมพันธ์เชิงเหตุผลและกฎ 10% การถ่ายทอดพลังงาน</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.connectingInfo === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "connectingInfo", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dimension 3 */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>3. การสังเคราะห์ด้วยภาษาของตนเอง (Reconstructing in Own Language)</strong>
                            <small>การเรียบเรียงและสังเคราะห์โครงสร้างความรู้ใหม่โดยไม่คัดลอกข้อความตรงๆ</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.reconstructingLanguage === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "reconstructingLanguage", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dimension 4 */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>4. การตอบตรงประเด็นและสมเหตุสมผล (Direct Answering)</strong>
                            <small>ข้อสรุปมีความสอดคล้อง ชัดเจน และตอบคำถามนำการสืบเสาะอย่างสมบูรณ์</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.directAnswering === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "directAnswering", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rubric-form-heading" style={{ marginTop: "18px" }}>
                        <h3 style={{ margin: 0, color: "#1e293b" }}>เกณฑ์ CER (Claim–Evidence–Reasoning, 1–4 ระดับ)</h3>
                        <p className="small-note" style={{ color: "#64748b" }}>
                          * ประเมินแยกจากการคิดสังเคราะห์ 4 มิติ (ไม่นำไปคิดรวมในคะแนน %)
                        </p>
                      </div>
                      <div className="rubric-dimension-selectors" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                        {([
                          ["claim", "Claim (ข้อกล่าวอ้าง)"],
                          ["evidence", "Evidence (หลักฐาน)"],
                          ["reasoning", "Reasoning (การให้เหตุผล)"],
                        ] as const).map(([dimension, label]) => (
                          <div className="rubric-row" key={dimension}>
                            <div className="rubric-label">
                              <strong>{label}</strong>
                            </div>
                            <div className="rubric-buttons">
                              {[1, 2, 3, 4].map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  className={`rubric-btn ${draft[dimension] === level ? "active" : ""}`}
                                  onClick={() => updateRubricDimension(submission.id, dimension, level)}
                                >
                                  ระดับ {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="score-and-comment-controls" style={{ marginTop: "14px" }}>
                        <div className="score-input-box">
                          <label htmlFor={`score-${submission.id}`}>
                            <strong>คะแนนรวมคิดสังเคราะห์ ({draft.selectingInfo + draft.connectingInfo + draft.reconstructingLanguage + draft.directAnswering}/16 แต้ม → คิดเป็น {draft.score}%):</strong>
                          </label>
                          <input
                            id={`score-${submission.id}`}
                            type="number"
                            min="0"
                            max="100"
                            className="score-number-input"
                            value={draft.score}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [submission.id]: { ...draft, score: Number(e.target.value) },
                              })
                            }
                          />
                        </div>

                        <div className="comment-input-box" style={{ marginTop: "10px" }}>
                          <label htmlFor={`comment-${submission.id}`}>
                            <strong>ข้อคิดเห็นและข้อเสนอแนะเชิงสังเคราะห์จากครู:</strong>
                          </label>
                          <textarea
                            id={`comment-${submission.id}`}
                            className="teacher-comment-textarea"
                            value={draft.comment}
                            placeholder="ระบุจุดเด่นในการคิดสังเคราะห์ และแนวทางที่นักเรียนพัฒนาได้เพิ่มเติม..."
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [submission.id]: { ...draft, comment: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="review-action-row" style={{ marginTop: "14px" }}>
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => void saveReview(submission.id)}
                          disabled={saving === submission.id}
                        >
                          {saving === submission.id ? "กำลังบันทึกผลการประเมิน..." : "💾 บันทึกผลการประเมิน (4 มิติ + CER)"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
