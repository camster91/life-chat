# ADR 0008: Notification architecture

## Status

Accepted for the foundation. The in-app envelope store, idempotent scheduling
from an existing domain event, household-bounded due-envelope release, and
recipient preference/quiet-hour policy are implemented locally. Event-to-template
policy, preference UI, and delivery adapters remain follow-up work.

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
- Creation is driven by domain events through the transactional outbox. The
  local scheduling operation requires an existing same-household source event
  and an eligible recipient. The source event ID plus recipient and template
  forms the deduplication key; retrying creation must not create another inbox
  notification or duplicate audit/outbox evidence.
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
  emergency-alert promise in this foundation. Local persisted preferences use
  minute-of-day wall-clock bounds. A skipped or repeated quiet-hour end resolves
  to the later safe instant so a DST transition does not notify earlier than the
  recipient requested.
- Notification preference changes, creation, cancellation, delivery attempts,
  and state changes emit safe audit evidence. Delivery receipts are redacted;
  they cannot become a store of message or household content.

## Consequences

This establishes the durable core of a usable inbox before external delivery complexity. It also
means product teams must use canonical links and templates instead of placing
private source content in notification payloads. A later implementation needs
event-to-template and recipient-selection policy, an externally configured
scheduler, preference UI, provider adapters, retry/backoff policy, and
accessibility validation.

## Non-goals

- No email, push, SMS, provider, background worker, or device permission is
  configured by this ADR.
- No guarantee of immediate delivery, emergency alerting, cross-device sync,
  or offline notification execution is made.
- Notifications do not grant access to their source records.
