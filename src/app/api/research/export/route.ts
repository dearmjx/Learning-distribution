import { DEMO_SCOPE } from "@/lib/context/learning-context";
import { listLearningEvents } from "@/lib/events/timeline";
import { buildSeparatedResearchExport } from "@/lib/research/export";

export function GET() {
  const events = listLearningEvents(DEMO_SCOPE.studentId);
  return Response.json(buildSeparatedResearchExport("participant-demo-01", DEMO_SCOPE.studentId, events));
}
