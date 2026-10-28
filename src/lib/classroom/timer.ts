import { z } from "zod";
import type { ClassTimer } from "@/lib/domain/types";

/** Longest countdown a teacher can set: a double period plus margin. */
export const MAX_TIMER_SECONDS = 4 * 60 * 60;

export type ClassTimerState = Pick<ClassTimer, "label" | "durationSeconds" | "endsAt" | "remainingSeconds">;

export const timerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set"),
    label: z.string().trim().max(80),
    durationSeconds: z.number().int().min(1).max(MAX_TIMER_SECONDS),
  }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("reset") }),
  z.object({ type: z.literal("add"), seconds: z.number().int().min(-MAX_TIMER_SECONDS).max(MAX_TIMER_SECONDS) }),
]);

export type TimerAction = z.infer<typeof timerActionSchema>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function isRunning(timer: ClassTimerState): boolean {
  return timer.endsAt !== null;
}

/** Whole seconds left at `nowMs`; rounds up so the display never shows 0:00 while time remains. */
export function remainingAt(timer: ClassTimerState, nowMs: number): number {
  if (timer.endsAt === null) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((Date.parse(timer.endsAt) - nowMs) / 1000));
}

/**
 * Pure state transition for teacher timer controls. The server applies it with its own clock,
 * so every student device counts down to the same `endsAt`.
 */
export function applyTimerAction(timer: ClassTimerState | undefined, action: TimerAction, nowMs: number): ClassTimerState {
  const current: ClassTimerState = timer ?? { label: "", durationSeconds: 0, endsAt: null, remainingSeconds: 0 };
  const left = remainingAt(current, nowMs);

  switch (action.type) {
    case "set":
      return { label: action.label, durationSeconds: action.durationSeconds, endsAt: null, remainingSeconds: action.durationSeconds };
    case "start": {
      if (isRunning(current) && left > 0) return current;
      // Starting a finished or never-started timer runs the full length again.
      const seconds = left > 0 ? left : current.durationSeconds;
      if (seconds <= 0) return current;
      return { ...current, endsAt: new Date(nowMs + seconds * 1000).toISOString(), remainingSeconds: seconds };
    }
    case "pause":
      return { ...current, endsAt: null, remainingSeconds: left };
    case "reset":
      return { ...current, endsAt: null, remainingSeconds: current.durationSeconds };
    case "add": {
      const next = clamp(left + action.seconds, 0, MAX_TIMER_SECONDS);
      if (isRunning(current) && left > 0) {
        return { ...current, endsAt: new Date(nowMs + next * 1000).toISOString(), remainingSeconds: next };
      }
      return { ...current, endsAt: null, remainingSeconds: next };
    }
  }
}

/** "12:05" or "1:02:05". */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
