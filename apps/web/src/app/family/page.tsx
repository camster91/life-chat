import { AuthenticatedShell } from "../authenticated-shell";
import { FamilyWorkspace } from "./family-workspace";

export default function FamilyPage() {
  return <AuthenticatedShell current="family"><FamilyWorkspace /></AuthenticatedShell>;
}
