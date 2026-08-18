# ADR 0026: Apps management proposals

## Status

Accepted for an authorized, read-only management view and review-only
configuration proposal. It does not persist any app configuration.

## Decision

The management view derives `mini-app.configure` authorization from the active
household context and renders the canonical registry, current enablement,
dependency eligibility, and enabled dependents. It does not infer authority
from the UI or client-provided household identifiers.

An authorized member may create a confirmation-required proposal to enable or
disable one app. The proposal is rejected if it repeats current state, enables
an app with missing dependencies, or disables an app with enabled dependents.
The proposal is not a write: a future server command must re-derive context,
reauthorize, re-check dependency/configuration versions, explicitly confirm,
persist atomically, emit audit/domain/outbox events, and retain disabled-app
data according to governance policy.

## Non-goals and verification

There is no settings form, member visibility override, configuration storage,
audit event, transaction, live toggle, or data deletion. Tests cover adult vs
child authorization, registry state, confirmation-only proposals, dependency
activation, and dependent-disable blocking. Browser/screen-reader testing and
the real configuration command remain required before issue #18 can close.
