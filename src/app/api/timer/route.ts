import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";

/** Students read their class countdown. `serverNow` lets each device correct for its own clock. */
export async function GET() {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "student" });
    const repository = await getLearningRepository(identity);
    const timer = (await repository.getClassTimer()) ?? null;
    return Response.json({ timer, serverNow: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
