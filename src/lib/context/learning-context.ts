import type { AdiPhase, LearningContext, LearningLanguage, LearningRole } from "@/lib/domain/types";
import { learningContextSchema } from "@/lib/domain/schemas";

export const DEMO_SCOPE = {
  schoolId: "demo-school-01",
  courseId: "biology-m4",
  classId: "biology-m4-class-a",
  studentId: "demo-student-01",
  teacherId: "demo-teacher-01",
} as const;

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export interface LearningContextInput {
  activityId?: string;
  studentId?: string;
  teacherId?: string;
  adiPhase?: AdiPhase;
  role?: LearningRole;
  language?: LearningLanguage;
  permissions?: string[];
  traceId?: string;
  correlationId?: string;
}

export function createLearningContext(input: LearningContextInput = {}): LearningContext {
  const role = input.role ?? (input.teacherId ? "teacher" : "student");
  const context: LearningContext = {
    schoolId: DEMO_SCOPE.schoolId,
    courseId: DEMO_SCOPE.courseId,
    classId: DEMO_SCOPE.classId,
    ...(input.activityId ? { activityId: input.activityId } : {}),
    ...(input.studentId ? { studentId: input.studentId } : {}),
    ...(input.teacherId ? { teacherId: input.teacherId } : {}),
    adiPhase: input.adiPhase ?? "argument",
    role,
    language: input.language ?? "th",
    permissions: input.permissions ?? (role === "teacher" ? ["class:review"] : ["activity:submit", "timeline:self"]),
    traceId: input.traceId ?? id("trace"),
    correlationId: input.correlationId ?? id("corr"),
  };

  return learningContextSchema.parse(context);
}

export function createDemoStudentContext(activityId: string, correlationId?: string): LearningContext {
  return createLearningContext({
    activityId,
    studentId: DEMO_SCOPE.studentId,
    role: "student",
    correlationId,
  });
}

export function createDemoTeacherContext(activityId?: string, correlationId?: string): LearningContext {
  return createLearningContext({
    ...(activityId ? { activityId } : {}),
    teacherId: DEMO_SCOPE.teacherId,
    role: "teacher",
    correlationId,
  });
}

export function assertStudentScope(context: LearningContext, requestedStudentId: string): void {
  if (context.role !== "student" || context.studentId !== requestedStudentId) {
    throw new Error("Learning scope denied: student data is restricted to the authenticated student");
  }
}
