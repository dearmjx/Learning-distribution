/**
 * In-process sliding-window limiter for AI routes. One school server runs one
 * Node process, so per-process state is enough to protect a local LLM from a
 * classroom burst. It is not a distributed limiter.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const windows = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs = 60_000, now = Date.now()): RateLimitResult {
  const recent = (windows.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  windows.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function coachRateLimitPerMinute(): number {
  const configured = Number(process.env.COACH_RATE_LIMIT_PER_MINUTE);
  return Number.isInteger(configured) && configured > 0 ? configured : 6;
}

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: `ส่งคำถามถี่เกินไป กรุณารอประมาณ ${retryAfterSeconds} วินาทีแล้วลองใหม่`, code: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}

export function clearRateLimitsForTests(): void {
  windows.clear();
}
