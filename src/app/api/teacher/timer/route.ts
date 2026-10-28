import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { applyTimerAction, timerActionSchema } from "@/lib/classroom/timer";
import { getLearningRepository } from "@/lib/repository/index";

const noStore = { "Cache-Control": "no-store, private" };

export async function GET() {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const timer = (await repository.getClassTimer()) ?? null;
    return Response.json({ timer, serverNow: new Date().toISOString() }, { headers: noStore });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** Teacher controls: set / start / pause / reset / add. The server clock decides `endsAt`. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400, headers: noStore });
  }
  const parsed = timerActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "ตั้งเวลาได้ 1 วินาทีถึง 4 ชั่วโมง และชื่อไม่เกิน 80 ตัวอักษร", details: parsed.error.flatten() }, { status: 400, headers: noStore });
  }

  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const current = await repository.getClassTimer();
    const now = Date.now();
    const next = applyTimerAction(current, parsed.data, now);
    const timer = await repository.saveClassTimer(next);
    return Response.json({ timer, serverNow: new Date(now).toISOString() }, { headers: noStore });
  } catch (error) {
    return authErrorResponse(error);
  }
}
