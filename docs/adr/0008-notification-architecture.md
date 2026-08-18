# ADR 0008: Notification architecture

## Status

Accepted for the foundation; delivery adapters and persistence are follow-up work.

## Context

Life Chat needs timely, calm awareness without turning every household event into
an interruption or exposing private household information through a device
lock-screen or third-party delivery provider. Notifications are derived views of
canonical records, not a parallel source of truth.

## Decision

- The in-app notification centre is the required, canonical presentation
  surface. It is available when the recipient can access the app and is the
  only channel assumed in the initial foundation.
- A notification is a household-scoped, recipient-specific envelope containing
  a template identifier, safe reference IDs, an exact `deliverAt` instant,
  lifecycle state, optional deep link, and a source-derived idempotency key.
  It does not duplicate a message, attachment, prompt, or other private record
  content.
- `scheduled`, `available`, `read`, `dismissed`, `cancelled`, and `failed` are
  distinct states. A recipient may read or dismiss only their own available
  notification. Canonical-record changes can cancel a pending notification.
- Creation is driven by domain events through a future transactional outbox.
  The source event ID plus recipient and template forms the deduplication key;
  retrying delivery must not create another inbox notification.
- Recipient selection happens on the server and requires current household
  context plus the source-domain permission. Before inbox presentation or an
  external delivery, eligibility is rechecked; removed, expired, or no-longer
  authorized members do not receive it.
- Future email, push, or SMS channels are adapters behind the same envelope.
  They are disabled until explicit household preference, provider configuration,
  consent, retention, failure, and unsubscribe rules exist. External payloads
  must be generic and contain no household content, attachments, secret links,
  or personal data beyond what that channel strictly requires.
- Quiet hours are evaluated in the recipient's IANA timezone and defer a
  non-urgent delivery to the next allowed instant. The product has no bypass or
  emergency-alert promise in this foundation.
- Notification preference changes, creation, cancellation, delivery attempts,
  and state changes emit safe audit evidence. Delivery receipts are redacted;
  they cannot become a store of message or household content.

## Consequences

This establishes a usable inbox before external delivery complexity. It also
means product teams must use canonical links and templates instead of placing
private source content in notification payloads. A later implementation needs
a durable notification store, transactional outbox worker, preference UI,
provider adapters, retry/backoff policy, and accessibility validation.

## Non-goals

- No email, push, SMS, provider, background worker, or device permission is
  configured by this ADR.
- No guarantee of immediate delivery, emergency alerting, cross-device sync,
  or offline notification execution is made.
- Notifications do not grant access to their source records.
