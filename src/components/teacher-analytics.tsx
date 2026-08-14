"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeacherReviewSnapshot } from "@/lib/teacher/review-types";

export function TeacherAnalytics() {
  const [data, setData] = useState<TeacherReviewSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/teacher/reviews")
      .then((response) => response.json())
      .then((payload: TeacherReviewSnapshot & { error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setData(payload);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลด analytics ไม่สำเร็จ"));
  }, []);

  return <main className="simple-page teacher-page">
    <header className="page-header"><div><p className="eyebrow">LEARNING OS / EVIDENCE ANALYTICS</p><h1>Evidence analytics</h1><p className="lede">สรุป process evidence สำหรับครู ไม่ใช่ automatic grade หรือ plagiarism verdict</p></div><Link className="text-link" href="/teacher/review">← Teacher review</Link></header>
    {error && <p className="error-text">{error}</p>}
    {!data && !error && <p className="muted-text">กำลังโหลด analytics…</p>}
    {data && <>
      <section className="teacher-metric-grid">
        <div className="metric-card"><span>Feedback received</span><strong>{data.analytics.feedbackCount}</strong></div>
        <div className="metric-card"><span>Hint requests</span><strong>{data.analytics.hintCount}</strong></div>
        <div className="metric-card"><span>Teacher reviews</span><strong>{data.analytics.teacherReviewCount}</strong></div>
        <div className="metric-card"><span>Provider fallbacks</span><strong>{data.analytics.fallbackCount}</strong></div>
      </section>
      <section className="card analytics-card"><div className="card-heading"><div><p className="eyebrow">TRACEABLE EVENTS</p><h2>Event catalog in this class</h2></div><a className="text-link" href="/api/research/export">Export separated evidence →</a></div>
        <div className="metric-list">{Object.entries(data.events.reduce<Record<string, number>>((counts, event) => ({ ...counts, [event.eventType]: (counts[event.eventType] ?? 0) + 1 }), {})).map(([type, count]) => <div key={type}><span>{type}</span><strong>{count}</strong></div>)}</div>
        <p className="small-note">The research export keeps the identity map separate from evidence rows. Authorship signals are teacher-review inputs only.</p>
      </section>
    </>}
  </main>;
}
