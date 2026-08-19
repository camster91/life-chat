"use client";

import Link from "next/link";
import { miniAppRegistry } from "../../lib/mini-app-registry";
import { useActiveShellContext } from "../authenticated-shell";

export function AppsWorkspace() {
  const context = useActiveShellContext();
  const enabled = miniAppRegistry.filter((app) => context.enabledApps.includes(app.id));
  return <section aria-labelledby="apps-title"><p className="eyebrow">Apps</p><h1 id="apps-title">Household apps</h1><p>Enabled features stay optional. Disabling an app hides it without deleting household data.</p>{enabled.length === 0 ? <div className="shell-card empty-state"><h2>No apps enabled</h2><p>An adult can configure apps after the management screen is implemented. No data was changed.</p></div> : <ul className="list-cards">{enabled.map((app) => <li key={app.id}>{app.id === "shared-lists" ? <Link href="/lists"><strong>{app.label}</strong><span>Open normal UI</span></Link> : <div className="app-card-disabled"><strong>{app.label}</strong><span>Open assigned records from Today</span></div>}</li>)}</ul>}</section>;
}
