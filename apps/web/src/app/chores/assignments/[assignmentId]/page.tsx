import { AssignmentDetail } from "./assignment-detail";
import { AuthenticatedShell } from "../../../authenticated-shell";

export default async function ChoreAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return <AuthenticatedShell current="chores"><section aria-labelledby="assignment-page-title"><p className="eyebrow">Chores</p><h1 id="assignment-page-title">Assignment</h1><div aria-live="polite" aria-atomic="true"><AssignmentDetail assignmentId={assignmentId} /></div></section></AuthenticatedShell>;
}
