"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

interface ReviewDraft {
  score: number;
  comment: string;
}

export function TeacherReviewDashboard() {
  const [data, setData] = useState<TeacherReviewSnapshot | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/reviews");
      const payload = await response.json() as TeacherReviewSnapshot & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "โหลดข้อมูลครูไม่สำเร็จ");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "โหลดข้อมูลครูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveReview(submissionId: string) {
    const draft = drafts[submissionId] ?? { score: 80, comment: "" };
    setSaving(submissionId);
    setError("");
    try {
      const response = await fetch("/api/teacher/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, teacherId: "demo-teacher-01", score: Number(draft.score), comment: draft.comment }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "บันทึก review ไม่สำเร็จ");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึก review ไม่สำเร็จ");
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="simple-page teacher-page">
      <header className="page-header">
        <div><p className="eyebrow">LEARNING OS / TEACHER REVIEW</p><h1>ตรวจหลักฐานการเรียนรู้</h1><p className="lede">ครูดูงาน, revision, AI interaction และ authorship indicator ก่อนให้คะแนนด้วยตนเอง</p></div>
        <div className="page-links"><Link className="text-link" href="/teacher/analytics">Evidence analytics →</Link><a className="text-link" href="/api/research/export">Research export →</a></div>
      </header>
      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted-text">กำลังโหลด submissions…</p>}
      {data && <>
        <section className="teacher-metric-grid">
          <div className="metric-card"><span>Submissions</span><strong>{data.analytics.submissionCount}</strong></div>
          <div className="metric-card"><span>Revisions</span><strong>{data.analytics.revisionCount}</strong></div>
          <div className="metric-card"><span>Hints</span><strong>{data.analytics.hintCount}</strong></div>
          <div className="metric-card"><span>Fallbacks</span><strong>{data.analytics.fallbackCount}</strong></div>
        </section>
        <div className="teacher-submission-list">
          {data.submissions.length === 0 && <section className="card"><p className="muted-text">ยังไม่มี submission จากนักเรียน</p></section>}
          {data.submissions.slice().reverse().map((submission) => {
            const draft = drafts[submission.id] ?? { score: 80, comment: "" };
            const review = data.reviews.find((item) => item.submissionId === submission.id);
            const authorship = data.authorshipBySubmission[submission.id];
            const revisions = data.revisions.filter((item) => item.submissionId === submission.id);
            const interactions = data.interactions.filter((item) => item.activityId === submission.activityId);
            const peerReviews = data.peerReviews.filter((item) => item.submissionId === submission.id);
            return <section className="card teacher-submission" key={submission.id}>
              <div className="card-heading"><div><p className="eyebrow">SUBMISSION / VERSION {submission.version}</p><h2>{submission.activityId}</h2></div><span className="phase-label">{submission.workflowState}</span></div>
              <div className="cer-evidence"><div><strong>Claim</strong><p>{submission.content.claim || "—"}</p></div><div><strong>Evidence</strong><p>{submission.content.evidence || "—"}</p></div><div><strong>Reasoning</strong><p>{submission.content.reasoning || "—"}</p></div></div>
              <div className="teacher-evidence-grid">
                <div><h3>Revision history</h3><p>{revisions.length} saved revision(s)</p>{revisions.map((revision) => <small className="block-line" key={revision.id}>v{revision.version} · {new Date(revision.createdAt).toLocaleString("th-TH")}</small>)}</div>
                <div><h3>AI interactions</h3><p>{interactions.length} interaction(s) · hint cost {submission.hintCost}</p>{interactions.slice(-3).map((interaction) => <small className="block-line" key={interaction.id}>{interaction.response?.provider ?? "unknown"}{interaction.fallbackUsed ? " · fallback" : ""}</small>)}</div>
                <div><h3>Authorship indicator</h3><p>{authorship?.status ?? "not recorded"}</p><small className="block-line">Teacher review only; never an automatic plagiarism decision.</small></div>
                <div><h3>Peer feedback</h3><p>{peerReviews.length} review(s)</p>{peerReviews.length === 0 && <small className="block-line">Peer review is disabled for this initial activity.</small>}{peerReviews.map((peerReview) => <small className="block-line" key={peerReview.id}>{peerReview.feedback}</small>)}</div>
              </div>
              {review ? <div className="teacher-review-result"><strong>Final teacher score: {review.score}/100</strong><p>{review.comment || "ไม่มี comment"}</p></div> : <div className="review-form">
                <h3>Teacher final review</h3>
                <div className="review-controls"><label>Score<input type="number" min="0" max="100" value={draft.score} onChange={(event) => setDrafts({ ...drafts, [submission.id]: { ...draft, score: Number(event.target.value) } })} /></label><label>Comment<textarea value={draft.comment} onChange={(event) => setDrafts({ ...drafts, [submission.id]: { ...draft, comment: event.target.value } })} placeholder="Evidence-based teacher comment" /></label></div>
                <button className="primary-button compact-button" type="button" onClick={() => void saveReview(submission.id)} disabled={saving === submission.id}>{saving === submission.id ? "Saving…" : "Assign final score"}</button>
                <small className="small-note">hintCost is shown as a process metric and is not deducted from this academic score.</small>
              </div>}
            </section>;
          })}
        </div>
      </>}
    </main>
  );
}
