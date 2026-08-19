import { AuthenticatedShell } from "../authenticated-shell";
import { AppsWorkspace } from "./workspace";

export default function AppsPage() {
  return <AuthenticatedShell current="apps"><AppsWorkspace /></AuthenticatedShell>;
}
