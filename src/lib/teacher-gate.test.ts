import { afterEach, describe, expect, it } from "vitest";
import {
  createTeacherSessionToken,
  isTeacherGateEnabled,
  isTeacherPath,
  verifyTeacherPassword,
  verifyTeacherSessionToken,
} from "@/lib/teacher-gate";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("teacher dashboard gate", () => {
  it("is off until a password is configured", () => {
    delete process.env.TEACHER_DASHBOARD_PASSWORD;
    expect(isTeacherGateEnabled()).toBe(false);
    process.env.TEACHER_DASHBOARD_PASSWORD = "3.14";
    expect(isTeacherGateEnabled()).toBe(true);
  });

  it("accepts only the configured password", async () => {
    process.env.TEACHER_DASHBOARD_PASSWORD = "3.14";
    expect(await verifyTeacherPassword("3.14")).toBe(true);
    expect(await verifyTeacherPassword(" 3.14 ")).toBe(true);
    expect(await verifyTeacherPassword("3.141")).toBe(false);
    expect(await verifyTeacherPassword("")).toBe(false);
    expect(await verifyTeacherPassword(314)).toBe(false);
  });

  it("issues session tokens that expire and cannot be forged", async () => {
    process.env.TEACHER_DASHBOARD_PASSWORD = "3.14";
    process.env.TEACHER_SESSION_SECRET = "a-long-random-secret-for-tests-only";
    const now = 1_800_000_000;
    const token = await createTeacherSessionToken(now);
    expect(await verifyTeacherSessionToken(token ?? undefined, now + 60)).toBe(true);
    expect(await verifyTeacherSessionToken(token ?? undefined, now + 9 * 60 * 60)).toBe(false);
    const [version, expiresAt] = (token ?? "").split(".");
    expect(await verifyTeacherSessionToken(`${version}.${expiresAt}.${"0".repeat(64)}`, now)).toBe(false);
    process.env.TEACHER_SESSION_SECRET = "a-different-secret-signs-everyone-out";
    expect(await verifyTeacherSessionToken(token ?? undefined, now + 60)).toBe(false);
  });

  it("guards teacher pages and APIs but not the unlock flow or student pages", () => {
    expect(isTeacherPath("/teacher/review")).toBe(true);
    expect(isTeacherPath("/teacher/roster")).toBe(true);
    expect(isTeacherPath("/api/teacher/reviews")).toBe(true);
    expect(isTeacherPath("/api/research/export")).toBe(true);
    expect(isTeacherPath("/teacher/unlock")).toBe(false);
    expect(isTeacherPath("/api/teacher/unlock")).toBe(false);
    expect(isTeacherPath("/api/teacher/lock")).toBe(false);
    expect(isTeacherPath("/")).toBe(false);
    expect(isTeacherPath("/student/timeline")).toBe(false);
    expect(isTeacherPath("/teachers-guide")).toBe(false);
  });
});
