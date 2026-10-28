import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitedResponse } from "@/lib/safety/rate-limit";
import {
  TEACHER_COOKIE_NAME,
  TEACHER_SESSION_MAX_AGE_SECONDS,
  createTeacherSessionToken,
  isTeacherGateEnabled,
  verifyTeacherPassword,
} from "@/lib/teacher-gate";

export async function POST(request: Request) {
  if (!isTeacherGateEnabled()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งรหัสแดชบอร์ดครู" }, { status: 404 });
  }

  // A short shared password is guessable; slow down guessing from one client.
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = checkRateLimit(`teacher-unlock:${client}`, 10);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  let body: { password?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    // Treat malformed requests as a wrong password without logging the body.
  }

  if (!(await verifyTeacherPassword(body.password))) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const token = await createTeacherSessionToken();
  if (!token) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า session ครู" }, { status: 503 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: TEACHER_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: TEACHER_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
