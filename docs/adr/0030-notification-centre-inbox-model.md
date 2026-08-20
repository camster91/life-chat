# ADR 0030: Notification Centre inbox model

## Status

Accepted for the inbox presentation model, durable recipient-scoped inbox
loading, replay-safe read/dismiss state, and local release of due scheduled
envelopes. Recipient reminder enablement and quiet-hour policy are persisted and
evaluated locally. The authenticated normal UI now renders the inbox and
preference controls. It does not yet define event-to-template selection policy,
send, or externally deliver notifications.

## Decision

The inbox accepts only existing notification metadata whose household and
recipient match the active server-derived context. It renders only `available`
and `read` states, newest first, with generic template IDs and safe
application-relative canonical-record links. It intentionally never renders
notification source content, event payload, record body, attachment, or
delivery-channel data.

Inbox loading reloads the active member and requires
`notification.manage-self` before querying recipient envelopes. Read and
dismiss remain separate server-side commands using the existing state machine.
They reauthorize the recipient, validate current state, write
audit/domain/outbox evidence atomically, and do not turn inbox rendering into
an external delivery side effect. Dismissal requires a visible UI review and
works for either an available or already-read inbox item.

The preferences UI changes only future reminder policy. It makes clear that
disabling reminders or enabling quiet hours does not disable or erase the
canonical in-app inbox. Preference writes reauthorize the current member and
retain an explicit IANA timezone.

## Non-goals and verification

No channel adapter, externally configured worker, push/email payload, batching,
or event-selection policy is included. A local PostgreSQL store,
member-scoped preference repository, DST-aware quiet-hour evaluator, idempotent
same-household event scheduling, recipient-scoped inbox query, replay-safe
read/dismiss commands, and household-bounded due-envelope release operation now
exist with audit/outbox evidence. Release rechecks
recipient household membership, lifecycle, and guest expiry; ineligible
recipients are cancelled. Integration tests cover scheduling replay,
cross-household denial (including a database constraint), preference
authorization, eligible release, expired-recipient cancellation,
wrong-recipient denial, and read/dismiss replay. Authenticated desktop/mobile
browser checks cover inbox read/dismiss, preference persistence, navigation,
and automated accessibility. Real delivery, event-selection policy, scheduler
operations, and human screen-reader/usability validation remain required before
#22 can close.
