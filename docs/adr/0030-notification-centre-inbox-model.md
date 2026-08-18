# ADR 0030: Notification Centre inbox model

## Status

Accepted for a read-only inbox presentation model. It does not schedule,
deliver, mark read, dismiss, send, or persist notifications.

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

No preference UI, channel adapter, delivery worker, notification database,
read/dismiss command, push/email payload, batching, or accessibility UI is
included. Tests cover presentable-state filtering, ordering, household/recipient
isolation, and safe links. Real delivery/preferences and browser/screen-reader
validation remain required before #22 can close.
