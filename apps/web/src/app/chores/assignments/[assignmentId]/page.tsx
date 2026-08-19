import Link from "next/link";
import { AssignmentDetail } from "./assignment-detail";

export default async function ChoreAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <main id="main-content" className="account-page" tabIndex={-1}>
      <section className="account-panel" aria-labelledby="assignment-page-title">
        <Link className="brand" href="/">Life Chat</Link>
        <div><p className="eyebrow">Chores</p><h1 id="assignment-page-title">Assignment</h1></div>
        <div aria-live="polite" aria-atomic="true"><AssignmentDetail assignmentId={assignmentId} /></div>
      </section>
    </main>
  </>;
}
