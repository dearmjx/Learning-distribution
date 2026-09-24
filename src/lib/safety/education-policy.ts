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
  if (!request.approvedContext.trim() || !request.approvedContext.includes(request.activity.context)) {
    violations.push({ rule: "approved_context_only", message: "Coach context must include the approved activity context" });
  }
  if (request.currentAdiPhase !== request.activity.adiPhase) {
    violations.push({ rule: "approved_context_only", message: "ADI phase does not match the activity phase" });
  }
  return { allowed: violations.length === 0, violations };
}

export function validateStrictSocraticResponse(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  // 1. Must not be excessively long (exceeding ~150-200 words / 800 chars) to prevent writing the student's assignment
  if (normalized.length > 850) return false;

  // 2. Must not contain direct answer declarative conclusions
  const declarativeConclusions = [
    "สรุปได้ว่าคำตอบคือ",
    "คำตอบที่ถูกต้องคือ",
    "ข้อสรุปที่สมบูรณ์คือ",
    "คำตอบของข้อนี้คือ",
    "ดังนั้นคำตอบจึงเป็น",
  ];
  if (declarativeConclusions.some((phrase) => normalized.includes(phrase))) return false;

  // 3. Must contain question/inquiry markers
  return questionMarkers.some((marker) => normalized.toLowerCase().includes(marker));
}

export function isSocraticMessage(message: string): boolean {
  return validateStrictSocraticResponse(message);
}

export function fallbackCoachResponse(request: CoachRequest, reason: string): CoachResponse {
  const targetDimension = firstMissingDimension(request);
  const prompts: Record<RubricDimension, string> = {
    claim: "ลองตั้ง claim ของคุณเองจากบริบทที่ครูอนุมัติ: คุณคาดว่าจะเกิดการเปลี่ยนแปลงอะไร และเพราะอะไร?",
    evidence: "ลองเลือกหลักฐานหนึ่งส่วนจากบริบทกิจกรรม แล้วถามตัวเองว่าหลักฐานนั้นสนับสนุน claim อย่างไร?",
    reasoning: "ลองอธิบายกลไกที่เชื่อมหลักฐานกับ claim ของคุณ: สิ่งหนึ่งนำไปสู่อีกสิ่งหนึ่งได้อย่างไร?",
    selecting_info: "ลองเลือกสรรข้อมูลและตัวเลขที่เกี่ยวข้องโดยตรงจากสถานการณ์และตารางใน Phase 3 ดูสิครับว่ามีส่วนใดสนับสนุนข้อสรุปบ้าง?",
    connecting_info: "ลองอธิบายกลไกหรือความสัมพันธ์เชิงเหตุผลว่าเหตุการณ์หนึ่งส่งผลต่ออีกเหตุการณ์หนึ่งอย่างไร โดยอ้างอิงข้อมูลในบทเรียน?",
    reconstructing_language: "ลองเรียบเรียงและสังเคราะห์คำอธิบายใหม่ด้วยภาษาและความเข้าใจของตนเอง โดยไม่คัดลอกข้อความตรงๆ ได้อย่างไร?",
    direct_answering: "ลองตรวจสอบดูว่าข้อสรุปและเหตุผลของคุณตอบตรงประเด็นและสมเหตุสมผลตามคำถามนำการสืบเสาะหรือไม่?",
  };
  return {
    requestId: request.requestId,
    provider: "fallback",
    message: prompts[targetDimension] ?? prompts.reasoning,
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
