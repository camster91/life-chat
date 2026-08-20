import type { SettingsSection } from "./settings-catalogue";

export type SettingsApiResponse = Readonly<{
  householdName: string;
  displayName: string;
  sections: readonly SettingsSection[];
}>;
