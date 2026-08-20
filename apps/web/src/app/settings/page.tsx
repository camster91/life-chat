import { AuthenticatedShell } from "../authenticated-shell";
import { SettingsWorkspace } from "./settings-workspace";

export default function SettingsPage() {
  return <AuthenticatedShell current="settings"><SettingsWorkspace /></AuthenticatedShell>;
}
