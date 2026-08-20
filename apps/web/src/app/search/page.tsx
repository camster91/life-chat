import { AuthenticatedShell } from "../authenticated-shell";
import { SearchWorkspace } from "./search-workspace";

export default function SearchPage() {
  return <AuthenticatedShell current="search"><SearchWorkspace /></AuthenticatedShell>;
}
