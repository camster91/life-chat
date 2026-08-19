# ADR 0028: Family management read model

## Status

Accepted and implemented for an authorized directory and confirmed
suspend/remove slice. It does not invite, change a role/capability, restore a
member, or persist any household preference.

## Decision

The repository re-derives the active member and does not query the household
directory unless that member passes the server-side `member.read` decision.
Returned summaries verify household scope, bounded display data, account-link
status, lifecycle, and optional exact expiry. This keeps child and guest
defaults from receiving a household directory merely from a client-side view
request or stale shell state.

The normal UI first creates a local review state for suspend/remove and sends no
mutation until explicit confirmation. The server then re-derives active
context, reloads and reauthorizes the actor with `member.manage`, scopes the
target to the same household, validates active lifecycle and last-adult safety,
and persists the lifecycle, replay-bound command, audit event, and outbox event
atomically. A command replay is accepted only for the same actor, target,
household, and operation. Membership reads are uncached, so a suspended or
removed member loses application access on the next request without deleting
their provider account or unrelated household memberships.

Invitations continue to use separate privacy-safe token delivery and expiry
controls. Their existing backend contract is not exposed by this UI slice.

## Non-goals and verification

There is no invitation delivery UI, role-change command, capability-grant
store, restore/reactivation flow, household preference form, or dedicated
provider-session revocation policy. Tests cover adult/child directory
boundaries, household isolation, inactive actors, last-adult safety, replay
binding, atomic audit/outbox evidence, and bounded display data. Authenticated
desktop/mobile browser and automated accessibility checks cover the review and
confirmed suspend path. Human screen-reader/usability review and the remaining
management surfaces are still required before #20 can close.
