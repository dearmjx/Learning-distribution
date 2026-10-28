import { describe, expect, it } from "vitest";
import { applyTimerAction, formatCountdown, remainingAt, timerActionSchema, type ClassTimerState } from "@/lib/classroom/timer";

const T0 = Date.parse("2026-10-28T09:00:00.000Z");
const at = (seconds: number) => T0 + seconds * 1000;

describe("class countdown timer", () => {
  const set = applyTimerAction(undefined, { type: "set", label: "เขียน CER", durationSeconds: 600 }, T0);

  it("set stores label and length without starting", () => {
    expect(set).toEqual({ label: "เขียน CER", durationSeconds: 600, endsAt: null, remainingSeconds: 600 });
    expect(remainingAt(set, at(100))).toBe(600);
  });

  it("start counts down from the server clock", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    expect(running.endsAt).toBe("2026-10-28T09:10:00.000Z");
    expect(remainingAt(running, at(61))).toBe(539);
    expect(remainingAt(running, at(599.2))).toBe(1);
    expect(remainingAt(running, at(700))).toBe(0);
  });

  it("start while running does not restart the clock", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    expect(applyTimerAction(running, { type: "start" }, at(30))).toBe(running);
  });

  it("pause keeps the remaining time and resume continues from it", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    const paused = applyTimerAction(running, { type: "pause" }, at(100));
    expect(paused).toMatchObject({ endsAt: null, remainingSeconds: 500 });
    expect(remainingAt(paused, at(900))).toBe(500);
    const resumed = applyTimerAction(paused, { type: "start" }, at(1000));
    expect(remainingAt(resumed, at(1100))).toBe(400);
  });

  it("add and subtract time while running or paused, never below zero", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    expect(remainingAt(applyTimerAction(running, { type: "add", seconds: 60 }, at(100)), at(100))).toBe(560);
    expect(remainingAt(applyTimerAction(running, { type: "add", seconds: -9999 }, at(100)), at(100))).toBe(0);
    const paused = applyTimerAction(running, { type: "pause" }, at(100));
    expect(applyTimerAction(paused, { type: "add", seconds: -60 }, at(200)).remainingSeconds).toBe(440);
  });

  it("starting a finished timer runs the full length again", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    const restarted = applyTimerAction(running, { type: "start" }, at(700));
    expect(remainingAt(restarted, at(700))).toBe(600);
  });

  it("adding time to a finished timer gives that much time, paused", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    const extended = applyTimerAction(running, { type: "add", seconds: 120 }, at(700));
    expect(extended).toMatchObject({ endsAt: null, remainingSeconds: 120 });
  });

  it("reset returns to the full length, stopped", () => {
    const running = applyTimerAction(set, { type: "start" }, T0);
    expect(applyTimerAction(running, { type: "reset" }, at(100))).toMatchObject({ endsAt: null, remainingSeconds: 600 });
  });

  it("an empty timer cannot start", () => {
    const empty: ClassTimerState = { label: "", durationSeconds: 0, endsAt: null, remainingSeconds: 0 };
    expect(applyTimerAction(empty, { type: "start" }, T0)).toBe(empty);
  });

  it("rejects invalid teacher input", () => {
    expect(timerActionSchema.safeParse({ type: "set", label: "x", durationSeconds: 0 }).success).toBe(false);
    expect(timerActionSchema.safeParse({ type: "set", label: "x", durationSeconds: 5 * 60 * 60 }).success).toBe(false);
    expect(timerActionSchema.safeParse({ type: "set", label: "x".repeat(81), durationSeconds: 60 }).success).toBe(false);
    expect(timerActionSchema.safeParse({ type: "explode" }).success).toBe(false);
  });

  it("formats minutes and hours", () => {
    expect(formatCountdown(605)).toBe("10:05");
    expect(formatCountdown(59)).toBe("0:59");
    expect(formatCountdown(3725)).toBe("1:02:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
