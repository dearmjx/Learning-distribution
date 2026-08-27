import type { LearningContext, LearningRole } from "@/lib/domain/types";
import {
  createLocalDevelopmentContext,
  createLearningContext,
  DEMO_SCOPE,
} from "@/lib/context/learning-context";
import { getPersistenceMode } from "@/lib/repository/index";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class LearningAuthError extends Error {
  readonly status: 401 | 403 | 503;

  constructor(message: string, status: 401 | 403 | 503 = 401) {
    super(message);
    this.name = "LearningAuthError";
    this.status = status;
  }
}

export interface ResolvedLearningIdentity {
  context: LearningContext;
  authUserId?: string;
  profileId?: string;
}

type RequiredRole = Extract<LearningRole, "student" | "teacher" | "researcher">;

interface ResolveOptions {
  activityId?: string;
  requiredRole?: RequiredRole;
}

function localIdentity(options: ResolveOptions): ResolvedLearningIdentity {
  const requiredRole = options.requiredRole ?? "student";
  const configuredRole = process.env.LEARNING_LOCAL_ROLE as RequiredRole | undefined;
  if (configuredRole && configuredRole !== requiredRole) {
    throw new LearningAuthError("Local development identity does not have the required role", 403);
  }
  const configuredClassId = process.env.LEARNING_LOCAL_CLASS_ID;
  if (configuredClassId && configuredClassId !== DEMO_SCOPE.classId) {
    throw new LearningAuthError("Local development class scope is not configured", 403);
  }
  const context = createLocalDevelopmentContext(requiredRole === "researcher" ? "teacher" : requiredRole, options.activityId);
  return {
    context: requiredRole === "researcher" ? { ...context, role: "researcher", permissions: ["research:export"] } : context,
  };
}

/**
 * Resolves auth.uid() -> learning profile -> active class membership. Browser
 * supplied student/class/teacher IDs are intentionally absent from this API.
 */
export async function resolveLearningIdentity(options: ResolveOptions = {}): Promise<ResolvedLearningIdentity> {
  if (getPersistenceMode() === "memory") return localIdentity(options);

  const client = await getSupabaseServerClient();
  if (!client) {
    throw new LearningAuthError("Supabase persistence is configured but its public URL/key is missing", 503);
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new LearningAuthError("Supabase authentication is required", 401);
  }

  const { data: profile, error: profileError } = await client
    .from("learning_profiles")
    .select("id, external_id, role, school_id, course_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    throw new LearningAuthError("Authenticated user has no Learning OS profile", 403);
  }

  const { data: memberships, error: membershipError } = await client
    .from("memberships")
    .select("class_id, role, status")
    .eq("profile_id", profile.id)
    .eq("status", "active");
  if (membershipError || !memberships?.length) {
    throw new LearningAuthError("Authenticated user has no active class membership", 403);
  }

  const requiredRole = options.requiredRole;
  const membership = memberships.find((item) => !requiredRole || item.role === requiredRole);
  if (!membership) {
    throw new LearningAuthError("Authenticated user is not authorized for this Learning OS operation", 403);
  }

  if (options.activityId) {
    const { data: assignment, error: assignmentError } = await client
      .from("activity_assignments")
      .select("activity_id, enabled")
      .eq("class_id", membership.class_id)
      .eq("activity_id", options.activityId)
      .eq("enabled", true)
      .maybeSingle();
    if (assignmentError || !assignment) {
      throw new LearningAuthError("Activity is not assigned to the authenticated class", 403);
    }
  }

  const { data: classRow, error: classError } = await client
    .from("classes")
    .select("id, school_id, course_id")
    .eq("id", membership.class_id)
    .maybeSingle();
  if (classError || !classRow) {
    throw new LearningAuthError("Authenticated class scope could not be resolved", 403);
  }

  const role = membership.role as RequiredRole;
  const context = createLearningContext({
    schoolId: classRow.school_id,
    courseId: classRow.course_id,
    classId: classRow.id,
    ...(options.activityId ? { activityId: options.activityId } : {}),
    ...(role === "student" ? { studentId: profile.external_id } : { teacherId: profile.external_id }),
    role,
    permissions: role === "student" ? ["activity:submit", "timeline:self"] : ["class:review"],
  });

  return { context, authUserId: authData.user.id, profileId: profile.id };
}

export function assertRequestedStudentMatchesContext(context: LearningContext, requestedStudentId?: string): void {
  if (context.role !== "student" || !context.studentId) {
    throw new LearningAuthError("A student identity is required for this operation", 403);
  }
  if (requestedStudentId && requestedStudentId !== context.studentId) {
    throw new LearningAuthError("Student identity is controlled by the authenticated session", 403);
  }
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof LearningAuthError) {
    return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ error: "Learning identity could not be resolved" }, { status: 500 });
}

export function isLocalDevelopmentPersistence(): boolean {
  return getPersistenceMode() === "memory" && (process.env.NODE_ENV !== "production" || process.env.LEARNING_ALLOW_MEMORY_PRODUCTION === "true");
}

export const LOCAL_DEMO_IDENTITY = DEMO_SCOPE;
