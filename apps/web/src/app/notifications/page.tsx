import { AuthenticatedShell } from "../authenticated-shell";
import { NotificationsWorkspace } from "./notifications-workspace";

export default function NotificationsPage() {
  return <AuthenticatedShell current="notifications"><NotificationsWorkspace /></AuthenticatedShell>;
}
