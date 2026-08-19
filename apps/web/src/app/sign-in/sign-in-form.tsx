"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      rememberMe: form.get("rememberMe") === "on",
      callbackURL: "/today",
    });
    if (result.error !== null) {
      setError("We could not sign you in. Check your details and try again.");
      setPending(false);
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  return <form className="account-form" onSubmit={submit}>
    <div className="field-group">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} />
    </div>
    <div className="field-group">
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" minLength={12} required disabled={pending} />
    </div>
    <label className="checkbox-field">
      <input name="rememberMe" type="checkbox" disabled={pending} />
      <span>Keep me signed in on this device</span>
    </label>
    {error === null ? null : <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" aria-busy={pending} disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  </form>;
}
