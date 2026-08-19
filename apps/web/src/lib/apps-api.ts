import type { MiniAppId } from "./mini-app-registry";

export type AppConfigurationSummary = Readonly<{ id: MiniAppId; label: string; enabled: boolean; eligible: boolean; version: number; dependencies: readonly string[]; enabledDependents: readonly string[] }>;
export type AppsApiResponse = Readonly<{ canManage: boolean; apps: readonly AppConfigurationSummary[] }>;
