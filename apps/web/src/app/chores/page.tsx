import { AuthenticatedShell } from "../authenticated-shell";
import { ChoresWorkspace } from "./chores-workspace";

export default function ChoresPage() {
  return <AuthenticatedShell current="chores"><ChoresWorkspace /></AuthenticatedShell>;
}
