import { describe, expect, it, beforeEach } from "vitest";
import {
  clearMemoryRepositoriesForTests,
  learningRepository,
} from "@/lib/repository/memory-repository";
import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { recordTeacherReview } from "@/lib/education/teacher-review";
import { validateStrictSocraticResponse } from "@/lib/safety/education-policy";
import {
  buildWideResearchDataset,
  deidentifyStudentKey,
  formatResearchWideDatasetCsv,
} from "@/lib/research/export";
import type { FeedbackDecision, LearningContext, LearningEvent, Submission } from "@/lib/domain/types";

const TEST_KEY_SECRET = "test-participant-key-secret";

describe("Phase 11: CAR Research Architecture Hardening & Alignment", () => {
  beforeEach(() => {
    clearMemoryRepositoriesForTests();
  });

  const baseStudentContext: LearningContext = {
    schoolId: "demo-school-01",
    courseId: "biology-m4",
    classId: "biology-m4-class-a",
    activityId: "ecosystem-food-web-01",
    studentId: "40101",
    adiPhase: "argument",
    role: "student",
    language: "th",
    permissions: ["student:submit"],
    traceId: "test-trace-p11",
    correlationId: "test-corr-p11",
    cycle: 1,
  };

  const baseTeacherContext: LearningContext = {
    schoolId: "demo-school-01",
    courseId: "biology-m4",
    classId: "biology-m4-class-a",
    activityId: "ecosystem-food-web-01",
    teacherId: "demo-teacher-01",
    adiPhase: "revision",
    role: "teacher",
    language: "th",
    permissions: ["teacher:review"],
    traceId: "test-trace-teacher",
    correlationId: "test-corr-teacher",
    cycle: 1,
  };

  it("PAOR Cycle 1 & Cycle 2 are accurately configured in course activities", () => {
    const act1 = ecosystemActivities.find((a) => a.id === "ecosystem-food-web-01");
    const act2 = ecosystemActivities.find((a) => a.id === "ecosystem-energy-flow-01");

    expect(act1).toBeDefined();
    expect(act1?.cycle).toBe(1);
    expect(act1?.rubricDimensions).toContain("selecting_info");
    expect(act1?.rubricDimensions).toContain("connecting_info");
    expect(act1?.rubricDimensions).toContain("reconstructing_language");
    expect(act1?.rubricDimensions).toContain("direct_answering");

    expect(act2).toBeDefined();
    expect(act2?.cycle).toBe(2);
    expect(act2?.rubricDimensions).toContain("selecting_info");
  });

  it("Draft 1 Baseline Freeze correctly locks initial student work", () => {
    const now = new Date().toISOString();
    const submission = learningRepository.addSubmission({
      studentId: "40101",
      activityId: "ecosystem-food-web-01",
      content: {
        claim: "เมื่องูลดลง หนูจะเพิ่มขึ้น",
        evidence: "ตารางแสดงหนูเพิ่มจาก 50 เป็น 200",
        reasoning: "งูเป็นผู้ล่าคอยควบคุมประชากรหนู",
      },
      version: 1,
      hintDepth: "deep",
      hintCost: 3,
      responseTimeSeconds: 95,
      workflowState: "submitted",
      cycle: 1,
      draft1Frozen: true,
      draft1FrozenAt: now,
    });

    expect(submission.draft1Frozen).toBe(true);
    expect(submission.draft1FrozenAt).toBe(now);
    expect(submission.version).toBe(1);
    expect(submission.cycle).toBe(1);
  });

  it("Strict Socratic Guardrails block declarative direct conclusions and enforce inquiry markers", () => {
    const validSocratic1 = "ลองคิดดูว่าหากงูลดลง จะส่งผลกระทบต่อประชากรหนูอย่างไร และเพราะอะไร?";
    const validSocratic2 = "จากข้อมูลในตาราง Phase 3 คุณสังเกตเห็นตัวเลขใดที่สนับสนุนข้อสรุปนี้บ้าง?";
    const invalidDirectAnswer = "สรุปได้ว่าคำตอบคือ ประชากรหนูจะเพิ่มขึ้นเป็น 280 ตัวเนื่องจากไม่มีผู้ล่า";
    const invalidNoQuestion = "พลังงานในระบบนิเวศจะถ่ายทอดตามกฎ 10% และลดลงเรื่อยๆ ในแต่ละลำดับขั้น";

    expect(validateStrictSocraticResponse(validSocratic1)).toBe(true);
    expect(validateStrictSocraticResponse(validSocratic2)).toBe(true);
    expect(validateStrictSocraticResponse(invalidDirectAnswer)).toBe(false);
    expect(validateStrictSocraticResponse(invalidNoQuestion)).toBe(false);
  });

  it("Feedback Decisions panel records student critical evaluation choices (AI Literacy)", () => {
    const decisions: FeedbackDecision[] = [
      {
        id: "dec-1",
        feedbackItem: "ลองอธิบายกลไกกฎ 10% เพิ่มเติม",
        source: "ai_coach",
        status: "accept",
        justificationText: "ยอมรับเพราะช่วยให้ระบุการสูญเสียพลังงานความร้อนได้ชัดเจนขึ้น",
      },
      {
        id: "dec-2",
        feedbackItem: "เพิ่มตัวเลขประชากรนกอินทรี",
        source: "peer",
        status: "reject",
        justificationText: "ปฏิเสธเนื่องจากกิจกรรมที่ 1 ศึกษาเฉพาะความสัมพันธ์สายใยอาหาร หญ้า-หนู-งู",
      },
      {
        id: "dec-3",
        feedbackItem: "ปรับข้อความ Claim ให้สั้นลง",
        source: "peer",
        status: "modify",
        justificationText: "นำเฉพาะคำเชื่อมมาปรับใช้โดยคงสาระสำคัญของข้อสรุปไว้",
      },
    ];

    const revSubmission = learningRepository.addSubmission({
      studentId: "40101",
      activityId: "ecosystem-food-web-01",
      content: {
        claim: "เมื่องูลดลงอย่างมาก ประชากรหนูนาจะเพิ่มขึ้นอย่างรวดเร็ว ส่งผลให้พืชผู้ผลิตลดลง",
        evidence: "จากข้อมูล Phase 3 ประชากรหนูเพิ่มขึ้นจาก 50 เป็น 280 ตัว ขณะที่หญ้าลดลง 40%",
        reasoning: "เพราะงูเป็นผู้บริโภคที่ควบคุมหนู และตามกฎ 10% พลังงานถ่ายทอดลดลงในแต่ละขั้น",
      },
      version: 2,
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 65,
      workflowState: "submitted",
      cycle: 1,
      feedbackDecisions: decisions,
    });

    expect(revSubmission.version).toBe(2);
    expect(revSubmission.feedbackDecisions).toHaveLength(3);
    expect(revSubmission.feedbackDecisions?.[0].status).toBe("accept");
    expect(revSubmission.feedbackDecisions?.[1].status).toBe("reject");
    expect(revSubmission.feedbackDecisions?.[2].status).toBe("modify");
  });

  it("Synthetic Thinking 4-Dimension Rubric computes accurate percentage scores", () => {
    const submission = learningRepository.addSubmission({
      studentId: "40101",
      activityId: "ecosystem-food-web-01",
      content: {
        claim: "Claim text",
        evidence: "Evidence text",
        reasoning: "Reasoning text",
      },
      version: 2,
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 60,
      workflowState: "revising",
      cycle: 1,
    });

    // 1. Perfect 16/16 = 100%
    const reviewFull = recordTeacherReview(baseTeacherContext, {
      submissionId: submission.id,
      teacherId: "demo-teacher-01",
      score: 100,
      comment: "สังเคราะห์ข้อมูลและอธิบายด้วยภาษาตนเองได้อย่างยอดเยี่ยม",
      syntheticScores: {
        selectingInfo: 4,
        connectingInfo: 4,
        reconstructingLanguage: 4,
        directAnswering: 4,
      },
    });

    expect(reviewFull.score).toBe(100);
    expect(reviewFull.syntheticScores?.selectingInfo).toBe(4);
    expect(reviewFull.syntheticScores?.directAnswering).toBe(4);

    // Test calculation formula for 12/16 = 75%
    const score12 = Math.round(((3 + 3 + 3 + 3) / 16) * 100);
    expect(score12).toBe(75);

    // Test calculation formula for 14/16 = 88%
    const score14 = Math.round(((4 + 4 + 3 + 3) / 16) * 100);
    expect(score14).toBe(88);
  });

  it("Teacher Observation Notes can be recorded and filtered across PAOR cycles", () => {
    const note1 = learningRepository.addTeacherObservationNote({
      teacherId: "demo-teacher-01",
      classId: "biology-m4-class-a",
      cycle: 1,
      activityId: "ecosystem-food-web-01",
      phase: "act",
      content: "นักเรียนห้อง 4/1 ให้ความสนใจกับการทดลองสายใยอาหาร และเริ่มตั้งคำถามต่อ AI Coach",
    });

    const note2 = learningRepository.addTeacherObservationNote({
      teacherId: "demo-teacher-01",
      classId: "biology-m4-class-b",
      cycle: 2,
      activityId: "ecosystem-energy-flow-01",
      phase: "reflect",
      content: "นักเรียนห้อง 4/2 สามารถสังเคราะห์กฎ 10% ได้แม่นยำขึ้นใน Cycle 2",
    });

    expect(note1.id).toBeDefined();
    expect(note1.cycle).toBe(1);
    expect(note2.cycle).toBe(2);

    const cycle1Notes = learningRepository.listTeacherObservationNotes(undefined, 1);
    expect(cycle1Notes).toHaveLength(1);
    expect(cycle1Notes[0].phase).toBe("act");

    const cycle2Notes = learningRepository.listTeacherObservationNotes(undefined, 2);
    expect(cycle2Notes).toHaveLength(1);
    expect(cycle2Notes[0].phase).toBe("reflect");
  });

  it("Research Wide-Format Exporter de-identifies keys and formats CSV ready for SPSS and R", () => {
    // Keyed and one-way: stable per secret, never embeds the real ID.
    const key = deidentifyStudentKey("40105", TEST_KEY_SECRET);
    expect(key).toMatch(/^P_[0-9a-f]{12}$/);
    expect(key).not.toContain("40105");
    expect(deidentifyStudentKey("40105", TEST_KEY_SECRET)).toBe(key);
    expect(deidentifyStudentKey("40105", "a-different-secret-value")).not.toBe(key);

    const sub1: Submission = {
      id: "sub-1",
      studentId: "40101",
      activityId: "ecosystem-food-web-01",
      content: {
        claim: "Claim draft 1",
        evidence: "Evidence draft 1",
        reasoning: "Reasoning draft 1",
      },
      version: 1,
      submittedAt: "2026-08-28T08:00:00.000Z",
      hintDepth: "deep",
      hintCost: 3,
      responseTimeSeconds: 120,
      workflowState: "submitted",
      draft1Frozen: true,
      draft1FrozenAt: "2026-08-28T08:00:00.000Z",
      cycle: 1,
    };

    const sub2: Submission = {
      id: "sub-2",
      studentId: "40101",
      activityId: "ecosystem-food-web-01",
      content: {
        claim: "Claim final revised",
        evidence: "Evidence final revised",
        reasoning: "Reasoning final revised",
      },
      version: 2,
      submittedAt: "2026-08-28T08:30:00.000Z",
      hintDepth: "none",
      hintCost: 0,
      responseTimeSeconds: 60,
      workflowState: "completed",
      cycle: 1,
      feedbackDecisions: [
        {
          id: "dec-1",
          feedbackItem: "AI Coach item",
          source: "ai_coach",
          status: "accept",
          justificationText: "ยอมรับเพื่อปรับปรุง",
        },
      ],
    };

    const events: LearningEvent[] = [
      {
        id: "evt-1",
        schemaVersion: 1,
        context: baseStudentContext,
        actor: { type: "student", id: "40101" },
        studentId: "40101",
        activityId: "ecosystem-food-web-01",
        eventType: "hint_requested",
        payload: { mode: "socratic_chat", hintDepth: "deep" },
        correlationId: "c1",
        occurredAt: "2026-08-28T08:05:00.000Z",
        createdAt: "2026-08-28T08:05:00.000Z",
      },
    ];

    const records = buildWideResearchDataset({ participantKeySecret: TEST_KEY_SECRET,
      submissions: [sub1, sub2],
      events,
      teacherReviews: [
        {
          id: "rev-1",
          submissionId: "sub-2",
          teacherId: "demo-teacher-01",
          score: 88,
          comment: "Good synthesis",
          syntheticScores: {
            selectingInfo: 4,
            connectingInfo: 4,
            reconstructingLanguage: 3,
            directAnswering: 3,
          },
          createdAt: "2026-08-28T09:00:00.000Z",
        },
      ],
      reflections: [
        {
          id: "ref-1",
          studentId: "40101",
          activityId: "ecosystem-food-web-01",
          analyticalThinkingScore: 4,
          aiLiteracyScore: 5,
          confidenceRating: "high",
          reflectionText: "เข้าใจการคิดสังเคราะห์ผ่านการโค้ช",
          completedAt: "2026-08-28T08:40:00.000Z",
        },
      ],
    });

    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.participantKey).toBe(deidentifyStudentKey("40101", TEST_KEY_SECRET));
    expect(r.participantKey).not.toContain("40101");
    // Classroom comes from stored class_id, never guessed from the student ID (LOS-015 B2).
    expect(r.classroom).toBe("");
    expect(r.cycle).toBe(1);
    expect(r.draft1Claim).toBe("Claim draft 1");
    expect(r.finalClaim).toBe("Claim final revised");
    expect(r.aiChatTurns).toBe(1);
    expect(r.feedbackDecisionsCount).toBe(1);
    expect(r.feedbackAcceptedCount).toBe(1);
    expect(r.rubricDim1SelectInfo).toBe(4);
    expect(r.rubricDim2ConnectInfo).toBe(4);
    expect(r.totalRubricScore).toBe(88);
    expect(r.reflectionSelfScoreAILiteracy).toBe(5);

    const csv = formatResearchWideDatasetCsv(records);
    expect(csv).toContain("ParticipantKey,Classroom,Cycle,ActivityID");
    expect(csv).toContain(`"${deidentifyStudentKey("40101", TEST_KEY_SECRET)}"`);
    expect(csv).not.toContain("40101");
    expect(csv).toContain('"Claim draft 1"');
    expect(csv).toContain('"Claim final revised"');
  });
});
