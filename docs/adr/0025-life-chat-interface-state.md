# ADR 0025: Life Chat interface state

## Status

Accepted for a provider-independent presentation model. It does not connect to
an AI provider, retain conversations, call tools, execute actions, or replace
normal UI.

## Decision

The conversation surface is built from already-authorized, household-scoped
messages and explicit state: idle, streaming, unavailable, or failed. The
interface has bounded message text and safe application-relative citations so a
member can open the normal UI for every important result. Retry appears only
after a failed stream; unavailable is a clear state, not a misleading retry.

Consequential work is represented only by a reference to an existing
`ProposedAction`. A message cannot reference an unprovided proposal and every
proposal must match the active household and acting member. Rendering a proposal
does not confirm, reauthorize, execute, or audit it; ADR 0010 remains the only
confirmation/execution path.

## Non-goals and verification

This adds no provider SDK, streaming transport, persistence, transcript export,
tool call, prompt logging, citation retrieval, or AI mutation. Production work
still needs server-side authorization/retrieval, accessibility and error-state
browser validation, rate limits, usage policy, audit/outbox integration, and
normal-UI route implementations. Unit tests cover retry state, safe handoffs,
household/member isolation, and proposal-reference integrity.
