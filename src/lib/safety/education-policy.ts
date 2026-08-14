import type { CoachRequest, CoachResponse, RubricDimension } from "@/lib/domain/types";

export const EDUCATION_SAFETY_RULES = [
  "no_direct_answer",
  "no_writing_student_work",
  "no_cross_student_access",
  "approved_context_only",
  "no_ai_grading",
  "peer_review_help_requires_activity_consent",
] as const;

export type EducationSafetyRule = (typeof EDUCATION_SAFETY_RULES)[number];

export interface EducationSafetyResult {
  allowed: boolean;
  violations: Array<{ rule: EducationSafetyRule; message: string }>;
}

const questionMarkers = ["?", "อย่างไร", "เพราะอะไร", "อะไรจะเกิดขึ้น", "ลองอธิบาย", "how", "why", "what"];

function firstMissingDimension(request: CoachRequest): RubricDimension {
  if (!request.cer.claim.trim()) return "claim";
  if (!request.cer.evidence.trim()) return "evidence";
  if (!request.cer.reasoning.trim()) return "reasoning";
  return "reasoning";
}

export function evaluateCoachRequest(request: CoachRequest): EducationSafetyResult {
  const violations: EducationSafetyResult["violations"] = [];
  if (request.context.role !== "student" || !request.context.studentId) {
    violations.push({ rule: "no_cross_student_access", message: "A Coach request must have one authenticated student scope" });
  }
  if (request.context.activityId !== request.activity.id) {
    violations.push({ rule: "approved_context_only", message: "Activity scope does not match the Coach request" });
  }
  if (!request.approvedContext.trim() || request.approvedContext !== request.activity.context) {
    violations.push({ rule: "approved_context_only", message: "Coach context must come from the approved activity context" });
  }
  if (request.currentAdiPhase !== request.activity.adiPhase) {
    violations.push({ rule: "approved_context_only", message: "ADI phase does not match the activity phase" });
  }
  return { allowed: violations.length === 0, violations };
}

export function isSocraticMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return questionMarkers.some((marker) => normalized.includes(marker));
}

export function fallbackCoachResponse(request: CoachRequest, reason: string): CoachResponse {
  const targetDimension = firstMissingDimension(request);
  const prompts: Record<RubricDimension, string> = {
    claim: "ลองตั้ง claim ของคุณเองจากบริบทที่ครูอนุมัติ: คุณคาดว่าจะเกิดการเปลี่ยนแปลงอะไร และเพราะอะไร?",
    evidence: "ลองเลือกหลักฐานหนึ่งส่วนจากบริบทกิจกรรม แล้วถามตัวเองว่าหลักฐานนั้นสนับสนุน claim อย่างไร?",
    reasoning: "ลองอธิบายกลไกที่เชื่อมหลักฐานกับ claim ของคุณ: สิ่งหนึ่งนำไปสู่อีกสิ่งหนึ่งได้อย่างไร?",
  };
  return {
    requestId: request.requestId,
    provider: "fallback",
    message: prompts[targetDimension],
    targetDimension,
    hintDepth: request.hintDepth,
    hintCost: request.hintDepth === "none" ? 0 : request.hintDepth === "shallow" ? 1 : request.hintDepth === "concept" ? 2 : 3,
    citations: ["บริบทกิจกรรมที่ครูอนุมัติ"],
    directAnswerBlocked: true,
    fallbackUsed: true,
    safetyFlags: ["no_direct_answer", "approved_context_only", reason],
  };
}

export function enforceCoachResponse(request: CoachRequest, response: CoachResponse): CoachResponse {
  const safetyFlags = new Set(["no_direct_answer", "no_writing_student_work", "no_ai_grading", ...response.safetyFlags]);
  const citations = response.citations.filter((citation) =>
    citation.includes("กิจกรรม") || citation.includes("approved") || request.approvedContext.includes(citation),
  );
  if (!isSocraticMessage(response.message)) {
    return fallbackCoachResponse(request, "provider_output_not_socratic");
  }
  return {
    ...response,
    message: response.message.trim(),
    citations: citations.length > 0 ? citations : ["บริบทกิจกรรมที่ครูอนุมัติ"],
    directAnswerBlocked: true,
    safetyFlags: [...safetyFlags],
  };
}

export class EducationSafetyPolicy {
  validateCoachRequest(request: CoachRequest): EducationSafetyResult {
    return evaluateCoachRequest(request);
  }

  enforceCoachResponse(request: CoachRequest, response: CoachResponse): CoachResponse {
    return enforceCoachResponse(request, response);
  }

  fallback(request: CoachRequest, reason: string): CoachResponse {
    return fallbackCoachResponse(request, reason);
  }

  canAssistPeerReview(activityPeerReviewAllowed: boolean): boolean {
    return activityPeerReviewAllowed;
  }
}

export const educationSafetyPolicy = new EducationSafetyPolicy();
