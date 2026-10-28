import type { AuthorshipIndicators, CerResponse } from "@/lib/domain/types";

type SegmentPart = { segment: string; isWordLike?: boolean };
type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: "word" | "grapheme" },
) => { segment(input: string): Iterable<SegmentPart> };

function segmenter(granularity: "word" | "grapheme"): InstanceType<SegmenterConstructor> | undefined {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
  return Segmenter ? new Segmenter("th", { granularity }) : undefined;
}

function normalizedWords(value: string): Set<string> {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("th-TH");
  const wordSegmenter = segmenter("word");
  const tokens = wordSegmenter
    ? Array.from(wordSegmenter.segment(normalized))
        .filter((part) => part.isWordLike !== false)
        .map((part) => part.segment)
    : normalized.split(/\s+/);

  return new Set(tokens.map((word) => word.replace(/[^\p{L}\p{M}\p{N}]/gu, "")).filter(Boolean));
}

function characterNgrams(value: string, size = 3): Set<string> {
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
  const graphemeSegmenter = segmenter("grapheme");
  const characters = graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(normalized), (part) => part.segment)
    : Array.from(normalized);
  if (!characters.length) return new Set();
  if (characters.length < size) return new Set([characters.join("")]);

  const ngrams = new Set<string>();
  for (let index = 0; index <= characters.length - size; index += 1) {
    ngrams.add(characters.slice(index, index + size).join(""));
  }
  return ngrams;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / new Set([...left, ...right]).size;
}

function similarity(a: string, b: string): number {
  // Thai-aware word overlap is the primary measure. Grapheme n-grams provide
  // a robust fallback for runtimes with limited segmentation support and for
  // spelling variants; this remains a teacher-only review signal.
  return Math.max(
    jaccard(normalizedWords(a), normalizedWords(b)),
    jaccard(characterNgrams(a), characterNgrams(b)),
  );
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
