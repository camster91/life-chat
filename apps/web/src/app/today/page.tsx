import Link from "next/link";
import { AccountStatus } from "./account-status";

export default function TodayPage() {
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <main id="main-content" className="account-page" tabIndex={-1}>
      <section className="account-panel" aria-labelledby="today-title">
        <Link className="brand" href="/">Life Chat</Link>
        <div>
          <p className="eyebrow">Today</p>
          <h1 id="today-title">Your household, clearly scoped</h1>
          <p>Life Chat will show data only after both account and household context have been verified.</p>
        </div>
        <AccountStatus />
      </section>
    </main>
  </>;
}
