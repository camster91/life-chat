# ADR 0039: Messages metadata and send review

## Status

Accepted for a thread-metadata read model and body-free send review. It does not store, display, transmit, or log message content.

## Decision

Messages has a distinct `messages.participate` permission. The thread list requires an eligible app, an active participant, and same-household authorized metadata; it exposes only opaque thread ID, unread count, and safe internal handoff. The send-review function validates a bounded body but returns only its length and thread ID, never the body, recipients, attachments, or private message content.

Future send/read/moderation commands must derive context server-side, enforce thread membership and retention policy, confirm consequential sends, reauthorize at execution, scan/authorize attachments separately, use idempotency, and persist message/audit/domain/outbox records atomically. Notification payloads remain generic and are reauthorized at delivery.

## Non-goals and verification

No thread/message database, body rendering, attachment, delivery, read-state write, moderation, retention, export, notification, or UI is included. Tests cover participation permission, guest denial, app gating, active participant/household isolation, and body-free review validation. Real commands/UI/accessibility validation remain before #31 can close.
