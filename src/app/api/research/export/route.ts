import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository, getPersistenceMode } from "@/lib/repository/index";
import {
  buildSeparatedResearchExport,
  buildWideResearchDataset,
  formatResearchEvidenceCsv,
  formatResearchWideDatasetCsv,
} from "@/lib/research/export";
import type { AuthorshipIndicators } from "@/lib/domain/types";

const NO_STORE = { "Cache-Control": "no-store, private" };

/** Consent purpose the export is filtered by (must match consent_records.purpose). */
function consentPurpose(): string {
  return process.env.RESEARCH_CONSENT_PURPOSE ?? "classroom_action_research";
}

/**
 * Participant keys are an HMAC over the real ID. Real data (Supabase mode) must use
 * a configured secret; memory mode holds synthetic data and may use a dev default.
 */
function participantKeySecret(): string | null {
  const configured = process.env.RESEARCH_KEY_SECRET;
  if (configured && configured.length >= 16) return configured;
  return getPersistenceMode() === "memory" ? "memory-mode-synthetic-data-only" : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const identity = await resolveLearningIdentity({ requiredRole: "teacher", classId: url.searchParams.get("classId") ?? undefined });
    const repository = await getLearningRepository(identity);
    const format = url.searchParams.get("format") ?? "json";
    const isWide = url.searchParams.get("mode") === "wide"; // "wide" (SPSS/R dataset) or default raw events
    const activityId = url.searchParams.get("activityId") ?? undefined;

    const secret = participantKeySecret();
    if (!secret) {
      return Response.json(
        { error: "ยังไม่ได้ตั้งค่า RESEARCH_KEY_SECRET (อย่างน้อย 16 ตัวอักษร) จึงส่งออกข้อมูลวิจัยไม่ได้" },
        { status: 503, headers: NO_STORE },
      );
    }

    // LOS-015 B1: only students with current granted consent enter any research output.
    const consented = await repository.listConsentedStudentIds(consentPurpose());
    const allowed = (studentId: string) => consented === null || consented.includes(studentId);

    const events = (await repository.listLearningEvents(undefined, activityId)).filter(
      (event) => (!activityId || event.activityId === activityId) && allowed(event.studentId),
    );

    if (!isWide) {
      if (format === "csv") {
        return new Response(formatResearchEvidenceCsv(events), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="research-evidence-export.csv"',
            ...NO_STORE,
          },
        });
      }
      return Response.json(buildSeparatedResearchExport("class-scoped-export", "server-resolved", events), { headers: NO_STORE });
    }

    const activityCycles = Object.fromEntries(
      (await repository.listActivities(identity.context.courseId)).map((activity) => [activity.id, activity.cycle]),
    );
    const submissions = (await repository.listSubmissions(undefined, activityId)).filter((s) => allowed(s.studentId));
    const revisions = (await Promise.all(submissions.map((s) => repository.listRevisions(s.id)))).flat();
    const peerReviews = (await Promise.all(submissions.map((s) => repository.listPeerReviews(s.id)))).flat();
    const teacherReviews = (await Promise.all(submissions.map((s) => repository.listTeacherReviews(s.id)))).flat();
    const reflections = (await repository.listReflections(undefined, activityId)).filter((r) => allowed(r.studentId));

    const authorshipBySubmission: Record<string, AuthorshipIndicators | undefined> = {};
    for (const event of events) {
      if (event.eventType !== "authorship_indicator_created") continue;
      const subId = typeof event.payload.submissionId === "string" ? event.payload.submissionId : undefined;
      if (!subId) continue;
      const { submissionId: _s, ...indicators } = event.payload;
      authorshipBySubmission[subId] = indicators as unknown as AuthorshipIndicators;
    }

    const wideRecords = buildWideResearchDataset({
      submissions,
      revisions,
      events,
      peerReviews,
      teacherReviews,
      reflections,
      authorshipBySubmission,
      activityCycles,
      participantKeySecret: secret,
    });

    if (format === "csv") {
      return new Response(formatResearchWideDatasetCsv(wideRecords), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="research-wide-dataset-spss-r.csv"',
          ...NO_STORE,
        },
      });
    }
    return Response.json(
      {
        datasetType: "SPSS_R_WideFormat_CAR",
        consentFiltered: consented !== null,
        totalParticipants: wideRecords.length,
        records: wideRecords,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
