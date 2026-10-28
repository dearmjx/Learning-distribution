import { ecosystemRagEvaluationCases, type RagEvaluationCase } from "@/data/course/ecosystem/rag-evaluation-cases";
import { retrieveKnowledge } from "@/lib/knowledge/hybrid-rag";
import type { DenseKnowledgeRetriever } from "@/lib/knowledge/hybrid-rag";

export interface RagEvaluationCaseResult {
  caseId: string;
  expectedChunkIds: string[];
  retrievedChunkIds: string[];
  reciprocalRank: number;
  passed: boolean;
  scopeLeak: boolean;
}

export interface RagEvaluationReport {
  topK: number;
  recallAtK: number;
  meanReciprocalRank: number;
  scopeLeaks: number;
  cases: RagEvaluationCaseResult[];
}

export async function evaluateKnowledgeRetrieval(options: {
  cases?: readonly RagEvaluationCase[];
  topK?: number;
  denseRetriever?: DenseKnowledgeRetriever;
} = {}): Promise<RagEvaluationReport> {
  const topK = Math.max(1, options.topK ?? 3);
  const cases = options.cases ?? ecosystemRagEvaluationCases;
  const results: RagEvaluationCaseResult[] = [];

  for (const testCase of cases) {
    const chunks = await retrieveKnowledge(testCase.query, testCase.scope, {
      topK,
      ...(options.denseRetriever ? { denseRetriever: options.denseRetriever } : {}),
    });
    const retrievedChunkIds = chunks.map((chunk) => chunk.id);
    const expectedSet = new Set(testCase.expectedChunkIds);
    const scopeLeak = chunks.some((chunk) =>
      !chunk.approved ||
      chunk.courseId !== testCase.scope.courseId ||
      Boolean(testCase.scope.chapterId && chunk.chapterId !== testCase.scope.chapterId) ||
      Boolean(chunk.activityIds && !chunk.activityIds.includes(testCase.scope.activityId)),
    );
    const rank = retrievedChunkIds.findIndex((id) => expectedSet.has(id));
    const reciprocalRank = rank < 0 ? 0 : 1 / (rank + 1);
    const passed = testCase.expectedChunkIds.length === 0
      ? retrievedChunkIds.length === 0
      : rank >= 0;

    results.push({ caseId: testCase.id, expectedChunkIds: testCase.expectedChunkIds, retrievedChunkIds, reciprocalRank, passed: passed && !scopeLeak, scopeLeak });
  }

  const expectedCases = results.filter((result) => result.expectedChunkIds.length > 0);
  return {
    topK,
    recallAtK: expectedCases.length ? expectedCases.filter((result) => result.reciprocalRank > 0).length / expectedCases.length : 1,
    meanReciprocalRank: expectedCases.length ? expectedCases.reduce((sum, result) => sum + result.reciprocalRank, 0) / expectedCases.length : 1,
    scopeLeaks: results.filter((result) => result.scopeLeak).length,
    cases: results,
  };
}
