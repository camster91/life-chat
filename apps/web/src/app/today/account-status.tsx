"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import type { AccountContextResponse } from "../../lib/account-context";
import { TodayItems } from "./today-items";

export function AccountStatus() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [context, setContext] = useState<AccountContextResponse | null>(null);
  const [contextError, setContextError] = useState(false);
  const [selectingMemberId, setSelectingMemberId] = useState<string | null>(null);

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

  if (isPending) return <div className="shell-card" role="status"><p>Checking your account…</p></div>;
  if (session === null) return <div className="shell-card empty-state">
    <h2>Sign in to continue</h2>
    <p>No household information is loaded without a verified session.</p>
    <Link className="primary-button inline-button" href="/sign-in">Sign in</Link>
  </div>;
  const signOut = <button className="secondary-button" type="button" onClick={async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }}>Sign out</button>;
  if (contextError) return <div className="shell-card" role="alert"><h2>Household context unavailable</h2><p>Try again before viewing or changing household information.</p>{signOut}</div>;
  if (context === null) return <div className="shell-card" role="status"><p>Checking your household access…</p>{signOut}</div>;
  if (context.status === "no-membership") return <div className="shell-card empty-state"><h2>No active household membership</h2><p>Your account is signed in, but it is not linked to an active household member.</p>{signOut}</div>;
  if (context.status === "selection-required") return <div className="shell-card">
    <h2>Choose a household</h2>
    <p>Your account belongs to more than one household. Choose where you want to work.</p>
    <div className="context-options">{context.options.map((option) => <button className="secondary-button" type="button" key={option.memberId} aria-busy={selectingMemberId === option.memberId} disabled={selectingMemberId !== null} onClick={async () => {
      setContextError(false);
      setSelectingMemberId(option.memberId);
      try {
        const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: option.memberId }) });
        if (!response.ok) throw new Error("selection unavailable");
        setContext(await response.json() as AccountContextResponse);
      } catch {
        setContextError(true);
      } finally {
        setSelectingMemberId(null);
      }
    }}>{option.householdName}<small>as {option.displayName}</small></button>)}</div>
    {signOut}
  </div>;
  return <div className="shell-card">
    <p className="eyebrow">Signed in</p>
    <h2>{session.user.name}</h2>
    <p>Working in <strong>{context.householdName}</strong> as {context.displayName}.</p>
    <TodayItems key={context.memberId} memberId={context.memberId} />
    <Link className="secondary-button inline-button" href="/lists">Open Shared Lists</Link>
    {signOut}
  </div>;
}
