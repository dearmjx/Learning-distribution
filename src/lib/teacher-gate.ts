import { constantTimeEqual, hmacHex } from "@/lib/demo-mode";

/**
 * Shared-password gate in front of the teacher dashboard and teacher APIs.
 * It keeps students on a shared classroom device out of teacher tools in demo/memory mode.
 * In Supabase mode the routes still enforce the signed-in teacher's role; this is an extra lock.
 */
export const TEACHER_COOKIE_NAME = "learning_os_teacher";
export const TEACHER_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const TOKEN_VERSION = "t1";
const PASSWORD_PURPOSE = "learning-os-teacher-password";
const SESSION_PURPOSE = "learning-os-teacher-session";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isTeacherGateEnabled(): boolean {
  return readEnv("TEACHER_DASHBOARD_PASSWORD").length > 0;
}

/** Pages and APIs that only a teacher (or researcher) should reach. */
export function isTeacherPath(pathname: string): boolean {
  if (pathname === "/teacher/unlock" || pathname.startsWith("/api/teacher/unlock") || pathname.startsWith("/api/teacher/lock")) {
    return false;
  }
  return pathname === "/teacher" || pathname.startsWith("/teacher/") || pathname.startsWith("/api/teacher/") || pathname.startsWith("/api/research/");
}

function getSessionSecret(): string | null {
  return readEnv("TEACHER_SESSION_SECRET") || readEnv("TEACHER_DASHBOARD_PASSWORD") || null;
}

export async function verifyTeacherPassword(candidate: unknown): Promise<boolean> {
  const password = readEnv("TEACHER_DASHBOARD_PASSWORD");
  if (!password || typeof candidate !== "string" || candidate.length === 0 || candidate.length > 256) return false;
  const [expected, actual] = await Promise.all([
    hmacHex(password, PASSWORD_PURPOSE),
    hmacHex(candidate.trim(), PASSWORD_PURPOSE),
  ]);
  return expected !== null && actual !== null && constantTimeEqual(expected, actual);
}

export async function createTeacherSessionToken(nowSeconds = Math.floor(Date.now() / 1000)): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;
  const payload = `${TOKEN_VERSION}.${nowSeconds + TEACHER_SESSION_MAX_AGE_SECONDS}`;
  const signature = await hmacHex(secret, `${SESSION_PURPOSE}:${payload}`);
  return signature ? `${payload}.${signature}` : null;
}

export async function verifyTeacherSessionToken(
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < nowSeconds) return false;
  const secret = getSessionSecret();
  if (!secret) return false;
  const expected = await hmacHex(secret, `${SESSION_PURPOSE}:${parts[0]}.${parts[1]}`);
  return expected !== null && constantTimeEqual(expected, parts[2]);
}
