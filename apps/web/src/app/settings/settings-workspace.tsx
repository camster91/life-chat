"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SettingsApiResponse } from "@/lib/settings-api";
import { useActiveShellContext } from "../authenticated-shell";

const descriptions: Record<string, string> = {
  profile: "Your name and member-facing preferences. Editing is not configured yet.",
  notifications: "Reminder preferences are available in your inbox.",
  household: "Household name, timezone, and locale changes require an explicit reviewed command.",
  privacy: "Privacy, retention, and account-deletion controls are not configured yet.",
  export: "Export remains unavailable until recovery and package verification are in place.",
  ai: "No AI provider or key is configured. Household data is not sent anywhere from this screen.",
};

export function SettingsWorkspace() {
  const context = useActiveShellContext();
  const [result, setResult] = useState<{ memberId: string; data: SettingsApiResponse | null; error: string | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json() as SettingsApiResponse | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Settings could not be loaded.");
      setResult({ memberId: context.memberId, data: body, error: null });
    }).catch((caught: unknown) => {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setResult({ memberId: context.memberId, data: null, error: caught instanceof Error ? caught.message : "Settings could not be loaded." });
    });
    return () => controller.abort();
  }, [context.memberId]);
  const current = result?.memberId === context.memberId ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;

  return <section aria-labelledby="settings-title">
    <p className="eyebrow">Settings</p>
    <h1 id="settings-title">Clear controls, careful boundaries</h1>
    <p>Only settings available to {context.displayName} in {context.householdName} appear here. Sensitive changes are always reviewed before they apply.</p>
    {error !== null ? <p className="form-error" role="alert">{error}</p> : null}
    {data === null ? error === null ? <p role="status">Loading settings…</p> : null : data.sections.length === 0 ? <div className="shell-card empty-state"><h2>No settings available</h2><p>Your current household role does not have settings access.</p></div> : <ul className="settings-list">{data.sections.map((section) => <li className="shell-card" key={section.id}><div><h2>{section.label}</h2><p>{descriptions[section.id] ?? "This setting is not configured yet."}</p>{section.sensitive ? <span className="calm-note">Review required when available</span> : null}</div>{section.id === "notifications" ? <Link className="secondary-button compact-button" href="/notifications">Open</Link> : <span className="settings-status">Not configured</span>}</li>)}</ul>}
  </section>;
}
