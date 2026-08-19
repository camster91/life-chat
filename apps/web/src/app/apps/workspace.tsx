"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppConfigurationSummary, AppsApiResponse } from "../../lib/apps-api";

export function AppsWorkspace() {
  const [data, setData] = useState<AppsApiResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [proposal, setProposal] = useState<{ app: AppConfigurationSummary; enabled: boolean; commandId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch("/api/apps", { cache: "no-store", signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); setData(await response.json() as AppsApiResponse); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true); }); return () => controller.abort(); }, []);

  async function confirm() {
    if (proposal === null) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/apps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: proposal.app.id, enabled: proposal.enabled, expectedVersion: proposal.app.version, commandId: proposal.commandId }) });
      if (!response.ok) throw new Error(response.status === 409 ? "conflict" : "denied");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error && error.message === "conflict" ? "Apps changed since this page loaded. Reload before trying again." : "This app change is not allowed. Check dependencies and permissions."); setSaving(false); }
  }

  return <section aria-labelledby="apps-title"><p className="eyebrow">Apps</p><h1 id="apps-title">Household apps</h1><p>Enabled features stay optional. Disabling an app hides it without deleting household data.</p>
    {failed ? <div className="shell-card" role="alert"><h2>Apps unavailable</h2><p>No configuration was changed.</p></div> : data === null ? <div className="shell-card" role="status"><p>Loading household apps…</p></div> : data.apps.length === 0 ? <div className="shell-card empty-state"><h2>No apps available</h2><p>Your household has not enabled an app you can use.</p></div> : <ul className="app-management-list">{data.apps.map((app) => <li key={app.id}><div><strong>{app.label}</strong><span>{app.enabled ? app.eligible ? "Enabled" : "Enabled but unavailable" : "Disabled"}</span>{app.dependencies.length > 0 ? <small>Requires {app.dependencies.join(", ")}</small> : null}{app.enabledDependents.length > 0 ? <small>Used by {app.enabledDependents.join(", ")}</small> : null}</div><div className="app-actions">{app.id === "shared-lists" && app.enabled && app.eligible ? <Link className="secondary-button compact-button" href="/lists">Open</Link> : null}{data.canManage ? <button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => { setMessage(null); setProposal({ app, enabled: !app.enabled, commandId: crypto.randomUUID() }); }}>{app.enabled ? "Review disable" : "Review enable"}</button> : null}</div>{proposal?.app.id === app.id ? <div className="confirmation-panel" role="group" aria-label={`Confirm ${proposal.enabled ? "enable" : "disable"} ${app.label}`}><p><strong>{proposal.enabled ? "Enable" : "Disable"} {app.label}?</strong> {proposal.enabled ? "The app will become available only when its dependencies are enabled." : "Its data will be retained and the app will be hidden. Enabled dependents must be disabled first."}</p><div><button className="primary-button compact-button" type="button" disabled={saving} onClick={() => void confirm()}>{saving ? "Saving…" : "Confirm"}</button><button className="secondary-button compact-button" type="button" disabled={saving} onClick={() => setProposal(null)}>Cancel</button></div></div> : null}</li>)}</ul>}
    <div aria-live="polite">{message === null ? null : <p className="form-error">{message}</p>}</div>
  </section>;
}
