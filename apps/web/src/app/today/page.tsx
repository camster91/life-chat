import { AuthenticatedShell } from "../authenticated-shell";
import { TodayWorkspace } from "./today-workspace";

export default function TodayPage() {
  return <AuthenticatedShell current="today"><TodayWorkspace /></AuthenticatedShell>;
}
