"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { SharedListsApiResponse } from "../../lib/shared-list-api";

type LoadState = { kind: "loading" } | { kind: "signed-out" } | { kind: "error"; message: string } | { kind: "ready"; data: SharedListsApiResponse };

export function ListsWorkspace() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/lists", { cache: "no-store" });
      if (response.status === 401) return setState({ kind: "signed-out" });
      if (!response.ok) return setState({ kind: "error", message: response.status === 409 ? "Choose an active household on Today before opening lists." : "Shared Lists is not available for this household member." });
      setState({ kind: "ready", data: await response.json() as SharedListsApiResponse });
    } catch {
      setState({ kind: "error", message: "Lists could not be loaded. No household data was changed." });
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, commandId: crypto.randomUUID() }) });
      if (!response.ok) throw new Error("create failed");
      setTitle("");
      setNotice("List created.");
      await load();
    } catch {
      setNotice("The list could not be created. Check your access and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (state.kind === "loading") return <div className="shell-card" role="status"><p>Loading household lists…</p></div>;
  if (state.kind === "signed-out") return <div className="shell-card empty-state"><h2>Sign in to view lists</h2><p>No household list data is loaded without a verified session.</p><Link className="primary-button inline-button" href="/sign-in">Sign in</Link></div>;
  if (state.kind === "error") return <div className="shell-card" role="alert"><h2>Lists unavailable</h2><p>{state.message}</p><button className="secondary-button" type="button" onClick={() => void load()}>Try again</button></div>;

  return <div className="feature-workspace">
    <div className="section-heading"><div><h2>{state.data.householdName}</h2><p>{state.data.lists.length === 0 ? "No lists yet." : `${state.data.lists.length} ${state.data.lists.length === 1 ? "list" : "lists"}`}</p></div></div>
    {state.data.canManage ? <form className="quick-entry" onSubmit={submit} aria-label="Create a shared list">
      <div className="field-group"><label htmlFor="new-list-title">New list</label><input id="new-list-title" value={title} maxLength={200} disabled={saving} onChange={(event) => setTitle(event.target.value)} placeholder="Weekend errands" required /></div>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create list"}</button>
    </form> : <p className="calm-note">You can view household lists. An adult can create or change them.</p>}
    <div aria-live="polite" aria-atomic="true">{notice === null ? null : <p className={notice.startsWith("List created") ? "form-success" : "form-error"}>{notice}</p>}</div>
    {state.data.lists.length === 0 ? <div className="shell-card empty-state"><h2>Start with one useful list</h2><p>Groceries, packing, or things to discuss are good places to begin.</p></div> : <ul className="list-cards">{state.data.lists.map((list) => <li key={list.id}><Link href={`/lists/${encodeURIComponent(list.id)}`}><strong>{list.title}</strong><span>{list.openItemCount} open {list.openItemCount === 1 ? "item" : "items"}</span></Link></li>)}</ul>}
  </div>;
}
