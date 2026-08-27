"use client";

import { FormEvent, useState } from "react";

function safeNextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/";
  return requested;
}

export function DemoLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Demo login failed");
        return;
      }

      window.location.assign(safeNextPath());
    } catch {
      setError("Demo login is unavailable. Check that the local server is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="demo-gate-form" onSubmit={handleSubmit}>
      <label htmlFor="demo-password">Demo password</label>
      <input
        id="demo-password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter demo password"
        required
      />
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Unlocking…" : "Unlock demo"}
      </button>
      {error && <p className="demo-gate-error" role="alert">{error}</p>}
    </form>
  );
}
