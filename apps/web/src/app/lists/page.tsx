import Link from "next/link";
import { ListsWorkspace } from "./lists-workspace";

export default function ListsPage() {
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <main id="main-content" className="feature-page" tabIndex={-1}>
      <header className="feature-header">
        <div><Link className="brand" href="/today">Life Chat</Link><p className="eyebrow">Shared Lists</p></div>
        <Link className="secondary-button inline-button" href="/today">Today</Link>
      </header>
      <section aria-labelledby="lists-title">
        <h1 id="lists-title">Keep the small things together</h1>
        <p>Simple household lists, visible only to members who have access.</p>
        <ListsWorkspace />
      </section>
    </main>
  </>;
}
