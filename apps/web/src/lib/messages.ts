import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";
export type MessageThreadSummary = Readonly<{ id: string; householdId: string; activeMemberIsParticipant: boolean; unreadCount: number; deepLink: string; authorized: true }>;
export function createMessageThreadList(input: { context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[]; now: Date; configuration: HouseholdMiniAppConfiguration; threads: readonly MessageThreadSummary[] }): readonly MessageThreadSummary[] {
  if (!activationEligibility("messages", input.configuration).eligible) throw new Error("Messages mini-app must be enabled and eligible");
  if (!authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "messages.participate" } }).allowed) throw new Error("Active member may not participate in messages");
  return Object.freeze(input.threads.map((thread) => { if (thread.householdId !== input.context.householdId || !thread.authorized || !thread.activeMemberIsParticipant) throw new Error("Message thread must be authorized for the active participant and household"); if (thread.id.trim().length === 0 || !thread.deepLink.startsWith("/") || !Number.isSafeInteger(thread.unreadCount) || thread.unreadCount < 0) throw new Error("Message thread metadata must be bounded and safe"); return Object.freeze({ ...thread }); }).sort((left, right) => right.unreadCount - left.unreadCount));
}
/** Validates a send review without storing, returning, or logging message body or attachment data. */
export function proposeMessageSend(input: { context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[]; now: Date; configuration: HouseholdMiniAppConfiguration; thread: MessageThreadSummary; body: string }): Readonly<{ threadId: string; bodyLength: number; requiresConfirmation: true }> {
  createMessageThreadList({ context: input.context, role: input.role, grants: input.grants, now: input.now, configuration: input.configuration, threads: [input.thread] });
  if (input.body.trim().length === 0 || input.body.length > 4_000) throw new Error("Message body must be between 1 and 4000 characters");
  return Object.freeze({ threadId: input.thread.id, bodyLength: input.body.length, requiresConfirmation: true });
}
