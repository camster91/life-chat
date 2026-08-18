# ADR 0028: Family management read model

## Status

Accepted for an authorized directory/read-model and review-only membership
change proposal. It does not invite, change a role, suspend, remove, or persist
any household setting.

## Decision

The directory receives only already-authorized, household-scoped summaries.
It verifies household scope and bounded display data, then renders them only
when the active member passes the server-derived `member.read` decision. This
keeps child and guest defaults from receiving a household directory merely from
a client-side view request.

Membership operations are proposals requiring confirmation. A later privileged
server command must re-derive active context, reauthorize `member.invite` or
`member.manage`, validate target/member lifecycle and last-adult safety,
explicitly confirm, persist atomically, revoke affected sessions/caches as
needed, and emit audit/domain/outbox events. Invitations must use separate
privacy-safe delivery and expiry controls.

## Non-goals and verification

There is no identity store, invitation delivery, role/capability persistence,
last-adult policy implementation, household preference form, session revocation,
audit/outbox transaction, or client mutation. Tests cover adult/child directory
boundaries, proposal-only behavior, household isolation, and bounded display
data. Browser/screen-reader testing and the real server command remain before
#20 can close.
