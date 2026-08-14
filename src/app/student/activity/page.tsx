import { ecosystemActivities } from "@/data/course/ecosystem/activities";
import { StudentWorkbench } from "@/components/student-workbench";

export default function StudentActivityPage() {
  return <StudentWorkbench initialActivityId={ecosystemActivities[0]?.id} />;
}
