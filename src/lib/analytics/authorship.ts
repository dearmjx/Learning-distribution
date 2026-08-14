import type { AuthorshipIndicators, CerResponse } from "@/lib/domain/types";

function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1),
  );
}

function similarity(a: string, b: string): number {
  const left = normalizedWords(a);
  const right = normalizedWords(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / new Set([...left, ...right]).size;
}

export function buildAuthorshipIndicators(
  prompt: string,
  response: CerResponse,
  revisionCount: number,
  responseTimeSeconds: number,
  followUpResponseQuality?: number,
): AuthorshipIndicators {
  const combined = `${response.claim} ${response.evidence} ${response.reasoning}`;
  const copySimilarityToPrompt = similarity(prompt, combined);
  const reasons: string[] = [];

  if (responseTimeSeconds > 0 && responseTimeSeconds < 15) reasons.push("ตอบเร็วมาก ควรดูร่วมกับหลักฐานอื่น");
  if (copySimilarityToPrompt >= 0.75) reasons.push("ถ้อยคำซ้ำกับโจทย์ในระดับสูง");
  if (followUpResponseQuality !== undefined && followUpResponseQuality < 0.4) reasons.push("ควรตรวจความเข้าใจจากคำตอบ follow-up");

  return {
    revisionCount,
    responseTimeSeconds,
    copySimilarityToPrompt: Number(copySimilarityToPrompt.toFixed(3)),
    followUpResponseQuality,
    status: reasons.length >= 2 ? "teacher_review" : reasons.length === 1 ? "observe" : "none",
    teacherReviewOnly: true,
    reasons,
  };
}
