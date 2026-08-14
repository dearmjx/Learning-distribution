import { createDemoStudentContext } from "@/lib/context/learning-context";
import { DeepSeekProvider } from "@/lib/ai/deepseek-provider";
import { LocalProvider } from "@/lib/ai/local-provider";
import { MockProvider } from "@/lib/ai/mock-provider";
import type { ChatMessage, LlmProvider } from "@/lib/ai/provider";
import { coachResponseSchema, parseCoachRequest } from "@/lib/domain/schemas";
import type {
  Activity,
  AnalyzeSubmissionInput,
  CoachRequest,
  CoachResponse,
  CerResponse,
  HintDepth,
  RubricDimension,
} from "@/lib/domain/types";
import { educationSafetyPolicy, fallbackCoachResponse } from "@/lib/safety/education-policy";

export const hintCosts: Record<HintDepth, number> = {
  none: 0,
  shallow: 1,
  concept: 2,
  deep: 3,
};

function providerFromEnvironment(): LlmProvider {
  const selected = (process.env.LEARNING_LLM_PROVIDER ?? "mock").toLowerCase();

  if (selected === "local") {
    return new LocalProvider(
      process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1",
      process.env.LOCAL_LLM_MODEL ?? "local-model",
    );
  }

  // DeepSeek is deliberately explicit opt-in. A key alone never changes the
  // default provider during the migration.
  if (selected === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    );
  }

  return new MockProvider();
}

function firstMissingDimension(response: CerResponse): RubricDimension {
  if (!response.claim.trim()) return "claim";
  if (!response.evidence.trim()) return "evidence";
  if (!response.reasoning.trim()) return "reasoning";
  return "reasoning";
}

function buildMessages(request: CoachRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "คุณคือ AI Coach วิชาชีววิทยา ม.4 ใช้คำถามแบบ Socratic เท่านั้น ห้ามเขียนคำตอบแทนนักเรียน ห้ามให้คะแนน ห้ามตัดสิน plagiarism และต้องอ้างอิงเฉพาะ approvedContext ที่ให้มา หากข้อมูลไม่พอให้บอกว่าไม่แน่ใจ ส่ง JSON ที่มี message เป็นคำถาม targetDimension และ citations เท่านั้น",
    },
    {
      role: "user",
      content: JSON.stringify({
        activity: request.activity.prompt,
        approvedContext: request.approvedContext,
        studentCer: request.cer,
        requestedHintDepth: request.hintDepth,
        missingDimension: firstMissingDimension(request.cer),
        currentAdiPhase: request.currentAdiPhase,
      }),
    },
  ];
}

