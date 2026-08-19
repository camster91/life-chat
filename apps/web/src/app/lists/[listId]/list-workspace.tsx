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
  const [completion, setCompletion] = useState<{ itemId: string; expectedVersion: number; commandId: string } | null>(null);

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

  async function confirmCompletion() {
    if (completion === null) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(completion.itemId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandId: completion.commandId, expectedVersion: completion.expectedVersion }),
      });
      if (!response.ok) {
        const conflict = response.status === 409;
        if (conflict) {
          setCompletion(null);
          await load();
        }
        throw new Error(conflict ? "conflict" : "complete failed");
      }
      setCompletion(null);
      setNotice("Item completed.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error && error.message === "conflict" ? "The item changed, so the list was refreshed. Review it before trying again." : "The item was not completed. You can safely try again or cancel.");
    } finally { setSaving(false); }
  }

  if (state.kind === "loading") return <section className="shell-card" role="status"><p>Loading list…</p></section>;
  if (state.kind === "signed-out") return <section className="shell-card empty-state"><h1>Sign in to view this list</h1><Link className="primary-button inline-button" href="/sign-in">Sign in</Link></section>;
  if (state.kind === "error") return <section className="shell-card" role="alert"><h1>List unavailable</h1><p>It may not exist, may belong to another household, or may no longer be available.</p><Link href="/lists">Return to lists</Link></section>;

  return <section aria-labelledby="list-title">
    <p className="eyebrow">Shared list</p><h1 id="list-title">{state.data.title}</h1>
    {state.data.canManage ? <form className="quick-entry" onSubmit={submit} aria-label="Add an item">
      <div className="field-group"><label htmlFor="new-item-label">Add an item</label><input id="new-item-label" value={label} maxLength={200} disabled={saving} onChange={(event) => setLabel(event.target.value)} placeholder="Buy fruit" required /></div>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Adding…" : "Add item"}</button>
    </form> : <p className="calm-note">You can view this list and mark open items complete. An adult can add or edit items.</p>}
    <div aria-live="polite" aria-atomic="true">{notice === null ? null : <p className={notice.startsWith("Item added") || notice.startsWith("Item completed") ? "form-success" : "form-error"}>{notice}</p>}</div>
    {state.data.items.length === 0 ? <div className="shell-card empty-state"><h2>This list is empty</h2><p>Add only what is useful. You can come back anytime.</p></div> : <ol className="list-items">{state.data.items.map((item) => <li key={item.id} className={item.state === "completed" ? "is-complete" : undefined}>
      <div className="list-item-content"><span>{item.label}</span>{item.assignedToActiveMember ? <small>Assigned to you</small> : null}{item.state === "completed" ? <small>Completed</small> : null}{item.state === "open" && state.data.canComplete && completion?.itemId !== item.id ? <button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setCompletion({ itemId: item.id, expectedVersion: item.version, commandId: crypto.randomUUID() })}>Mark complete</button> : null}</div>
      {completion?.itemId === item.id ? <div className="confirmation-panel" role="group" aria-label={`Confirm completion of ${item.label}`}><p>Mark <strong>{item.label}</strong> complete?</p><div><button className="primary-button compact-button" type="button" disabled={saving} onClick={() => void confirmCompletion()}>{saving ? "Saving…" : "Confirm"}</button><button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setCompletion(null)}>Cancel</button></div></div> : null}
    </li>)}</ol>}
  </section>;
}
