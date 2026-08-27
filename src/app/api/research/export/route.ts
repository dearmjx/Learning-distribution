import { authErrorResponse, resolveLearningIdentity } from "@/lib/auth/supabase-identity";
import { getLearningRepository } from "@/lib/repository/index";
import { buildSeparatedResearchExport, formatResearchEvidenceCsv } from "@/lib/research/export";

export async function GET(request: Request) {
  try {
    const identity = await resolveLearningIdentity({ requiredRole: "teacher" });
    const repository = await getLearningRepository(identity);
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const activityId = url.searchParams.get("activityId") ?? undefined;

    let events = await repository.listLearningEvents(undefined, activityId);
    if (activityId) {
      events = events.filter((event) => event.activityId === activityId);
    }

    // The identity map is intentionally not read by this browser-facing
    // evidence endpoint. Mapping access belongs to a separately approved job.
    if (format === "csv") {
      const csv = formatResearchEvidenceCsv(events);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="research-evidence-export.csv"',
          "Cache-Control": "no-store, private",
        },
      });
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

