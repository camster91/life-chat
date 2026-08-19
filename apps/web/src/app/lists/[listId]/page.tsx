import Link from "next/link";
import { ListWorkspace } from "./list-workspace";

export default async function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <main id="main-content" className="feature-page" tabIndex={-1}>
      <header className="feature-header"><Link className="brand" href="/today">Life Chat</Link><Link className="secondary-button inline-button" href="/lists">All lists</Link></header>
      <ListWorkspace listId={listId} />
    </main>
  </>;
}
