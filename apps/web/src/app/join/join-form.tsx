"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function JoinForm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sessionPending) return;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: String(form.get("token") ?? ""),
        ...(session === null ? { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") } : {}),
      }),
    });
    if (!response.ok) {
      setError("We could not accept this invitation. It may be expired or already used. If you already have an account, sign in and try the code again.");
      setPending(false);
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  const busy = pending || sessionPending;
  return <form className="account-form" onSubmit={submit}>
    <div className="field-group">
      <label htmlFor="token">Invitation code</label>
      <input id="token" name="token" type="text" autoComplete="off" minLength={20} maxLength={200} required disabled={busy} aria-describedby="invitation-code-help" />
      <small id="invitation-code-help">Paste the private code you received. Codes are never included in Life Chat links.</small>
    </div>
    {session === null ? <>
      <div className="field-group">
        <label htmlFor="join-email">Email address</label>
        <input id="join-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={320} required disabled={busy} />
      </div>
      <div className="field-group">
        <label htmlFor="join-password">Create a password</label>
        <input id="join-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} aria-describedby="password-help" />
        <small id="password-help">Use 12–128 characters. Life Chat never stores this password in household records.</small>
      </div>
    </> : <p className="signed-in-note">Signed in as {session.user.email}. This invitation will be linked to that account.</p>}
    {error === null ? null : <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" aria-busy={busy} disabled={busy}>{pending ? "Accepting…" : "Accept invitation"}</button>
    {session === null ? <p className="form-secondary">Already have an account? <Link href="/sign-in">Sign in first</Link>, then return here to enter the code.</p> : null}
  </form>;
}
