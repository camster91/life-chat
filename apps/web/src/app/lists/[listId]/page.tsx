import Link from "next/link";
import { ListWorkspace } from "./list-workspace";
import { AuthenticatedShell } from "../../authenticated-shell";

export default async function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  return <AuthenticatedShell current="lists"><div className="feature-header"><div><p className="eyebrow">Shared Lists</p></div><Link className="secondary-button inline-button" href="/lists">All lists</Link></div><ListWorkspace listId={listId} /></AuthenticatedShell>;
}
