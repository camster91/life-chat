"use client";

import Link from "next/link";
import { useActiveShellContext } from "../authenticated-shell";

export function ChatWorkspace() {
  const context = useActiveShellContext();
  return <section aria-labelledby="chat-title">
    <p className="eyebrow">Life Chat</p>
    <h1 id="chat-title">Ask, review, then decide</h1>
    <p>Life Chat is scoped to {context.householdName}. A local AI provider has not been configured, so no message, household record, or provider key leaves this device from this screen.</p>
    <div className="shell-card empty-state">
      <h2>Chat is currently unavailable</h2>
      <p>When a provider is configured, every important change will appear as a reviewable proposal before anything is executed. Normal interfaces remain available now.</p>
      <div className="app-actions"><Link className="primary-button compact-button" href="/today">Open Today</Link><Link className="secondary-button compact-button" href="/calendar">Open Calendar</Link>{context.enabledApps.includes("chores") ? <Link className="secondary-button compact-button" href="/chores">Open Chores</Link> : null}{context.enabledApps.includes("shared-lists") ? <Link className="secondary-button compact-button" href="/lists">Open Shared Lists</Link> : null}</div>
    </div>
    <p className="calm-note">Chat will not silently perform actions, even after a provider is available.</p>
  </section>;
}
