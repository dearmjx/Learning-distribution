import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";
import {
  buildSeparatedResearchExport,
  buildWideResearchDataset,
  formatResearchEvidenceCsv,
  formatResearchWideDatasetCsv,
} from "@/lib/research/export";
import type { AuthorshipIndicators } from "@/lib/domain/types";

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const mode = url.searchParams.get("mode"); // "wide" (SPSS/R dataset) or default "events" (raw evidence)
    const isWide = mode === "wide";
    const activityId = url.searchParams.get("activityId") ?? undefined;

    let events = await repository.listLearningEvents(undefined, activityId);
    const activityCycles = Object.fromEntries(
      (await repository.listActivities(identity.context.courseId)).map((activity) => [activity.id, activity.cycle]),
    );
    if (activityId) {
      events = events.filter((event) => event.activityId === activityId);
    }

    if (format === "csv") {
      if (isWide) {
        const submissions = await repository.listSubmissions(undefined, activityId);
        const revisions = (await Promise.all(submissions.map((s) => repository.listRevisions(s.id)))).flat();
        const peerReviews = (await Promise.all(submissions.map((s) => repository.listPeerReviews(s.id)))).flat();
        const teacherReviews = (await Promise.all(submissions.map((s) => repository.listTeacherReviews(s.id)))).flat();
        const reflections = await repository.listReflections(undefined, activityId);

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
        });

        const csv = formatResearchWideDatasetCsv(wideRecords);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="research-wide-dataset-spss-r.csv"',
            "Cache-Control": "no-store, private",
          },
        });
      }

      const csv = formatResearchEvidenceCsv(events);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="research-evidence-export.csv"',
          "Cache-Control": "no-store, private",
        },
      });
    }

    if (isWide) {
      const submissions = await repository.listSubmissions(undefined, activityId);
      const revisions = (await Promise.all(submissions.map((s) => repository.listRevisions(s.id)))).flat();
      const peerReviews = (await Promise.all(submissions.map((s) => repository.listPeerReviews(s.id)))).flat();
      const teacherReviews = (await Promise.all(submissions.map((s) => repository.listTeacherReviews(s.id)))).flat();
      const reflections = await repository.listReflections(undefined, activityId);

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
      });

      return Response.json(
        {
          datasetType: "SPSS_R_WideFormat_CAR",
          totalParticipants: wideRecords.length,
          records: wideRecords,
        },
        {
          headers: {
            "Cache-Control": "no-store, private",
          },
        },
      );
    }

    return Response.json(
      buildSeparatedResearchExport("class-scoped-export", "server-resolved", events),
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}


