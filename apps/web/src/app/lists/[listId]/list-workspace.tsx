"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { SharedListApiResponse } from "../../../lib/shared-list-api";

type LoadState = { kind: "loading" } | { kind: "signed-out" } | { kind: "error" } | { kind: "ready"; data: SharedListApiResponse };

export function ListWorkspace({ listId }: { listId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/lists/${encodeURIComponent(listId)}`, { cache: "no-store" });
      if (response.status === 401) return setState({ kind: "signed-out" });
      if (!response.ok) return setState({ kind: "error" });
      setState({ kind: "ready", data: await response.json() as SharedListApiResponse });
    } catch { setState({ kind: "error" }); }
  }, [listId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (label.trim().length === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/lists/${encodeURIComponent(listId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, commandId: crypto.randomUUID() }) });
      if (!response.ok) throw new Error("add failed");
      setLabel("");
      setNotice("Item added.");
      await load();
    } catch { setNotice("The item could not be added. Check your access and try again."); }
    finally { setSaving(false); }
  }

  if (state.kind === "loading") return <section className="shell-card" role="status"><p>Loading list…</p></section>;
  if (state.kind === "signed-out") return <section className="shell-card empty-state"><h1>Sign in to view this list</h1><Link className="primary-button inline-button" href="/sign-in">Sign in</Link></section>;
  if (state.kind === "error") return <section className="shell-card" role="alert"><h1>List unavailable</h1><p>It may not exist, may belong to another household, or may no longer be available.</p><Link href="/lists">Return to lists</Link></section>;

  return <section aria-labelledby="list-title">
    <p className="eyebrow">Shared list</p><h1 id="list-title">{state.data.title}</h1>
    {state.data.canManage ? <form className="quick-entry" onSubmit={submit} aria-label="Add an item">
      <div className="field-group"><label htmlFor="new-item-label">Add an item</label><input id="new-item-label" value={label} maxLength={200} disabled={saving} onChange={(event) => setLabel(event.target.value)} placeholder="Buy fruit" required /></div>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Adding…" : "Add item"}</button>
    </form> : <p className="calm-note">You can view this list. An adult can add or change items.</p>}
    <div aria-live="polite" aria-atomic="true">{notice === null ? null : <p className={notice.startsWith("Item added") ? "form-success" : "form-error"}>{notice}</p>}</div>
    {state.data.items.length === 0 ? <div className="shell-card empty-state"><h2>This list is empty</h2><p>Add only what is useful. You can come back anytime.</p></div> : <ol className="list-items">{state.data.items.map((item) => <li key={item.id} className={item.state === "completed" ? "is-complete" : undefined}><span>{item.label}</span>{item.assignedToActiveMember ? <small>Assigned to you</small> : null}{item.state === "completed" ? <small>Completed</small> : null}</li>)}</ol>}
  </section>;
}
