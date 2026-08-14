"use client";

import { useEffect, useState } from "react";
import type { LearningEvent, Submission } from "@/lib/domain/types";

interface TimelineData {
  submissions: Submission[];
  events: LearningEvent[];
}

export function StudentTimeline() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/sessions?studentId=demo-student-01")
      .then((response) => response.json())
      .then((payload: TimelineData & { error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setData(payload);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลด timeline ไม่สำเร็จ"));
  }, []);

  return (
    <main className="simple-page timeline-page">
      <p className="eyebrow">LEARNING OS / MY TIMELINE</p>
      <h1>Learning timeline</h1>
      <p className="lede">เหตุการณ์ของคุณเท่านั้น: draft, feedback, hint และ revision ถูกแสดงตามลำดับเวลา</p>
      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="muted-text">กำลังโหลดหลักฐานการเรียนรู้…</p>}
      {data && <div className="timeline-page-grid">
        <section className="card">
          <div className="card-heading"><div><p className="eyebrow">EVENTS</p><h2>เหตุการณ์ของฉัน</h2></div><span className="phase-label">{data.events.length} events</span></div>
          <div className="timeline-list large-timeline">
            {data.events.length === 0 && <p className="muted-text">ยังไม่มีเหตุการณ์ ลองเริ่มกิจกรรมแรก</p>}
            {data.events.map((event) => <div className="timeline-item" key={event.id}>
              <span className="timeline-dot" />
              <div><strong>{event.eventType}</strong><small>{new Date(event.occurredAt).toLocaleString("th-TH")}</small></div>
            </div>)}
          </div>
        </section>
        <section className="card">
          <div className="card-heading"><div><p className="eyebrow">ARTIFACTS</p><h2>งานที่ส่ง</h2></div></div>
          <div className="history-list">
            {data.submissions.map((submission) => <div className="history-item" key={submission.id}>
              <div><strong>Version {submission.version}</strong><span>{submission.workflowState}</span></div>
              <small>Hint cost {submission.hintCost} · {new Date(submission.submittedAt).toLocaleString("th-TH")}</small>
            </div>)}
          </div>
        </section>
      </div>}
    </main>
  );
}
