# ADR 0006: Audit and domain events

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #7–#12, #43–#50

## Decision

Life Chat uses two distinct append-only records:

| Record | Purpose | Audience |
| --- | --- | --- |
| Audit event | Durable evidence of a security- or data-relevant attempted or completed action. | Authorized household/audit reviewers and tightly controlled operations access. |
| Domain event | A delivery-oriented notice that a canonical aggregate changed so an internal consumer may update a projection, notification, search index, or workflow. | Authorized internal consumers only. |

Neither record is a data replica, a chat transcript, or a general application log. An audit event is written in the same transactional boundary as its state change when storage exists. A domain event carries an immutable event ID for at-least-once consumer idempotency; a later outbox implementation in #43 guarantees durable publication.

## Audit envelope

Every audit event contains an opaque event ID, exact UTC occurrence instant, household ID, actor reference (member, authenticated subject, system, or integration), action code, target type/opaque ID, outcome (`succeeded`, `denied`, or `failed`), correlation ID, optional causation ID, and safe metadata.

Safe metadata is constrained to stable codes, bounded non-sensitive values, and opaque IDs. It must never contain session/cookie/token values, credentials, secrets, prompts, message body, attachment contents, full request/response payloads, payment data, direct contact data, or raw user-provided text. Forbidden metadata keys fail closed at construction; correction/audit context is recorded as a new event rather than altering an old event.

## Domain-event envelope

A domain event contains event/schema version, event ID, occurred-at instant, household ID, aggregate type/opaque ID, event type, correlation/causation IDs, and references to canonical data. Its payload cannot contain copies of private aggregate content. Consumers must re-authorize/retrieve the canonical record and deduplicate by event ID.

## Query, integrity, and retention

- Audit events are append-only and cannot be edited/deleted through product UI. Retention/deletion exceptions require governance in #12/#44 and leave a permitted destruction/audit record.
- Audit queries are household-scoped and require `audit.read`; child and guest members receive no general audit access. Operational access is separately constrained, logged, and never a bypass for product authorization.
- Correlation IDs are generated at the server boundary, propagated through internal work, and are not session IDs or client-trusted identifiers.
- Application logs may carry correlation/trace context but are separate from audit events and inherit the same redaction constraints.
- Failed authorization, grants/role changes, invitations, member lifecycle, configuration, exports, imports, provider configuration, AI proposal/confirmation/execution, and destructive actions are auditable event classes.

## Non-goals

- A database table/outbox, log vendor, analytics pipeline, event bus, or operational dashboard.
- Storing complete before/after values, transcripts, prompts, attachments, or a forensic capture of every read.
- Replacing resource authorization, notification policy, or migration reconciliation.

## Verification

Pure tests prove event IDs/correlation IDs are opaque, safe metadata is bounded, secrets/content-shaped keys fail closed, audit outcome is explicit, and domain events expose references rather than copied payloads. Future integration tests must prove transactional persistence, access controls, outbox retries, retention, and authorized audit UI behavior.
