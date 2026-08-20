import { AuthenticatedShell } from "../authenticated-shell";
import { RewardsWorkspace } from "./rewards-workspace";
export default function RewardsPage() { return <AuthenticatedShell current="rewards"><RewardsWorkspace /></AuthenticatedShell>; }
