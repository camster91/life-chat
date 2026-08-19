"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChoreAssignmentApiResponse } from "../../../../lib/chore-assignment-api";

export function AssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<ChoreAssignmentApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/chores/assignments/${encodeURIComponent(assignmentId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Sign in to view this assignment." : "This assignment is not available to the active member.");
        setAssignment(await response.json() as ChoreAssignmentApiResponse);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "The assignment could not be loaded.");
      });
    return () => controller.abort();
  }, [assignmentId]);

  if (error !== null) return <div className="shell-card" role="alert"><h2>Assignment unavailable</h2><p>{error}</p><Link href="/today">Return to Today</Link></div>;
  if (assignment === null) return <div className="shell-card" role="status"><p>Loading assignment…</p></div>;
  return <article className="shell-card assignment-detail">
    <p className="eyebrow">Chore</p>
    <h2>{assignment.title}</h2>
    <dl><div><dt>Status</dt><dd>{assignment.state === "completed" ? "Completed" : "Assigned"}</dd></div>{assignment.dueDate === null ? null : <div><dt>Due</dt><dd>{assignment.dueDate}</dd></div>}</dl>
    {assignment.state === "assigned" && assignment.canComplete ? <button className="primary-button" type="button" disabled={completing} aria-busy={completing} onClick={async () => {
      setCompleting(true);
      setError(null);
      try {
        const response = await fetch(`/api/chores/assignments/${encodeURIComponent(assignment.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandId: crypto.randomUUID() }) });
        if (!response.ok) throw new Error("The assignment could not be completed. Reload and try again.");
        setAssignment(await response.json() as ChoreAssignmentApiResponse);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The assignment could not be completed.");
      } finally {
        setCompleting(false);
      }
    }}>{completing ? "Completing…" : "Mark complete"}</button> : null}
    {assignment.state === "assigned" && !assignment.canComplete ? <p>You can view this assignment, but your current role cannot complete it.</p> : null}
    <Link href="/today">Back to Today</Link>
  </article>;
}
