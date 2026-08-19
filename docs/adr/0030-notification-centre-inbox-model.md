# ADR 0030: Notification Centre inbox model

## Status

Accepted for the inbox presentation model, durable recipient-scoped inbox
loading, mark-read state, and local release of due scheduled envelopes. It does
not yet create schedules from domain events, dismiss, send, or externally
deliver notifications.

## Decision

The inbox accepts only existing notification metadata whose household and
recipient match the active server-derived context. It renders only `available`
and `read` states, newest first, with generic template IDs and safe
application-relative canonical-record links. It intentionally never renders
notification source content, event payload, record body, attachment, or
delivery-channel data.

Read and dismiss remain separate server-side commands using the existing state
machine. Those commands must reauthorize the recipient, validate current state,
write audit/domain/outbox evidence atomically, and not turn inbox rendering
into an external delivery side effect.

## Non-goals and verification

No preference UI, channel adapter, externally configured worker, dismiss
command, push/email payload, batching, or accessibility UI is included. A local
PostgreSQL store, recipient-scoped inbox query, replay-safe mark-read command,
and bounded due-envelope release operation now exist with audit/outbox
evidence. Release rechecks recipient household membership, lifecycle, and guest
expiry; ineligible recipients are cancelled. Integration tests cover eligible
release, expired-recipient cancellation, wrong-recipient denial, and read
replay. Real delivery/preferences and browser/screen-reader validation remain
required before #22 can close.
