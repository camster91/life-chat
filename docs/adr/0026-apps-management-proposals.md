# ADR 0026: Apps management proposals

## Status

Accepted for an authorized management view, confirmation UI, and persisted
versioned configuration command. Per-app settings and member visibility remain
future work.

## Decision

The management view derives `mini-app.configure` authorization from the active
household context and renders the canonical registry, current enablement,
dependency eligibility, and enabled dependents. It does not infer authority
from the UI or client-provided household identifiers.

An authorized member may create a confirmation-required proposal to enable or
disable one app. The proposal is rejected if it repeats current state, enables
an app with missing dependencies, or disables an app with enabled dependents.
The proposal is not a write. Confirmation calls a server command that re-derives
context, reauthorizes, checks the expected configuration version and current
dependencies, and persists configuration, command replay record, audit event,
and outbox event in one serializable transaction. Command replay is allowed only
after reauthorization and must match the original actor, household, app, and
target state. Disabling changes configuration only and retains app data.

Adults with `mini-app.configure` see the full registry and may propose changes.
Children with household read access see only enabled eligible apps. Guests are
denied the Apps API. The client never supplies a trusted household identifier.

## Non-goals and verification

There is no per-app settings form, member visibility override, bulk change,
offline queue, or data deletion. Tests cover adult/child authorization,
registry state, confirmation-only proposals, dependency activation,
dependent-disable blocking, optimistic conflicts, replay safety, suspended
actors, transactions, and audit/outbox records. Authenticated browser coverage
for the mutation UI and human screen-reader testing remain before issue #18 can
close.
