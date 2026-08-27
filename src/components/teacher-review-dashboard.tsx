"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

interface RubricDraft {
  claim: number;
  evidence: number;
  reasoning: number;
  score: number;
  comment: string;
}

export function TeacherReviewDashboard() {
  const [data, setData] = useState<TeacherReviewSnapshot | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RubricDraft>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/reviews");
      const payload = (await response.json()) as TeacherReviewSnapshot & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "โหลดข้อมูลครูไม่สำเร็จ");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "โหลดข้อมูลครูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function getDraft(submissionId: string): RubricDraft {
    if (drafts[submissionId]) return drafts[submissionId];
    return {
      claim: 3,
      evidence: 3,
      reasoning: 3,
      score: 75,
      comment: "",
    };
  }

  function updateRubricDimension(submissionId: string, dimension: "claim" | "evidence" | "reasoning", val: number) {
    const current = getDraft(submissionId);
    const updated = { ...current, [dimension]: val };
    const totalPoints = (updated.claim + updated.evidence + updated.reasoning) / 12;
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
          teacherId: "demo-teacher-01",
          score: Number(draft.score),
          comment: draft.comment,
          rubricScores: {
            claim: draft.claim,
            evidence: draft.evidence,
            reasoning: draft.reasoning,
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

  const submissions = data?.submissions ?? [];
  const reviews = data?.reviews ?? [];

  const filteredSubmissions = submissions.filter((sub) => {
    const review = reviews.find((r) => r.submissionId === sub.id);
    if (filter === "pending" && review) return false;
    if (filter === "reviewed" && !review) return false;
    if (activityFilter !== "all" && sub.activityId !== activityFilter) return false;
    if (studentSearch.trim() && !sub.studentId.toLowerCase().includes(studentSearch.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => !reviews.some((r) => r.submissionId === s.id)).length;
  const reviewedCount = submissions.filter((s) => reviews.some((r) => r.submissionId === s.id)).length;

  return (
    <main className="simple-page teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LEARNING OS / TEACHER REVIEW HUB</p>
          <h1>Teacher Review Queue & Rubrics</h1>
          <p className="lede">
            ตรวจหลักฐานการเรียนรู้ CER ด้วย Rubric วิทยาศาสตร์, ติดตามกระบวนการแก้ไข (Revision) และประเมิน AI Socratic Interaction
          </p>
        </div>
        <div className="page-links">
          <Link className="pill-link" href="/teacher/roster">
            👥 Class Roster
          </Link>
          <Link className="pill-link active-link" href="/teacher/review">
            ✍️ ตรวจงาน Submissions
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

      {data && (
        <>
          <section className="teacher-metric-grid">
            <div className="metric-card">
              <span>Submissions ทั้งหมด</span>
              <strong>{data.analytics.submissionCount}</strong>
            </div>
            <div className="metric-card">
              <span>รอการตรวจ (Pending)</span>
              <strong style={{ color: "#cf5636" }}>{pendingCount}</strong>
            </div>
            <div className="metric-card">
              <span>ตรวจเสร็จสิ้น (Reviewed)</span>
              <strong style={{ color: "#208769" }}>{reviewedCount}</strong>
            </div>
            <div className="metric-card">
              <span>Revisions ที่บันทึก</span>
              <strong>{data.analytics.revisionCount}</strong>
            </div>
          </section>

          <section className="review-filters-bar card">
            <div className="filter-controls-row">
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  ทั้งหมด ({submissions.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "pending" ? "active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  ⏳ รอตรวจ ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${filter === "reviewed" ? "active" : ""}`}
                  onClick={() => setFilter("reviewed")}
                >
                  ✅ ตรวจแล้ว ({reviewedCount})
                </button>
              </div>

              <div className="filter-inputs">
                <select
                  className="activity-dropdown"
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                >
                  <option value="all">ทุกกิจกรรม (All Activities)</option>
                  <option value="ecosystem-food-web-01">🌿 กิจกรรม 1: สายใยอาหาร</option>
                  <option value="ecosystem-energy-flow-01">⚡ กิจกรรม 2: การถ่ายทอดพลังงาน</option>
                </select>

                <input
                  type="text"
                  className="search-input"
                  placeholder="ค้นหาตามรหัสนักเรียน..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            </div>
          </section>

          {loading && <p className="muted-text">กำลังโหลด submissions…</p>}

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
              const revisions = data.revisions.filter((item) => item.submissionId === submission.id);
              const interactions = data.interactions.filter((item) => item.activityId === submission.activityId);
              const peerReviews = data.peerReviews.filter((item) => item.submissionId === submission.id);
              const isExpanded = expandedSubmissions[submission.id] ?? false;

              return (
                <section className="card teacher-submission" key={submission.id}>
                  <div className="card-heading">
                    <div>
                      <div className="submission-meta-tags">
                        <span className="unit-badge">Student: {submission.studentId}</span>
                        <span className="anon-badge">v{submission.version}</span>
                        <span className="phase-label">{submission.workflowState}</span>
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

                  {/* CER Evidence View */}
                  <div className="cer-evidence-container">
                    <div className="cer-box cer-claim">
                      <span className="cer-tag">C — ข้อกล่าวอ้าง (Claim)</span>
                      <p>{submission.content.claim || "—"}</p>
                    </div>
                    <div className="cer-box cer-evidence">
                      <span className="cer-tag">E — หลักฐานเชิงประจักษ์ (Evidence)</span>
                      <p>{submission.content.evidence || "—"}</p>
                    </div>
                    <div className="cer-box cer-reasoning">
                      <span className="cer-tag">R — เหตุผลทางวิทยาศาสตร์ (Reasoning)</span>
                      <p>{submission.content.reasoning || "—"}</p>
                    </div>
                  </div>

                  {/* Expandable Process Evidence */}
                  <div className="evidence-summary-bar">
                    <button
                      type="button"
                      className="toggle-expand-btn"
                      onClick={() => toggleExpand(submission.id)}
                    >
                      {isExpanded ? "▲ ซ่อนประวัติและ AI Interactions" : `▼ ดูประวัติการแก้ไข (${revisions.length}) & AI Socratic Logs (${interactions.length})`}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="teacher-evidence-grid">
                      <div className="evidence-block">
                        <h3>ประวัติการปรับปรุง (Revision History)</h3>
                        <p>{revisions.length} ฉบับที่บันทึก</p>
                        {revisions.map((rev) => (
                          <div className="history-item" key={rev.id}>
                            <strong>v{rev.version}</strong> ({new Date(rev.createdAt).toLocaleTimeString("th-TH")})
                            <p className="small-text">Claim: {rev.content.claim.slice(0, 60)}...</p>
                          </div>
                        ))}
                      </div>

                      <div className="evidence-block">
                        <h3>AI Socratic Interactions</h3>
                        <p>{interactions.length} ครั้ง · Hint Level: {submission.hintDepth} (ต้นทุนกระบวนการ: {submission.hintCost})</p>
                        {interactions.slice(-3).map((interaction) => (
                          <div className="history-item" key={interaction.id}>
                            <span>Engine: {interaction.response?.provider ?? "local"}</span>
                            {interaction.fallbackUsed && <span className="fallback-tag"> · fallback</span>}
                            <p className="small-text">Feedback: {interaction.response?.message?.slice(0, 70)}...</p>
                          </div>
                        ))}
                      </div>

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

                  {/* Teacher Rubric & Review Form */}
                  {review ? (
                    <div className="teacher-review-result-card">
                      <div className="result-header">
                        <h3>ผลการประเมินโดยครู (Teacher Review Result)</h3>
                        <span className="final-score-pill">{review.score} / 100 คะแนน</span>
                      </div>
                      {review.rubricScores && (
                        <div className="rubric-summary-grid">
                          <div>Claim: <strong>{review.rubricScores.claim ?? "—"} / 4</strong></div>
                          <div>Evidence: <strong>{review.rubricScores.evidence ?? "—"} / 4</strong></div>
                          <div>Reasoning: <strong>{review.rubricScores.reasoning ?? "—"} / 4</strong></div>
                        </div>
                      )}
                      <p className="teacher-comment-box">
                        <strong>ข้อคิดเห็นของครู:</strong> {review.comment || "ไม่มีความคิดเห็นเพิ่มเติม"}
                      </p>
                    </div>
                  ) : (
                    <div className="rubric-review-form card-subtle">
                      <div className="rubric-form-heading">
                        <h3>เกณฑ์การให้คะแนนแบบ CER Rubric (1 - 4 ระดับ)</h3>
                        <p className="small-note">
                          * คำใบ้ AI (Hint Cost) เป็นเพียงตัวชี้วัดกระบวนการ ไม่ถูกหักลบออกจากคะแนนวิชาการนี้
                        </p>
                      </div>

                      <div className="rubric-dimension-selectors">
                        {/* Claim Rubric */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>1. ข้อกล่าวอ้าง (Claim)</strong>
                            <small>ความถูกต้องและตรงประเด็นของคำตอบทางวิทยาศาสตร์</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.claim === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "claim", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Evidence Rubric */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>2. หลักฐาน (Evidence)</strong>
                            <small>การนำข้อมูลเชิงประจักษ์จากการสืบเสาะมาสนับสนุน</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.evidence === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "evidence", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reasoning Rubric */}
                        <div className="rubric-row">
                          <div className="rubric-label">
                            <strong>3. เหตุผล (Reasoning)</strong>
                            <small>การเชื่อมโยงหลักการทางวิทยาศาสตร์เพื่ออธิบายกลไก</small>
                          </div>
                          <div className="rubric-buttons">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={`rubric-btn ${draft.reasoning === level ? "active" : ""}`}
                                onClick={() => updateRubricDimension(submission.id, "reasoning", level)}
                              >
                                ระดับ {level}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="score-and-comment-controls">
                        <div className="score-input-box">
                          <label htmlFor={`score-${submission.id}`}>
                            <strong>คะแนนรวม (คำนวณจาก Rubric 0–100):</strong>
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

                        <div className="comment-input-box">
                          <label htmlFor={`comment-${submission.id}`}>
                            <strong>ข้อเสนอแนะเชิงสร้างสรรค์จากครู (Feedback):</strong>
                          </label>
                          <textarea
                            id={`comment-${submission.id}`}
                            className="teacher-comment-textarea"
                            value={draft.comment}
                            placeholder="ระบุจุดเด่น และสิ่งที่นักเรียนสามารถนำหลักการวิทยาศาสตร์ไปต่อยอดได้..."
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [submission.id]: { ...draft, comment: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="review-action-row">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => void saveReview(submission.id)}
                          disabled={saving === submission.id}
                        >
                          {saving === submission.id ? "กำลังบันทึกคะแนน..." : "💾 บันทึกผลการประเมิน (Submit Final Review)"}
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
