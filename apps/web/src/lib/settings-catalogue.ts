import type { ActiveHouseholdContext } from "./identity-context";
import { authorize, type BaselineRole, type CapabilityGrant, type Permission } from "./permission-engine";

export type SettingsSection = Readonly<{ id: string; label: string; permission: Permission; sensitive: boolean }>;
const sections: readonly SettingsSection[] = [
  { id: "profile", label: "Your profile", permission: "profile.update-self", sensitive: false },
  { id: "notifications", label: "Notifications", permission: "notification.manage-self", sensitive: false },
  { id: "household", label: "Household", permission: "household.manage", sensitive: true },
  { id: "privacy", label: "Privacy and exports", permission: "privacy.manage", sensitive: true },
  { id: "export", label: "Export data", permission: "data.export", sensitive: true },
  { id: "ai", label: "AI providers", permission: "ai.configure", sensitive: true },
];

export function createSettingsCatalogue(input: { context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[]; now: Date }): readonly SettingsSection[] {
  return Object.freeze(sections.filter((section) => authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: section.permission } }).allowed));
}
