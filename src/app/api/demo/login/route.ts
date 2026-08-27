import { NextResponse } from "next/server";
import {
  DEMO_COOKIE_NAME,
  DEMO_SESSION_MAX_AGE_SECONDS,
  createDemoSessionToken,
  hasDemoPassword,
  isDemoModeEnabled,
  verifyDemoPassword,
} from "@/lib/demo-mode";

export async function POST(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo mode is disabled" }, { status: 404 });
  }

  if (!hasDemoPassword()) {
    return NextResponse.json({ error: "Demo mode password is not configured" }, { status: 503 });
  }

  let body: { password?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    // Treat malformed requests as an invalid password without logging the body.
  }

  if (!(await verifyDemoPassword(body.password))) {
    return NextResponse.json({ error: "Incorrect demo password" }, { status: 401 });
  }

  const token = await createDemoSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Demo mode session is not configured" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: DEMO_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
