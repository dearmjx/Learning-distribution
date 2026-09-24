import type {
  AuthorshipIndicators,
  FeedbackDecision,
  LearningEvent,
  PaorCycle,
  PeerReview,
  Revision,
  StudentReflectionData,
  Submission,
  TeacherReview,
} from "@/lib/domain/types";

export interface SeparatedResearchExport {
  identity: {
    participantKey: string;
    studentId: string;
  };
  evidence: Array<{
    eventId: string;
    eventType: LearningEvent["eventType"];
    activityId: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }>;
}

/** Missing values are `null` and export as blank cells; never impute research data. */
export interface ResearchParticipantRecord {
  participantKey: string;
  classroom: string;
  cycle: PaorCycle | null;
  activityId: string;
  draft1Claim: string;
  draft1Evidence: string;
  draft1Reasoning: string;
  draft1FrozenAt: string;
  aiChatTurns: number;
  aiOpponentTurns: number;
  aiChatTotalTokens: number | null;
  aiChatHintCost: number;
  aiChatProvider: string;
  feedbackDecisionsCount: number;
  feedbackAcceptedCount: number;
  feedbackRejectedCount: number;
  feedbackModifiedCount: number;
  peerReviewGivenScore: number | null;
  peerReviewReceivedScore: number | null;
  finalClaim: string;
  finalEvidence: string;
  finalReasoning: string;
  finalSubmittedAt: string;
  teacherReviewed: boolean;
  teacherCerClaim: number | null;
  teacherCerEvidence: number | null;
  teacherCerReasoning: number | null;
  rubricDim1SelectInfo: number | null;
  rubricDim2ConnectInfo: number | null;
  rubricDim3OwnLanguage: number | null;
  rubricDim4DirectAnswer: number | null;
  totalRubricScore: number | null;
  reflectionSelfScoreAnalytical: number | null;
  reflectionSelfScoreAILiteracy: number | null;
  reflectionConfidence: string;
  reflectionText: string;
  authorshipStatus: string;
  authorshipResponseTimeSec: number | null;
  authorshipCopySimilarity: number | null;
  startTimestamp: string;
  endTimestamp: string;
  totalDurationMinutes: number;
}

export interface BuildWideDatasetOptions {
  submissions: Submission[];
  revisions?: Revision[];
  events: LearningEvent[];
  peerReviews?: PeerReview[];
  teacherReviews?: TeacherReview[];
  reflections?: StudentReflectionData[];
  /** Source of truth for PAOR cycle when a submission does not carry one. */
  activityCycles?: Record<string, PaorCycle | undefined>;
  authorshipBySubmission?: Record<string, AuthorshipIndicators | undefined>;
}

