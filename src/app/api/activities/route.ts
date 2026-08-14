import { ecosystemActivities } from "@/data/course/ecosystem/activities";

export function GET() {
  return Response.json({ activities: ecosystemActivities });
}
