"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InboxNotification } from "@/lib/notification-centre";
import type { NotificationsApiResponse } from "@/lib/notifications-api";
import { useActiveShellContext } from "../authenticated-shell";

async function loadNotifications(signal?: AbortSignal): Promise<NotificationsApiResponse> {
  const response = await fetch("/api/notifications", { cache: "no-store", signal });
  const body = await response.json() as NotificationsApiResponse | { error: string };
  if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Notifications could not be loaded.");
  return body;
}

function templateLabel(templateId: string): string {
  const known: Record<string, string> = { "chore.due": "Chore due", "chore.reminder": "Chore reminder", "household.summary": "Household summary" };
  return known[templateId] ?? "Household update";
}

export function NotificationsWorkspace() {
  const context = useActiveShellContext();
  const [result, setResult] = useState<{ memberId: string; data: NotificationsApiResponse | null; error: string | null } | null>(null);
  const [dismiss, setDismiss] = useState<InboxNotification | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(controller.signal).then((data) => setResult({ memberId: context.memberId, data, error: null })).catch((caught: unknown) => {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setResult({ memberId: context.memberId, data: null, error: caught instanceof Error ? caught.message : "Notifications could not be loaded." });
    });
    return () => controller.abort();
  }, [context.memberId]);

  const current = result?.memberId === context.memberId ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const currentDismiss = dismiss !== null && data?.inbox.some((item) => item.id === dismiss.id) ? dismiss : null;

  const act = async (notification: InboxNotification, action: "read" | "dismiss") => {
    setSavingId(notification.id);
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The notification action could not be completed.");
      setResult({ memberId: context.memberId, data: await loadNotifications(), error: null });
      setDismiss(null);
    } catch (caught) {
      setResult({ memberId: context.memberId, data, error: caught instanceof Error ? caught.message : "The notification action could not be completed." });
    } finally { setSavingId(null); }
  };

  return <section aria-labelledby="notifications-title">
    <p className="eyebrow">Notifications</p>
    <h1 id="notifications-title">Updates without the noise</h1>
    <p>The inbox shows only safe references addressed to you. It does not copy private record content or send anything externally.</p>
    {error !== null ? <p className="form-error" role="alert">{error}</p> : null}
    {data === null ? error === null ? <p role="status">Loading notifications…</p> : null : <div className="notification-layout">
      <section className="feature-workspace" aria-labelledby="inbox-heading">
        <div className="section-heading"><div><h2 id="inbox-heading">Inbox</h2><p>{data.inbox.length} {data.inbox.length === 1 ? "update" : "updates"}</p></div></div>
        {data.inbox.length === 0 ? <div className="shell-card empty-state"><p>You are all caught up.</p></div> : <ol className="notification-list">{data.inbox.map((notification) => <li className={notification.state === "read" ? "is-read" : ""} key={notification.id}>
          <div><span className="notification-state">{notification.state === "read" ? "Read" : "New"}</span><h3>{templateLabel(notification.templateId)}</h3><time dateTime={notification.deliverAt}>{new Intl.DateTimeFormat(data.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.deliverAt))}</time></div>
          <div className="app-actions">{notification.deepLink !== null ? <Link className="secondary-button compact-button" href={notification.deepLink}>Open</Link> : null}{notification.state === "available" ? <button className="secondary-button compact-button" type="button" disabled={savingId !== null} onClick={() => void act(notification, "read")}>Mark read</button> : null}<button className="secondary-button compact-button" type="button" disabled={savingId !== null} onClick={() => setDismiss(notification)}>Review dismiss</button></div>
          {currentDismiss?.id === notification.id ? <div className="confirmation-panel" role="group" aria-label={`Confirm dismiss ${templateLabel(notification.templateId)}`}><p><strong>Dismiss this update?</strong> It will leave your inbox, but its audit history remains.</p><div><button className="secondary-button compact-button" type="button" disabled={savingId !== null} onClick={() => setDismiss(null)}>Cancel</button><button className="primary-button compact-button" type="button" disabled={savingId !== null} aria-busy={savingId === notification.id} onClick={() => void act(notification, "dismiss")}>Confirm</button></div></div> : null}
        </li>)}</ol>}
      </section>
      <NotificationPreferences key={context.memberId} preference={data.preference} onSaved={async () => setResult({ memberId: context.memberId, data: await loadNotifications(), error: null })} />
    </div>}
  </section>;
}

function asTime(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function asMinute(value: string): number { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }

function NotificationPreferences({ preference, onSaved }: { preference: NotificationsApiResponse["preference"]; onSaved: () => Promise<void> }) {
  const [remindersEnabled, setRemindersEnabled] = useState(preference.remindersEnabled);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(preference.quietHours !== null);
  const [start, setStart] = useState(asTime(preference.quietHours?.startMinute ?? 1320));
  const [end, setEnd] = useState(asTime(preference.quietHours?.endMinute ?? 420));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  return <section className="shell-card notification-preferences" aria-labelledby="notification-preferences-heading"><h2 id="notification-preferences-heading">Reminder preferences</h2><p>These settings affect future reminders, not your canonical in-app inbox.</p><label className="checkbox-field"><input type="checkbox" checked={remindersEnabled} onChange={(event) => setRemindersEnabled(event.target.checked)} />Allow future reminders</label><label className="checkbox-field"><input type="checkbox" checked={quietHoursEnabled} onChange={(event) => setQuietHoursEnabled(event.target.checked)} />Use quiet hours</label>{quietHoursEnabled ? <div className="quiet-hours"><label className="field-group"><span>Start</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="field-group"><span>End</span><input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div> : null}<p className="context-date">Timezone: {preference.timeZone}</p>{status !== null ? <p className={status.kind === "success" ? "form-success" : "form-error"} role={status.kind === "success" ? "status" : "alert"}>{status.message}</p> : null}<button className="primary-button inline-button" type="button" disabled={saving} aria-busy={saving} onClick={async () => { setSaving(true); setStatus(null); let persisted = false; try { const response = await fetch("/api/notifications/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remindersEnabled, quietHours: quietHoursEnabled ? { startMinute: asMinute(start), endMinute: asMinute(end) } : null, timeZone: preference.timeZone }) }); if (!response.ok) throw new Error(); persisted = true; await onSaved(); setStatus({ kind: "success", message: "Preferences saved." }); } catch { setStatus({ kind: "error", message: persisted ? "Preferences were saved, but the inbox could not refresh." : "Preferences could not be saved." }); } finally { setSaving(false); } }}>Save preferences</button></section>;
}
