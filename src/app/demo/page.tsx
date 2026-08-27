import { cookies } from "next/headers";
import Link from "next/link";
import { DemoLoginForm } from "@/components/demo-login-form";
import {
  DEMO_COOKIE_NAME,
  hasDemoPassword,
  isDemoModeEnabled,
  verifyDemoSessionToken,
} from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const enabled = isDemoModeEnabled();
  const cookieStore = enabled ? await cookies() : null;
  const unlocked = enabled
    ? await verifyDemoSessionToken(cookieStore?.get(DEMO_COOKIE_NAME)?.value)
    : false;

  if (!enabled) {
    return (
      <main className="demo-gate-page">
        <section className="demo-gate-card" aria-labelledby="demo-disabled-title">
          <p className="demo-gate-eyebrow">LEARNING OS · DEMO MODE</p>
          <h1 id="demo-disabled-title">Demo mode is off</h1>
          <p className="demo-gate-copy">
            Set <code>DEMO_MODE_ENABLED=true</code> and configure the server-only demo password before opening the full preview.
          </p>
          <Link className="secondary-button" href="/">Return to Learning OS</Link>
        </section>
      </main>
    );
  }

  if (unlocked) {
    return (
      <main className="demo-gate-page">
        <section className="demo-gate-card" aria-labelledby="demo-unlocked-title">
          <p className="demo-gate-eyebrow">LEARNING OS · DEMO MODE UNLOCKED</p>
          <h1 id="demo-unlocked-title">Full preview is ready</h1>
          <p className="demo-gate-copy">
            Student, teacher, timeline, analytics, review, and demo API surfaces are available for this local presentation session.
          </p>
          <div className="demo-gate-actions">
            <Link className="primary-button" href="/">Open student workspace</Link>
            <Link className="secondary-button" href="/teacher/review">Open teacher review</Link>
            <a className="demo-gate-exit" href="/api/demo/logout">Exit demo mode</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="demo-gate-page">
      <section className="demo-gate-card" aria-labelledby="demo-title">
        <p className="demo-gate-eyebrow">LEARNING OS · PRIVATE DEMO</p>
        <h1 id="demo-title">Unlock the full demo</h1>
        <p className="demo-gate-copy">
          Enter the local demo password to preview the student workflow, teacher review, learning timeline, analytics, and mock AI Coach.
        </p>
        {!hasDemoPassword() && (
          <p className="demo-gate-warning">The server password is not configured yet. Add it to `.env.local` and restart the server.</p>
        )}
        <DemoLoginForm />
        <p className="demo-gate-note">The password stays server-side and is never sent to the browser.</p>
      </section>
    </main>
  );
}
