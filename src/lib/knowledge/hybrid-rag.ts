import { approvedKnowledgeChunks } from "@/data/course/knowledge-base";
import type {
  KnowledgeChunk,
  KnowledgeScope,
  RetrievedKnowledgeChunk,
} from "@/lib/knowledge/types";

const DEFAULT_TOP_K = 3;
const DEFAULT_RRF_K = 60;
const DEFAULT_DENSE_WEIGHT = 0.65;
const DEFAULT_SPARSE_WEIGHT = 0.35;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

export interface DenseSearchHit {
  id: string;
  score: number;
}

/**
 * Optional adapter for a real embedding/vector service.
 *
 * The MVP works without this adapter using Thai-aware BM25. A production
 * adapter can implement this port with pgvector, Ollama embeddings, or an
 * external embedding service without changing the Coach or API routes.
 */
export interface DenseKnowledgeRetriever {
  search(query: string, candidates: readonly KnowledgeChunk[]): Promise<readonly DenseSearchHit[]>;
}

export interface HybridRagOptions {
  chunks?: readonly KnowledgeChunk[];
  topK?: number;
  rrfK?: number;
  denseWeight?: number;
  sparseWeight?: number;
  denseRetriever?: DenseKnowledgeRetriever;
}

export function tokenizeThai(text: string): string[] {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("th-TH");
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: "word" },
    ) => {
      segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
    };
  };
  const Segmenter = IntlWithSegmenter.Segmenter;

  // Thai vowels and tone marks are combining characters, so keep Unicode
  // marks (\p{M}) together with letters and numbers.
  const clean = (token: string): string => token.replace(/[^\p{L}\p{M}\p{N}]+/gu, "");

  if (Segmenter) {
    const segmenter = new Segmenter(["th", "en"], { granularity: "word" });
    return Array.from(segmenter.segment(normalized))
      .filter((part) => part.isWordLike !== false)
      .map((part) => clean(part.segment))
      .filter(Boolean);
  }

  // Fallback for runtimes without Intl.Segmenter. This is less accurate for
  // Thai, but still handles English and whitespace-delimited content.
  return normalized.match(/[\p{L}\p{M}\p{N}]+/gu)?.map(clean).filter(Boolean) ?? [];
}

function appliesToScope(chunk: KnowledgeChunk, scope: KnowledgeScope): boolean {
  if (!chunk.approved || chunk.courseId !== scope.courseId) return false;
  if (scope.chapterId && chunk.chapterId !== scope.chapterId) return false;
  if (chunk.activityIds && !chunk.activityIds.includes(scope.activityId)) return false;
  // If an activity has no chapterId (for example an older Supabase row), do
  // not expose chapter-global chunks. An explicit activity mapping is the
  // only safe fallback until the activity is migrated with a chapterId.
  if (!scope.chapterId && !chunk.activityIds?.includes(scope.activityId)) return false;
  return true;
}

function searchableText(chunk: KnowledgeChunk): string {
  // Repeating the title gives headings a small BM25 boost without adding a
  // separate hard-coded scoring rule for any particular subject.
  return [
    chunk.title,
    chunk.title,
    chunk.text,
    ...(chunk.keywords ?? []),
  ].join(" ");
}

