"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AccountContextResponse } from "../lib/account-context";
import { authClient } from "../lib/auth-client";

type ActiveContext = Extract<AccountContextResponse, { status: "active" }>;
type ShellDestination = "today" | "chat" | "apps" | "calendar" | "family" | "notifications" | "search" | "settings" | "lists" | "chores" | "habits" | "rewards" | "meals" | "groceries";
const ActiveShellContext = createContext<ActiveContext | null>(null);

export function useActiveShellContext(): ActiveContext {
  const context = useContext(ActiveShellContext);
  if (context === null) throw new Error("Active shell context is unavailable.");
  return context;
}

const coreNavigation = [
  { id: "today", label: "Today", href: "/today" },
  { id: "chat", label: "Chat", href: "/chat" },
  { id: "apps", label: "Apps", href: "/apps" },
  { id: "calendar", label: "Calendar", href: "/calendar" },
  { id: "family", label: "Family", href: "/family" },
  { id: "search", label: "Search", href: "/search" },
  { id: "notifications", label: "Notifications", href: "/notifications" },
  { id: "settings", label: "Settings", href: "/settings" },
] as const;

function NavigationItem({ item, current }: { item: (typeof coreNavigation)[number]; current: ShellDestination }) {
  return <Link aria-current={current === item.id ? "page" : undefined} href={item.href}>{item.label}</Link>;
}

export function AuthenticatedShell({ current, children }: { current: ShellDestination; children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [context, setContext] = useState<AccountContextResponse | null>(null);
  const [contextError, setContextError] = useState(false);
  const [selectingMemberId, setSelectingMemberId] = useState<string | null>(null);
  const moreDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (session === null) return;
    const controller = new AbortController();
    fetch("/api/context", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("context unavailable");
        setContext(await response.json() as AccountContextResponse);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setContextError(true);
      });
    return () => controller.abort();
  }, [session]);

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  if (isPending) return <ShellGate status="Checking your account…" />;
  if (session === null) return <ShellGate title="Sign in to continue" description="No household information is loaded without a verified session."><Link className="primary-button inline-button" href="/sign-in">Sign in</Link></ShellGate>;
  if (contextError) return <ShellGate title="Household context unavailable" description="Try again before viewing or changing household information." alert><button className="secondary-button" type="button" onClick={() => window.location.reload()}>Try again</button><button className="secondary-button" type="button" onClick={() => void signOut()}>Sign out</button></ShellGate>;
  if (context === null) return <ShellGate status="Checking your household access…" />;
  if (context.status === "no-membership") return <ShellGate title="No active household membership" description="Your account is signed in, but it is not linked to an active household member."><button className="secondary-button" type="button" onClick={() => void signOut()}>Sign out</button></ShellGate>;
  if (context.status === "selection-required") return <ShellGate title="Choose a household" description="Your account belongs to more than one household. Choose where you want to work.">
    <div className="context-options">{context.options.map((option) => <button className="secondary-button" type="button" key={option.memberId} aria-busy={selectingMemberId === option.memberId} disabled={selectingMemberId !== null} onClick={async () => {
      setContextError(false);
      setSelectingMemberId(option.memberId);
      try {
        const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: option.memberId }) });
        if (!response.ok) throw new Error("selection unavailable");
        setContext(await response.json() as AccountContextResponse);
      } catch { setContextError(true); }
      finally { setSelectingMemberId(null); }
    }}>{option.householdName}<small>as {option.displayName}</small></button>)}</div>
    <button className="secondary-button inline-button" type="button" onClick={() => void signOut()}>Sign out</button>
  </ShellGate>;

  return <ActiveShellContext.Provider value={context}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="app-shell">
      <aside className="shell-sidebar" aria-label="Life Chat navigation">
        <Link className="brand" href="/today">Life Chat</Link>
        <div className="context-card" aria-label="Current household context"><span className="eyebrow">Current household</span><strong>{context.householdName}</strong><p>{context.displayName} · {context.role}</p></div>
        <nav aria-label="Primary navigation"><ul className="shell-navigation">{coreNavigation.map((item) => <li key={item.id}><NavigationItem item={item} current={current} /></li>)}</ul></nav>
        {context.enabledApps.includes("habits") || context.enabledApps.includes("rewards") || context.enabledApps.includes("meals") || context.enabledApps.includes("groceries") || context.enabledApps.includes("shared-lists") || context.enabledApps.includes("chores") ? <nav aria-label="Enabled apps"><p className="eyebrow">Enabled apps</p><ul className="shell-navigation">{context.enabledApps.includes("habits") ? <li><Link aria-current={current === "habits" ? "page" : undefined} href="/habits">Habits</Link></li> : null}{context.enabledApps.includes("rewards") ? <li><Link aria-current={current === "rewards" ? "page" : undefined} href="/rewards">Rewards</Link></li> : null}{context.enabledApps.includes("meals") ? <li><Link aria-current={current === "meals" ? "page" : undefined} href="/meals">Meals</Link></li> : null}{context.enabledApps.includes("groceries") ? <li><Link aria-current={current === "groceries" ? "page" : undefined} href="/groceries">Groceries</Link></li> : null}{context.enabledApps.includes("shared-lists") ? <li><Link aria-current={current === "lists" ? "page" : undefined} href="/lists">Shared Lists</Link></li> : null}{context.enabledApps.includes("chores") ? <li><Link aria-current={current === "chores" ? "page" : undefined} href="/chores">Chores</Link></li> : null}</ul></nav> : null}
        <button className="secondary-button" type="button" onClick={() => void signOut()}>Sign out</button>
        <p className="shell-note">Normal interfaces remain available alongside chat.</p>
      </aside>
      <div className="shell-workspace">
        <header className="shell-header"><Link className="brand mobile-brand" href="/today">Life Chat</Link><p>{context.householdName} · {context.displayName}</p></header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <nav className="mobile-navigation" aria-label="Mobile primary navigation"><ul>
          {coreNavigation.filter((item) => ["today", "chat", "calendar", "apps"].includes(item.id)).map((item) => <li key={item.id}><NavigationItem item={item} current={current} /></li>)}
          <li><button className="mobile-more-button" aria-haspopup="dialog" type="button" onClick={() => moreDialog.current?.showModal()}>More</button></li>
        </ul></nav>
      </div>
    </div>
    <dialog className="shell-more-dialog" ref={moreDialog} aria-labelledby="shell-more-title"><div><header><h2 id="shell-more-title">More</h2><button className="secondary-button" type="button" onClick={() => moreDialog.current?.close()}>Close</button></header><ul className="shell-navigation">{coreNavigation.filter((item) => ["family", "search", "notifications", "settings"].includes(item.id)).map((item) => <li key={item.id}><NavigationItem item={item} current={current} /></li>)}</ul></div></dialog>
  </ActiveShellContext.Provider>;
}

function ShellGate({ title, description, status, alert = false, children }: { title?: string; description?: string; status?: string; alert?: boolean; children?: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to main content</a><main id="main-content" className="account-page" tabIndex={-1}><section className="account-panel" role={alert ? "alert" : status ? "status" : undefined}><Link className="brand" href="/">Life Chat</Link>{status ? <p>{status}</p> : <><h1>{title}</h1><p>{description}</p>{children}</>}</section></main></>;
}
