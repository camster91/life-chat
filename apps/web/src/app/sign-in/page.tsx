import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return <main id="main-content" className="account-page">
    <section className="account-panel" aria-labelledby="sign-in-title">
      <Link className="brand" href="/">Life Chat</Link>
      <div>
        <p className="eyebrow">Account access</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p>Sign in to continue to a household you already belong to.</p>
      </div>
      <SignInForm />
      <div className="account-help">
        <h2>Need an account?</h2>
        <p>Life Chat is invite-only during the foundation phase. Ask a household adult for an invitation.</p>
      </div>
    </section>
  </main>;
}
