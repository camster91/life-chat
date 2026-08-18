export type ProposedActionState = "proposed" | "confirmed" | "rejected" | "superseded" | "executed" | "denied" | "failed" | "expired";

export type ProposedAction = Readonly<{
  id: string;
  householdId: string;
  actingMemberId: string;
  operation: string;
  affectedRecords: readonly Readonly<{ type: string; id: string }>[];
  fieldChangeSummary: readonly Readonly<{ field: string; before: string | null; after: string | null }>[];
  reversible: boolean;
  validation: "valid" | "invalid";
  expiresAt: string;
  idempotencyKey: string;
  state: ProposedActionState;
}>;

export type ProposedActionInput = Omit<ProposedAction, "state">;

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new Error(`${name} must be a bounded value`);
}

function assertFutureInstant(value: string, now: string): void {
  const expiry = Date.parse(value);
  const current = Date.parse(now);
  if (Number.isNaN(expiry) || Number.isNaN(current) || expiry <= current) {
    throw new Error("Proposal expiry must be a future exact instant");
  }
}

export function createProposedAction(input: ProposedActionInput, now: string): ProposedAction {
  for (const [name, value] of Object.entries({
    id: input.id,
    householdId: input.householdId,
    actingMemberId: input.actingMemberId,
    operation: input.operation,
    idempotencyKey: input.idempotencyKey,
  })) assertNonEmpty(value, name);
  assertFutureInstant(input.expiresAt, now);
  if (input.validation !== "valid") throw new Error("Invalid proposals cannot be offered for confirmation");
  return Object.freeze({
    ...input,
    affectedRecords: Object.freeze(input.affectedRecords.map((record) => Object.freeze({ ...record }))),
    fieldChangeSummary: Object.freeze(input.fieldChangeSummary.map((change) => Object.freeze({ ...change }))),
    state: "proposed" as const,
  });
}

export function confirmProposedAction(action: ProposedAction, actingMemberId: string, now: string): ProposedAction {
  if (action.actingMemberId !== actingMemberId) throw new Error("Only the proposing member may confirm an action");
  if (Date.parse(action.expiresAt) <= Date.parse(now)) return { ...action, state: "expired" };
  if (action.state !== "proposed") throw new Error("Only a proposed action may be confirmed");
  return { ...action, state: "confirmed" };
}

export function settleProposedAction(
  action: ProposedAction,
  outcome: Extract<ProposedActionState, "executed" | "denied" | "failed">,
  reauthorized: boolean,
): ProposedAction {
  if (action.state !== "confirmed") throw new Error("Only a confirmed action may be executed");
  if (!reauthorized && outcome === "executed") throw new Error("Execution requires confirmation-time authorization");
  return { ...action, state: reauthorized ? outcome : "denied" };
}

export function rejectOrSupersedeProposedAction(
  action: ProposedAction,
  actingMemberId: string,
  state: "rejected" | "superseded",
): ProposedAction {
  if (action.actingMemberId !== actingMemberId || action.state !== "proposed") {
    throw new Error("Only the proposing member may change a proposed action");
  }
  return { ...action, state };
}
