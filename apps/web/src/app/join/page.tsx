import Link from "next/link";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return <main id="main-content" className="account-page">
    <section className="account-panel" aria-labelledby="join-title">
      <Link className="brand" href="/">Life Chat</Link>
      <div>
        <p className="eyebrow">Private household access</p>
        <h1 id="join-title">Accept an invitation</h1>
        <p>Create or link an account only with a valid one-time household code.</p>
      </div>
      <JoinForm />
    </section>
  </main>;
}
