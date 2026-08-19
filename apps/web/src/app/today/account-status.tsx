"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function AccountStatus() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <div className="shell-card" role="status"><p>Checking your account…</p></div>;
  if (session === null) return <div className="shell-card empty-state">
    <h2>Sign in to continue</h2>
    <p>No household information is loaded without a verified session.</p>
    <Link className="primary-button inline-button" href="/sign-in">Sign in</Link>
  </div>;
  return <div className="shell-card">
    <p className="eyebrow">Signed in</p>
    <h2>{session.user.name}</h2>
    <p>Your account is verified. Household selection and authorized Today data are the next shell integration step.</p>
    <button className="secondary-button" type="button" onClick={async () => {
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    }}>Sign out</button>
  </div>;
}