function parseProviderFeedback(raw: string, fallbackDimension: RubricDimension): Pick<CoachResponse, "message" | "targetDimension" | "citations"> {
  try {
    const parsed = JSON.parse(raw) as Partial<CoachResponse>;
    return {
      message: typeof parsed.message === "string" ? parsed.message : "ลองอธิบายเหตุผลของคุณเพิ่มเติมจากหลักฐานในบทเรียน",
      targetDimension:
        parsed.targetDimension === "claim" || parsed.targetDimension === "evidence" || parsed.targetDimension === "reasoning"
          ? parsed.targetDimension
          : fallbackDimension,
      citations: Array.isArray(parsed.citations)
        ? parsed.citations.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return {
      message: "ลองอธิบายว่าหลักฐานของคุณเชื่อมโยงกับข้อสรุปอย่างไร โดยอ้างอิงข้อมูลในกิจกรรม?",
      targetDimension: fallbackDimension,
      citations: [],
    };
  }
}

export interface CoachOptions {
  context?: CoachRequest["context"];
  approvedContext?: string;
  provider?: LlmProvider;
  fallbackProvider?: LlmProvider;
}

export async function generateCoachFeedback(
  activity: Activity,
  input: AnalyzeSubmissionInput,
  options: CoachOptions = {},
): Promise<CoachResponse> {
  const request: CoachRequest = parseCoachRequest({
    requestId: input.requestId ?? crypto.randomUUID(),
    context: options.context ?? input.context ?? createDemoStudentContext(activity.id, input.requestId),
    activity,
    approvedContext: options.approvedContext ?? activity.context,
    cer: input.content,
    hintDepth: input.hintDepth,
    currentAdiPhase: activity.adiPhase,
  });

  const requestSafety = educationSafetyPolicy.validateCoachRequest(request);
  if (!requestSafety.allowed) {
    return fallbackCoachResponse(request, "request_blocked_by_education_policy");
  }

  const provider = options.provider ?? providerFromEnvironment();
  const fallbackProvider = options.fallbackProvider ?? new MockProvider();
  let raw: string;
  let fallbackUsed = false;
  let providerName: CoachResponse["provider"] = provider.name;

  try {
    raw = await provider.complete(buildMessages(request), { responseFormat: "json", maxTokens: 600 });
  } catch {
    fallbackUsed = true;
    providerName = "fallback";
    try {
      raw = await fallbackProvider.complete(buildMessages(request), { responseFormat: "json", maxTokens: 600 });
    } catch {
      return fallbackCoachResponse(request, "provider_and_fallback_failed");
    }
  }

  const parsed = parseProviderFeedback(raw, firstMissingDimension(input.content));
  const candidate = coachResponseSchema.parse({
    requestId: request.requestId,
    provider: providerName,
    ...parsed,
    hintDepth: input.hintDepth,
    hintCost: hintCosts[input.hintDepth],
    directAnswerBlocked: true,
    fallbackUsed,
    safetyFlags: ["no_direct_answer", "approved_context_only", "teacher_final_grader"],
  });
  return educationSafetyPolicy.enforceCoachResponse(request, candidate);
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachChatInput {
  activity: Activity;
  approvedContext: string;
  studentCer?: CerResponse;
  message: string;
  history?: ChatTurn[];
}

export interface CoachChatResult {
  message: string;
  provider: string;
  citations: string[];
  fallbackUsed: boolean;
  safetyFlags: string[];
}

export async function chatWithCoach(
  input: CoachChatInput,
  options: CoachOptions = {},
): Promise<CoachChatResult> {
  const provider = options.provider ?? providerFromEnvironment();
  const fallbackProvider = options.fallbackProvider ?? new MockProvider();

  const systemMessage: ChatMessage = {
    role: "system",
    content: `คุณคือ AI Coach วิชาชีววิทยา ม.4 หน่วยการเรียนรู้เรื่องระบบนิเวศ
กฎเหล็กในการตอบ:
1. ใช้การถามนำเชิง Socratic (ถามให้คิดต่อ ไม่เฉลยคำตอบตรงๆ)
2. อ้างอิงเฉพาะข้อมูลในบริบทที่ครูอนุมัติ: "${input.approvedContext}"
3. ห้ามเขียนข้อสรุปหรือคำตอบการบ้านให้นักเรียน
4. กระตุ้นให้นักเรียนเชื่อมโยงระหว่าง Claim, Evidence และ Reasoning
5. ตอบเป็นภาษาไทยที่อบอุ่น เป็นมิตร กระชับ และสร้างสรรค์`,
  };

  const cerContext = input.studentCer && (input.studentCer.claim || input.studentCer.evidence || input.studentCer.reasoning)
    ? `\n[งานที่นักเรียนกำลังเขียน - Claim: "${input.studentCer.claim}", Evidence: "${input.studentCer.evidence}", Reasoning: "${input.studentCer.reasoning}"]`
    : "";

  const messages: ChatMessage[] = [
    systemMessage,
    ...(input.history?.map((turn) => ({ role: turn.role, content: turn.content })) ?? []),
    {
      role: "user",
      content: `${input.message}${cerContext}`,
    },
  ];

  let reply = "";
  let providerName = provider.name;
  let fallbackUsed = false;

  try {
    reply = await provider.complete(messages, { maxTokens: 400 });
  } catch {
    fallbackUsed = true;
    providerName = "fallback";
    try {
      reply = await fallbackProvider.complete(messages, { maxTokens: 400 });
    } catch {
      reply = "ลองพิจารณาดูว่าข้อมูลในโจทย์หรือบทเรียนระบุถึงสิ่งนี้อย่างไรบ้างครับ?";
    }
  }

  // Clean any markdown wrapper or raw JSON if returned
  let cleaned = reply.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "").trim();
  if (!cleaned) {
    cleaned = "ลองอธิบายเพิ่มเติมว่าความคิดของคุณเชื่อมโยงกับสิ่งที่เกิดขึ้นในระบบนิเวศอย่างไรบ้างครับ?";
  }

  return {
    message: cleaned,
    provider: providerName,
    citations: [input.activity.title, "บริบทกิจกรรมที่ครูอนุมัติ"],
    fallbackUsed,
    safetyFlags: ["socratic_deep_dive", "no_direct_answer", "approved_context_only"],
  };
}

export { providerFromEnvironment };

