import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository, getPersistenceMode } from "@/lib/repository/index";

export async function GET() {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "student" });
    const repository = await getLearningRepository(identity);
    return Response.json({
      activities: await repository.listActivities(identity.context.courseId),
      persistence: getPersistenceMode(),
      session: {
        studentId: identity.context.studentId ?? null,
        classId: identity.context.classId,
        courseId: identity.context.courseId,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
