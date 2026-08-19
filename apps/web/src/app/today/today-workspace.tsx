"use client";

import Link from "next/link";
import { useActiveShellContext } from "../authenticated-shell";
import { TodayItems } from "./today-items";

export function TodayWorkspace() {
  const context = useActiveShellContext();
  return <section aria-labelledby="today-title">
    <p className="eyebrow">Today</p>
    <h1 id="today-title">Your household, clearly scoped</h1>
    <p>Only items authorized for {context.displayName} in {context.householdName} appear here.</p>
    <div className="shell-card"><TodayItems key={context.memberId} memberId={context.memberId} />{context.enabledApps.includes("shared-lists") ? <Link className="secondary-button inline-button" href="/lists">Open Shared Lists</Link> : null}</div>
  </section>;
}
