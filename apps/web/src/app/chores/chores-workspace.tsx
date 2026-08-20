"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ChoreWorkspaceApiResponse } from "@/lib/chores-api";
import { useActiveShellContext } from "../authenticated-shell";

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: ChoreWorkspaceApiResponse };

export function ChoresWorkspace() {
  const context = useActiveShellContext();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [assigneeMemberId, setAssigneeMemberId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/chores", { cache: "no-store" });
      const body = await response.json() as ChoreWorkspaceApiResponse | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Chores could not be loaded.");
      setState({ kind: "ready", data: body });
      setAssigneeMemberId((current) => current || body.members[0]?.id || "");
    } catch (caught: unknown) { setState({ kind: "error", message: caught instanceof Error ? caught.message : "Chores could not be loaded." }); }
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [context.memberId, load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length === 0 || assigneeMemberId === "") return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/chores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, assigneeMemberId, dueDate: dueDate || null, commandId: crypto.randomUUID() }) });
      if (!response.ok) throw new Error();
      setTitle(""); setDueDate(""); setNotice("Chore assigned."); await load();
    } catch { setNotice("The chore could not be assigned. Check the details and try again."); }
    finally { setSaving(false); }
  };

  if (state.kind === "loading") return <div className="shell-card" role="status"><p>Loading chores…</p></div>;
  if (state.kind === "error") return <div className="shell-card" role="alert"><h2>Chores unavailable</h2><p>{state.message}</p><button className="secondary-button" type="button" onClick={() => void load()}>Try again</button></div>;
  const { data } = state;
  return <section aria-labelledby="chores-title">
    <p className="eyebrow">Chores</p>
    <h1 id="chores-title">Small tasks, clearly assigned</h1>
    <p>{data.canManage ? "Create a chore for an active household member. Completion stays with the assigned person." : "Only chores assigned to you appear here."}</p>
    {data.canManage ? <form className="chore-entry shell-card" onSubmit={submit} aria-label="Assign a chore">
      <h2>Assign a chore</h2><label className="field-group"><span>Chore</span><input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="Set the dinner table" required /></label><label className="field-group"><span>Assigned to</span><select value={assigneeMemberId} onChange={(event) => setAssigneeMemberId(event.target.value)} required>{data.members.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.role}</option>)}</select></label><label className="field-group"><span>Due date (optional)</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><button className="primary-button inline-button" type="submit" disabled={saving} aria-busy={saving}>{saving ? "Assigning…" : "Assign chore"}</button>
    </form> : null}
    {notice === null ? null : <p className={notice === "Chore assigned." ? "form-success" : "form-error"} role={notice === "Chore assigned." ? "status" : "alert"}>{notice}</p>}
    {data.assignments.length === 0 ? <div className="shell-card empty-state"><h2>No chores yet</h2><p>{data.canManage ? "Assign one useful task to get started." : "An adult can assign a chore when there is something to do."}</p></div> : <ol className="chore-list">{data.assignments.map((assignment) => <li key={assignment.id}><div><span>{assignment.state === "assigned" ? "Assigned" : "Completed"}</span><h2>{assignment.title}</h2><p>{assignment.assigneeName === null ? null : `${assignment.assigneeName} · `}{assignment.dueDate === null ? "No due date" : `Due ${assignment.dueDate}`}</p></div><Link className="secondary-button compact-button" href={assignment.deepLink}>Open</Link></li>)}</ol>}
  </section>;
}