/** Generates de-identified participant key (e.g. M41_01, M42_05) */
export function deidentifyStudentKey(studentId: string, classId?: string): string {
  // If studentId has numeric format like 40105 or 40212
  const match = studentId.match(/(\d+)/);
  if (match) {
    const num = match[1];
    if (num.startsWith("401")) return `M41_${num.slice(3).padStart(2, "0") || "01"}`;
    if (num.startsWith("402")) return `M42_${num.slice(3).padStart(2, "0") || "01"}`;
    return `PARTICIPANT_${num.padStart(3, "0")}`;
  }
  // FNV-1a 32-bit: stable and collision-resistant enough for class-sized cohorts.
  let hash = 0x811c9dc5;
  for (const char of studentId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const classPrefix = classId?.includes("4-2") || classId?.includes("class-b") ? "M42" : "M41";
  return `${classPrefix}_${hash.toString(16).padStart(8, "0")}`;
}

export function buildWideResearchDataset(options: BuildWideDatasetOptions): ResearchParticipantRecord[] {
  const {
    submissions,
    events,
    peerReviews = [],
    teacherReviews = [],
    reflections = [],
    authorshipBySubmission = {},
    activityCycles = {},
  } = options;

  // Group by student + activity
  const studentActivityPairs = new Set<string>();
  for (const s of submissions) studentActivityPairs.add(`${s.studentId}:::${s.activityId}`);
  for (const e of events) {
    if (e.studentId && e.actor.type === "student") studentActivityPairs.add(`${e.studentId}:::${e.activityId}`);
  }

  const records: ResearchParticipantRecord[] = [];

  for (const pair of studentActivityPairs) {
    const [studentId, activityId] = pair.split(":::");
    if (!studentId || !activityId || studentId === "demo-teacher-01" || studentId === "teacher") continue;

    const studentSubs = submissions.filter((s) => s.studentId === studentId && s.activityId === activityId).sort((a, b) => a.version - b.version);
    const draft1 = studentSubs[0];
    const finalDraft = studentSubs[studentSubs.length - 1] ?? draft1;

    const studentEvents = events.filter((e) => e.studentId === studentId && e.activityId === activityId).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    const chatEvents = studentEvents.filter((e) => e.eventType === "hint_requested" && e.payload.mode === "socratic_chat");
    const opponentEvents = studentEvents.filter((e) => e.eventType === "hint_requested" && e.payload.mode === "opponent_challenge");
    const aiFeedbackEvents = studentEvents.filter((e) => e.eventType === "ai_feedback_received");

    const feedbackDecisions: FeedbackDecision[] = finalDraft?.feedbackDecisions ?? [];
    const acceptedCount = feedbackDecisions.filter((d) => d.status === "accept").length;
    const rejectedCount = feedbackDecisions.filter((d) => d.status === "reject").length;
    const modifiedCount = feedbackDecisions.filter((d) => d.status === "modify").length;

    const givenPeerReview = peerReviews.find((pr) => pr.reviewerStudentId === studentId);
    const receivedPeerReview = peerReviews.find((pr) => pr.authorStudentId === studentId);

    const givenScore = givenPeerReview?.scores ? Math.round(((givenPeerReview.scores.claim + givenPeerReview.scores.evidence + givenPeerReview.scores.reasoning) / 15) * 100) : null;
    const receivedScore = receivedPeerReview?.scores ? Math.round(((receivedPeerReview.scores.claim + receivedPeerReview.scores.evidence + receivedPeerReview.scores.reasoning) / 15) * 100) : null;

    const review = finalDraft ? teacherReviews.find((r) => r.submissionId === finalDraft.id) : undefined;
    // D-012: CER and synthetic thinking are separate instruments; never derive one from the other.
    const synth = review?.syntheticScores;
    const synthTotal = synth
      ? Math.round(((synth.selectingInfo + synth.connectingInfo + synth.reconstructingLanguage + synth.directAnswering) / 16) * 100)
      : null;

    const reflection = reflections.find((r) => r.studentId === studentId && r.activityId === activityId);
    const authorship = finalDraft ? authorshipBySubmission[finalDraft.id] : undefined;

    const start = studentEvents[0]?.occurredAt ?? draft1?.submittedAt ?? new Date().toISOString();
    const end = studentEvents[studentEvents.length - 1]?.occurredAt ?? finalDraft?.submittedAt ?? start;
    const durationMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
    const durationMin = Number((durationMs / 60000).toFixed(1));

    const classroomName = studentId.includes("402") || studentId.includes("4-2") ? "M.4/2" : "M.4/1";
    const cycle: PaorCycle | null = finalDraft?.cycle ?? draft1?.cycle ?? activityCycles[activityId] ?? null;
    const chatTokens = aiFeedbackEvents.reduce<number | null>((sum, e) => {
      const tokens = typeof e.payload.totalTokens === "number" ? e.payload.totalTokens : null;
      return tokens === null ? sum : (sum ?? 0) + tokens;
    }, null);

    records.push({
      participantKey: deidentifyStudentKey(studentId, classroomName),
      classroom: classroomName,
      cycle,
      activityId,
      draft1Claim: draft1?.content?.claim ?? "",
      draft1Evidence: draft1?.content?.evidence ?? "",
      draft1Reasoning: draft1?.content?.reasoning ?? "",
      draft1FrozenAt: draft1?.draft1FrozenAt ?? draft1?.submittedAt ?? "",
      aiChatTurns: chatEvents.length,
      aiOpponentTurns: opponentEvents.length,
      aiChatTotalTokens: chatTokens,
      aiChatHintCost: draft1?.hintCost ?? 0,
      aiChatProvider: typeof aiFeedbackEvents[0]?.payload?.provider === "string" ? aiFeedbackEvents[0].payload.provider : "",
      feedbackDecisionsCount: feedbackDecisions.length,
      feedbackAcceptedCount: acceptedCount,
      feedbackRejectedCount: rejectedCount,
      feedbackModifiedCount: modifiedCount,
      peerReviewGivenScore: givenScore,
      peerReviewReceivedScore: receivedScore,
      finalClaim: finalDraft?.content?.claim ?? draft1?.content?.claim ?? "",
      finalEvidence: finalDraft?.content?.evidence ?? draft1?.content?.evidence ?? "",
      finalReasoning: finalDraft?.content?.reasoning ?? draft1?.content?.reasoning ?? "",
      finalSubmittedAt: finalDraft?.submittedAt ?? "",
      teacherReviewed: Boolean(review),
      teacherCerClaim: review?.rubricScores?.claim ?? null,
      teacherCerEvidence: review?.rubricScores?.evidence ?? null,
      teacherCerReasoning: review?.rubricScores?.reasoning ?? null,
      rubricDim1SelectInfo: synth?.selectingInfo ?? null,
      rubricDim2ConnectInfo: synth?.connectingInfo ?? null,
      rubricDim3OwnLanguage: synth?.reconstructingLanguage ?? null,
      rubricDim4DirectAnswer: synth?.directAnswering ?? null,
      totalRubricScore: synthTotal,
      reflectionSelfScoreAnalytical: reflection?.analyticalThinkingScore ?? null,
      reflectionSelfScoreAILiteracy: reflection?.aiLiteracyScore ?? null,
      reflectionConfidence: reflection?.confidenceRating ?? "",
      reflectionText: reflection?.reflectionText ?? reflection?.conceptualLearning ?? "",
      authorshipStatus: authorship?.status ?? "none",
      authorshipResponseTimeSec: finalDraft?.responseTimeSeconds ?? null,
      authorshipCopySimilarity: authorship?.copySimilarityToPrompt ?? null,
      startTimestamp: start,
      endTimestamp: end,
      totalDurationMinutes: durationMin,
    });
  }

  return records;
}

/** Formats wide-format participant records into an SPSS/R compatible CSV string */
export function formatResearchWideDatasetCsv(records: ResearchParticipantRecord[]): string {
  const headers = [
    "ParticipantKey",
    "Classroom",
    "Cycle",
    "ActivityID",
    "Draft1_Claim",
    "Draft1_Evidence",
    "Draft1_Reasoning",
    "Draft1_FrozenAt",
    "AIChat_Turns",
    "AIOpponent_Turns",
    "AIChat_TotalTokens",
    "AIChat_HintCost",
    "AIChat_Provider",
    "Feedback_Decisions_Count",
    "Feedback_Accepted_Count",
    "Feedback_Rejected_Count",
    "Feedback_Modified_Count",
    "PeerReview_GivenScore",
    "PeerReview_ReceivedScore",
    "Final_Claim",
    "Final_Evidence",
    "Final_Reasoning",
    "Final_SubmittedAt",
    "Teacher_Reviewed",
    "Teacher_CER_Claim",
    "Teacher_CER_Evidence",
    "Teacher_CER_Reasoning",
    "Rubric_Dim1_SelectInfo",
    "Rubric_Dim2_ConnectInfo",
    "Rubric_Dim3_OwnLanguage",
    "Rubric_Dim4_DirectAnswer",
    "TotalRubricScore",
    "Reflection_SelfScore_Analytical",
    "Reflection_SelfScore_AILiteracy",
    "Reflection_Confidence",
    "Reflection_Text",
    "Authorship_Status",
    "Authorship_ResponseTimeSec",
    "Authorship_CopySimilarity",
    "StartTimestamp",
    "EndTimestamp",
    "TotalDurationMinutes",
  ];

  const escapeCsv = (str: unknown) => `"${String(str ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

  const num = (value: number | null) => (value === null ? "" : value);

  const rows = records.map((r) =>
    [
      escapeCsv(r.participantKey),
      escapeCsv(r.classroom),
      num(r.cycle),
      escapeCsv(r.activityId),
      escapeCsv(r.draft1Claim),
      escapeCsv(r.draft1Evidence),
      escapeCsv(r.draft1Reasoning),
      escapeCsv(r.draft1FrozenAt),
      r.aiChatTurns,
      r.aiOpponentTurns,
      num(r.aiChatTotalTokens),
      r.aiChatHintCost,
      escapeCsv(r.aiChatProvider),
      r.feedbackDecisionsCount,
      r.feedbackAcceptedCount,
      r.feedbackRejectedCount,
      r.feedbackModifiedCount,
      num(r.peerReviewGivenScore),
      num(r.peerReviewReceivedScore),
      escapeCsv(r.finalClaim),
      escapeCsv(r.finalEvidence),
      escapeCsv(r.finalReasoning),
      escapeCsv(r.finalSubmittedAt),
      r.teacherReviewed ? 1 : 0,
      num(r.teacherCerClaim),
      num(r.teacherCerEvidence),
      num(r.teacherCerReasoning),
      num(r.rubricDim1SelectInfo),
      num(r.rubricDim2ConnectInfo),
      num(r.rubricDim3OwnLanguage),
      num(r.rubricDim4DirectAnswer),
      num(r.totalRubricScore),
      num(r.reflectionSelfScoreAnalytical),
      num(r.reflectionSelfScoreAILiteracy),
      escapeCsv(r.reflectionConfidence),
      escapeCsv(r.reflectionText),
      escapeCsv(r.authorshipStatus),
      num(r.authorshipResponseTimeSec),
      num(r.authorshipCopySimilarity),
      escapeCsv(r.startTimestamp),
      escapeCsv(r.endTimestamp),
      r.totalDurationMinutes,
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/** Keeps the identity map separate from the evidence rows used for research export. */
export function buildSeparatedResearchExport(
  participantKey: string,
  studentId: string,
  events: LearningEvent[],
): SeparatedResearchExport {
  return {
    identity: { participantKey, studentId },
    evidence: events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      activityId: event.activityId,
      payload: event.payload,
      occurredAt: event.occurredAt,
    })),
  };
}

/** Formats de-identified research events into a CSV string. */
export function formatResearchEvidenceCsv(events: LearningEvent[]): string {
  const header = ["eventId", "eventType", "activityId", "occurredAt", "actorType", "payloadJson"];
  const rows = events.map((event) => {
    const payloadStr = JSON.stringify(event.payload).replace(/"/g, '""');
    return [
      `"${event.id}"`,
      `"${event.eventType}"`,
      `"${event.activityId}"`,
      `"${event.occurredAt}"`,
      `"${event.actor?.type ?? "system"}"`,
      `"${payloadStr}"`,
    ].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}


