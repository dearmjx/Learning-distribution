"use client";

import { FormEvent, useState } from "react";

function safeNextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/teacher/review";
  return requested;
}

export function TeacherUnlockForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teacher/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "เข้าแดชบอร์ดไม่สำเร็จ");
        setPassword("");
        return;
      }
      window.location.assign(safeNextPath());
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่าเครื่องครูเปิดระบบอยู่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="demo-gate-form" onSubmit={handleSubmit}>
      <label htmlFor="teacher-password">รหัสแดชบอร์ดครู</label>
      {/* inputMode="decimal" opens the number pad with a decimal point on iPhone and iPad. */}
      <input
        id="teacher-password"
        name="password"
        type="password"
        inputMode="decimal"
        autoComplete="current-password"
        autoCapitalize="off"
        autoCorrect="off"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="ใส่รหัส"
        required
      />
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "กำลังตรวจรหัส…" : "เข้าแดชบอร์ดครู"}
      </button>
      {error && <p className="demo-gate-error" role="alert">{error}</p>}
    </form>
  );
}
