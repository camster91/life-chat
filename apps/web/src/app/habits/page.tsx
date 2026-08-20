import { AuthenticatedShell } from "../authenticated-shell";
import { HabitsWorkspace } from "./habits-workspace";

export default function HabitsPage() {
  return <AuthenticatedShell current="habits"><HabitsWorkspace /></AuthenticatedShell>;
}
