"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClassTimer } from "@/lib/domain/types";
import { formatCountdown, remainingAt, type TimerAction } from "@/lib/classroom/timer";

interface TimerResponse {
  timer: ClassTimer | null;
  serverNow: string;
  error?: string;
}

const POLL_MS = 15_000;
const WARN_SECONDS = 120;

/**
 * Polls the class countdown and ticks locally. `offsetMs` corrects for a device clock that
 * differs from the server, so every iPad shows the same time left.
 */
function useClassTimer(endpoint: string) {
  const [timer, setTimer] = useState<ClassTimer | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);

  const accept = useCallback((data: TimerResponse) => {
    setTimer(data.timer);
    setOffsetMs(Date.parse(data.serverNow) - Date.now());
    setLoaded(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      accept((await response.json()) as TimerResponse);
    } catch {
      // Keep counting from the last known state while offline.
    }
  }, [accept, endpoint]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(tick);
  }, []);

  const remaining = timer ? remainingAt(timer, now + offsetMs) : 0;
  const running = Boolean(timer?.endsAt) && remaining > 0;
  return { timer, remaining, running, loaded, accept, refresh };
}

/** Student-facing countdown strip. Hidden until the teacher starts a timer. */
export function ClassTimerBanner() {
  const { timer, remaining, running } = useClassTimer("/api/timer");
  const [announcement, setAnnouncement] = useState("");
  const lastAnnounced = useRef<number | null>(null);

  // A new start or added time begins a fresh set of milestones.
  useEffect(() => {
    lastAnnounced.current = null;
  }, [timer?.endsAt]);

  // Screen readers hear milestones only, not every second.
  useEffect(() => {
    if (!running) return;
    // The nearest milestone not yet announced, so a 90-second timer says "under 5 minutes", not "5 minutes".
    const milestone = [0, 60, 300].find((mark) => remaining <= mark && (lastAnnounced.current === null || lastAnnounced.current > mark));
    if (milestone === undefined) return;
    lastAnnounced.current = milestone;
    setAnnouncement(milestone === 0 ? "หมดเวลา" : `เหลือเวลาไม่ถึง ${milestone / 60} นาที`);
  }, [remaining, running]);

  if (!timer) return null;
  const started = timer.endsAt !== null || timer.remainingSeconds !== timer.durationSeconds;
  if (!started) return null;

  const finished = remaining === 0;
  const tone = finished ? "timer-done" : remaining <= WARN_SECONDS ? "timer-warn" : "timer-ok";
  const status = finished ? "หมดเวลา · ส่งงานที่ทำได้ แล้วรอครู" : running ? "เหลือเวลา" : "ครูหยุดเวลาไว้ชั่วคราว";

  return (
    <div className={`class-timer-banner ${tone}`}>
      <span className="class-timer-icon" aria-hidden="true">{finished ? "⏰" : "⏱️"}</span>
      <div className="class-timer-text">
        {timer.label && <span className="class-timer-label">{timer.label}</span>}
        <span className="class-timer-status">{status}</span>
      </div>
      <span className="class-timer-clock" role="timer" aria-label={`${status} ${formatCountdown(remaining)}`}>
        {formatCountdown(remaining)}
      </span>
      <span className="visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

const PRESET_MINUTES = [5, 10, 15, 20, 30];

/** Teacher controls for the class countdown. Every change goes through the server clock. */
export function TeacherTimerControls() {
  const { timer, remaining, running, loaded, accept } = useClassTimer("/api/teacher/timer");
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seeded = useRef(false);

  // Fill the form from the saved timer once, without overwriting what the teacher is typing.
  useEffect(() => {
    if (seeded.current || !loaded) return;
    seeded.current = true;
    if (timer) {
      setLabel(timer.label);
      setMinutes(String(Math.max(1, Math.round(timer.durationSeconds / 60))));
    }
  }, [loaded, timer]);

  async function send(action: TimerAction) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = (await response.json()) as TimerResponse;
      if (!response.ok) throw new Error(data.error ?? "ตั้งเวลาไม่สำเร็จ");
      accept(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตั้งเวลาไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function setAndStart(totalMinutes: number) {
    setMinutes(String(totalMinutes));
    void (async () => {
      await send({ type: "set", label: label.trim(), durationSeconds: totalMinutes * 60 });
      await send({ type: "start" });
    })();
  }

  const parsedMinutes = Number(minutes);
  const minutesValid = Number.isFinite(parsedMinutes) && parsedMinutes > 0 && parsedMinutes <= 240;
  const finished = Boolean(timer) && remaining === 0 && timer?.endsAt !== null;

  return (
    <section className="teacher-timer-card" aria-labelledby="teacher-timer-title">
      <div className="teacher-timer-head">
        <div>
          <p className="eyebrow">CLASS TIMER</p>
          <h2 id="teacher-timer-title">⏱️ นับเวลาถอยหลังให้นักเรียน</h2>
        </div>
        <div className={`teacher-timer-clock ${finished ? "timer-done" : remaining > 0 && remaining <= WARN_SECONDS ? "timer-warn" : ""}`} role="timer">
          {timer ? formatCountdown(remaining) : "--:--"}
          <span className="teacher-timer-state">
            {!timer ? "ยังไม่ได้ตั้งเวลา" : finished ? "หมดเวลา" : running ? "กำลังนับ · นักเรียนเห็นแล้ว" : remaining === timer.durationSeconds ? "ตั้งไว้ ยังไม่เริ่ม" : "หยุดชั่วคราว"}
          </span>
        </div>
      </div>

      <div className="teacher-timer-form">
        <label htmlFor="timer-label">
          ชื่อช่วงเวลา
          <input id="timer-label" className="form-input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น เขียน CER (Phase 4)" />
        </label>
        <label htmlFor="timer-minutes">
          นาที
          <input id="timer-minutes" className="form-input" type="number" inputMode="numeric" min={1} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <button type="button" className="secondary-button" disabled={busy || !minutesValid} onClick={() => void send({ type: "set", label: label.trim(), durationSeconds: Math.round(parsedMinutes * 60) })}>
          ตั้งเวลา
        </button>
      </div>

      <div className="teacher-timer-presets" role="group" aria-label="ตั้งแล้วเริ่มทันที">
        <span>ตั้งแล้วเริ่มเลย:</span>
        {PRESET_MINUTES.map((m) => (
          <button key={m} type="button" className="quick-chip" disabled={busy} onClick={() => setAndStart(m)}>
            {m} นาที
          </button>
        ))}
      </div>

      <div className="teacher-timer-actions">
        {running ? (
          <button type="button" className="secondary-button" disabled={busy} onClick={() => void send({ type: "pause" })}>⏸ หยุดชั่วคราว</button>
        ) : (
          <button type="button" className="primary-button" disabled={busy || !timer || timer.durationSeconds === 0} onClick={() => void send({ type: "start" })}>
            ▶ {timer && remaining > 0 && remaining < timer.durationSeconds ? "นับต่อ" : "เริ่มนับ"}
          </button>
        )}
        <button type="button" className="secondary-button" disabled={busy || !timer} onClick={() => void send({ type: "add", seconds: 60 })}>+1 นาที</button>
        <button type="button" className="secondary-button" disabled={busy || !timer} onClick={() => void send({ type: "add", seconds: -60 })}>−1 นาที</button>
        <button type="button" className="secondary-button" disabled={busy || !timer} onClick={() => void send({ type: "reset" })}>↺ รีเซ็ต</button>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}
