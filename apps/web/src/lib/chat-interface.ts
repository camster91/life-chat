import type { ActiveHouseholdContext } from "./identity-context";
import type { ProposedAction } from "./ai-proposed-action";

export type ChatMessageRole = "member" | "assistant" | "system";
export type ChatStreamStatus = "idle" | "streaming" | "unavailable" | "failed";

export type ChatCitation = Readonly<{ label: string; deepLink: string }>;
export type ChatMessage = Readonly<{
  id: string;
  householdId: string;
  role: ChatMessageRole;
  text: string;
  citations: readonly ChatCitation[];
  proposedActionId: string | null;
}>;

export type ChatInterfaceState = Readonly<{
  status: ChatStreamStatus;
  messages: readonly ChatMessage[];
  proposedActions: readonly ProposedAction[];
  canRetry: boolean;
}>;

function assertBounded(value: string, name: string, maximum = 200): void {
  if (value.trim().length === 0 || value.length > maximum) throw new Error(`${name} must be a bounded value`);
}

function assertMessage(message: ChatMessage, context: ActiveHouseholdContext): void {
  assertBounded(message.id, "Chat message ID");
  assertBounded(message.text, "Chat message text", 4_000);
  if (message.householdId !== context.householdId) throw new Error("Chat message household must match active context");
  for (const citation of message.citations) {
    assertBounded(citation.label, "Citation label");
    if (!citation.deepLink.startsWith("/")) throw new Error("Chat citations must use application-relative deep links");
  }
}

/**
 * Builds a UI-ready, non-persistent chat state from already-authorized data.
 * Provider calls, tool execution, persistence, and audit events stay outside it.
 */
export function createChatInterfaceState(input: {
  context: ActiveHouseholdContext;
  status: ChatStreamStatus;
  messages: readonly ChatMessage[];
  proposedActions?: readonly ProposedAction[];
}): ChatInterfaceState {
  input.messages.forEach((message) => assertMessage(message, input.context));
  const proposedActions = input.proposedActions ?? [];
  for (const action of proposedActions) {
    if (action.householdId !== input.context.householdId || action.actingMemberId !== input.context.memberId) {
      throw new Error("Chat proposed action must match active member and household");
    }
  }
  const proposalIds = new Set(proposedActions.map((action) => action.id));
  for (const message of input.messages) {
    if (message.proposedActionId !== null && !proposalIds.has(message.proposedActionId)) {
      throw new Error("Chat message may reference only a supplied proposed action");
    }
  }
  return Object.freeze({
    status: input.status,
    messages: Object.freeze(input.messages.map((message) => Object.freeze({ ...message, citations: Object.freeze(message.citations.map((citation) => Object.freeze({ ...citation }))) }))),
    proposedActions: Object.freeze([...proposedActions]),
    canRetry: input.status === "failed",
  });
}