function sparseRank(
  query: string,
  candidates: readonly KnowledgeChunk[],
): Array<{ chunk: KnowledgeChunk; score: number }> {
  const queryTerms = tokenizeThai(query);
  if (queryTerms.length === 0 || candidates.length === 0) return [];

  const documents = candidates.map((chunk) => ({
    chunk,
    tokens: tokenizeThai(searchableText(chunk)),
  }));
  const averageLength = documents.reduce((sum, document) => sum + document.tokens.length, 0) / documents.length;
  const documentFrequency = new Map<string, number>();

  for (const document of documents) {
    for (const term of new Set(document.tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const queryFrequency = new Map<string, number>();
  for (const term of queryTerms) queryFrequency.set(term, (queryFrequency.get(term) ?? 0) + 1);

  return documents
    .map(({ chunk, tokens }) => {
      const termFrequency = new Map<string, number>();
      for (const token of tokens) termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);

      const score = Array.from(queryFrequency.entries()).reduce((sum, [term, queryTermFrequency]) => {
        const tf = termFrequency.get(term) ?? 0;
        if (tf === 0) return sum;
        const df = documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
        const lengthNorm = 1 - BM25_B + BM25_B * (tokens.length / Math.max(averageLength, 1));
        const termScore = idf * ((tf * (BM25_K1 + 1)) / (tf + BM25_K1 * lengthNorm));
        return sum + termScore * Math.min(queryTermFrequency, 2);
      }, 0);

      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
}

function citationForChunk(chunk: KnowledgeChunk): string {
  return [
    `บท: ${chunk.chapterTitle}`,
    `แหล่งที่มา: ${chunk.sourceTitle}`,
    chunk.contentVersion ? `รุ่นเนื้อหา: ${chunk.contentVersion}` : "",
    chunk.sourceSection ? `ส่วน: ${chunk.sourceSection}` : "",
    chunk.sourcePage ? `หน้า: ${chunk.sourcePage}` : "",
  ].filter(Boolean).join(" · ");
}

/** Return a human-readable, stable citation label for a retrieved chunk. */
export function formatKnowledgeCitation(chunk: KnowledgeChunk): string {
  return citationForChunk(chunk);
}

/**
 * Retrieve only approved content that belongs to the requested course,
 * chapter, and activity. Without a dense adapter this is a deterministic
 * Thai-aware BM25 search; with one, sparse and dense ranks are fused with RRF.
 */
export async function retrieveKnowledge(
  query: string,
  scope: KnowledgeScope,
  options: HybridRagOptions = {},
): Promise<RetrievedKnowledgeChunk[]> {
  const topK = Math.max(1, options.topK ?? DEFAULT_TOP_K);
  const candidates = (options.chunks ?? approvedKnowledgeChunks).filter((chunk) => appliesToScope(chunk, scope));
  const sparse = sparseRank(query, candidates);

  if (!options.denseRetriever) {
    return sparse.slice(0, topK).map(({ chunk, score }, index) => ({
      ...chunk,
      sparseScore: score,
      fusedScore: score,
      rank: index + 1,
    }));
  }

  let denseHits: readonly DenseSearchHit[] = [];
  try {
    denseHits = await options.denseRetriever.search(query, candidates);
  } catch {
    // Sparse retrieval remains a safe fallback when the vector service is
    // unavailable. The caller still receives approved, scoped content.
    denseHits = [];
  }

  const sparseRanks = new Map(sparse.map(({ chunk }, index) => [chunk.id, index + 1]));
  const denseRanks = new Map<string, number>();
  const denseScores = new Map<string, number>();
  for (const [index, hit] of denseHits.entries()) {
    if (!candidates.some((candidate) => candidate.id === hit.id)) continue;
    if (!denseRanks.has(hit.id)) denseRanks.set(hit.id, index + 1);
    denseScores.set(hit.id, hit.score);
  }

  const chunksById = new Map(candidates.map((chunk) => [chunk.id, chunk]));
  const fused = new Set([...sparseRanks.keys(), ...denseRanks.keys()]);
  const denseWeight = options.denseWeight ?? DEFAULT_DENSE_WEIGHT;
  const sparseWeight = options.sparseWeight ?? DEFAULT_SPARSE_WEIGHT;
  const rrfK = options.rrfK ?? DEFAULT_RRF_K;

  return Array.from(fused)
    .map((id) => {
      const chunk = chunksById.get(id)!;
      const sparseRank = sparseRanks.get(id);
      const denseRank = denseRanks.get(id);
      const fusedScore =
        (sparseRank ? sparseWeight / (rrfK + sparseRank) : 0) +
        (denseRank ? denseWeight / (rrfK + denseRank) : 0);
      return {
        ...chunk,
        sparseScore: sparse.find((item) => item.chunk.id === id)?.score ?? 0,
        denseScore: denseScores.get(id),
        fusedScore,
        rank: 0,
      };
    })
    .sort((a, b) => b.fusedScore - a.fusedScore || a.id.localeCompare(b.id))
    .slice(0, topK)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function formatApprovedContext(
  activityTitle: string,
  activityContext: string,
  chunks: readonly KnowledgeChunk[],
): string {
  const retrievedSections = chunks.map((chunk) =>
    [
      "[APPROVED_SOURCE]",
      citationForChunk(chunk),
      chunk.text,
    ].join("\n"),
  );

  return [
    "[APPROVED_ACTIVITY_CONTEXT]",
    `กิจกรรม: ${activityTitle}`,
    activityContext,
    ...retrievedSections,
  ].join("\n\n");
}
