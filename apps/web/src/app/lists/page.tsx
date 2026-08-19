import { AuthenticatedShell } from "../authenticated-shell";
import { ListsWorkspace } from "./lists-workspace";

export default function ListsPage() {
  return <AuthenticatedShell current="lists">
      <section aria-labelledby="lists-title">
        <p className="eyebrow">Shared Lists</p>
        <h1 id="lists-title">Keep the small things together</h1>
        <p>Simple household lists, visible only to members who have access.</p>
        <ListsWorkspace />
      </section>
  </AuthenticatedShell>;
}
