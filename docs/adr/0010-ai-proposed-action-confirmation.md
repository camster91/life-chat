# ADR 0010: AI proposed-action confirmation

## Status

Accepted for the foundation; no AI mutation executor is enabled.

## Context

Chat can make intent easy to express but it cannot be treated as authorization
to affect household records, people, money, communications, data sharing, or
external systems. The user needs a reviewable normal UI and a safe retry model.

## Decision

- AI returns a structured `proposed` action, not a mutation. The proposal names
  the requested operation, affected canonical-record references, a bounded
  field-change summary, validation result, reversibility, expiry, and a stable
  idempotency key. It contains neither hidden instructions nor raw record
  content.
- A proposal is owned by the acting household member and household. Only that
  active member can confirm, reject, or replace it. Editing creates a new
  proposal and supersedes the old one; confirmation is never implied by chat
  text, a prior approval, or a UI navigation event.
- Confirmation is a two-stage operation. The server first records explicit
  confirmation, then immediately derives active household context again,
  reauthorizes the exact requested capability and resource, checks current
  domain validation and proposal expiry, and invokes an idempotent domain
  executor. A changed permission, record, or household context yields a safe
  denial rather than stale execution.
- The executor uses the proposal idempotency key. Repeated client requests,
  retries, or double-clicks return the same execution result and cannot repeat
  a side effect.
- Create, edit/supersede, confirm, reject, expired, denied, succeeded, and
  failed outcomes write redacted audit evidence with the proposal and
  execution references. The AI provider boundary receives no authorization to
  execute the action itself.
- Every action must have a normal UI that exposes the same fields and policy.
  Destructive, irreversible, financial, sharing, sending, membership, and
  external effects require a visible confirmation and may require additional
  domain-specific controls.

## Consequences

Product modules need typed operation schemas and idempotent domain commands
before they can be offered through AI. This provides a safe no-AI equivalent
and makes approvals inspectable, but a persistence layer, execution ledger,
and accessible review UI remain future work.

## Non-goals

- No generic executor, automatic confirmation, background confirmation, or AI
  self-approval is created.
- No approval is valid offline, across household changes, or after expiry.
- This does not decide domain-specific multi-party approval or parental-consent
  policies; those are explicit follow-up decisions.
