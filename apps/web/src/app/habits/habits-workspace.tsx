"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { HabitsApiResponse } from "@/lib/habits-api";

type LoadState = { kind: "loading" } | { kind: "signed-out" } | { kind: "error" } | { kind: "ready"; data: HabitsApiResponse };

export function HabitsWorkspace() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [completion, setCompletion] = useState<{ routineId: string; label: string; commandId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/habits", { cache: "no-store" });
      if (response.status === 401) return setState({ kind: "signed-out" });
      if (!response.ok) return setState({ kind: "error" });
      setState({ kind: "ready", data: await response.json() as HabitsApiResponse });
    } catch { setState({ kind: "error" }); }
  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);

  async function createRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (label.trim().length === 0) return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, commandId: crypto.randomUUID() }) });
      if (!response.ok) throw new Error("create failed");
      setLabel(""); setNotice("Habit added."); await load();
    } catch { setNotice("The habit could not be added. Check your access and try again."); }
    finally { setSaving(false); }
  }

  async function confirmCompletion() {
    if (completion === null) return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/habits/${encodeURIComponent(completion.routineId)}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandId: completion.commandId }) });
      if (!response.ok) throw new Error(response.status === 409 ? "conflict" : "complete failed");
      setCompletion(null); setNotice("Habit completed for today."); await load();
    } catch (error) { setNotice(error instanceof Error && error.message === "conflict" ? "This habit is already complete for today. Your progress was refreshed." : "The habit was not completed. You can safely try again or cancel."); }
    finally { setSaving(false); }
  }

  if (state.kind === "loading") return <section className="shell-card" role="status"><p>Loading habits…</p></section>;
  if (state.kind === "signed-out") return <section className="shell-card empty-state"><h1>Sign in to view habits</h1></section>;
  if (state.kind === "error") return <section className="shell-card" role="alert"><h1>Habits unavailable</h1><p>Habits may not be enabled for this household, or your access may have changed.</p></section>;

  return <section aria-labelledby="habits-title">
    <p className="eyebrow">Habits</p><h1 id="habits-title">Small routines, without pressure</h1><p>Progress is private to you and based on the household date: {state.data.today}.</p>
    {state.data.canManage ? <form className="quick-entry" onSubmit={createRoutine} aria-label="Add a habit"><div className="field-group"><label htmlFor="habit-label">Add a habit</label><input id="habit-label" value={label} maxLength={200} disabled={saving} onChange={(event) => setLabel(event.target.value)} placeholder="Drink water" required /></div><button className="primary-button" type="submit" disabled={saving}>{saving ? "Adding…" : "Add habit"}</button></form> : <p className="calm-note">An adult can add a routine. You can record your own progress.</p>}
    <div aria-live="polite" aria-atomic="true">{notice === null ? null : <p className={notice.startsWith("Habit added") || notice.startsWith("Habit completed") ? "form-success" : "form-error"}>{notice}</p>}</div>
    {state.data.habits.length === 0 ? <div className="shell-card empty-state"><h2>No habits yet</h2><p>Start with one small routine that helps your day.</p></div> : <ol className="list-items">{state.data.habits.map((habit) => <li key={habit.id} className={habit.completedToday ? "is-complete" : undefined}><div className="list-item-content"><span>{habit.label}</span><small>{habit.currentStreakDays} {habit.currentStreakDays === 1 ? "day" : "days"} in the current streak</small>{habit.completedToday ? <small>Completed today</small> : completion?.routineId !== habit.id ? <button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setCompletion({ routineId: habit.id, label: habit.label, commandId: crypto.randomUUID() })}>Mark complete</button> : null}</div>{completion?.routineId === habit.id ? <div className="confirmation-panel" role="group" aria-label={`Confirm completion of ${habit.label}`}><p>Mark <strong>{habit.label}</strong> complete for today?</p><div><button className="primary-button compact-button" type="button" disabled={saving} onClick={() => void confirmCompletion()}>{saving ? "Saving…" : "Confirm"}</button><button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setCompletion(null)}>Cancel</button></div></div> : null}</li>)}</ol>}
  </section>;
}
