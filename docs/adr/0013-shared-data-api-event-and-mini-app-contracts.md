# ADR 0013: Shared data, API, event, and mini-app contracts

## Status

Accepted for the foundation; persistence and transport implementations remain
follow-up work.

## Decision

### Canonical ownership and visibility

Each canonical record has one owning service and one household scope. An owning
service defines its schema, validation, state transitions, export mapping, and
audit/event emission. A record can reference another service's opaque record
ID, but a mini-app cannot query or mutate another app's storage directly.
Cross-app use occurs through a versioned service contract, canonical deep link,
or domain event followed by a re-authorized lookup.

Every request is a server-derived active household context plus a declared
operation. The service resolves app enablement, baseline/granted capability,
record visibility, and target scope before reading or writing. Responses and
event consumers fail closed when a record household differs from the active
context. Child and guest views use the same server contract and receive only
fields they are authorized to see.

### Service and tool boundary

Internal server services are the initial API surface. Each versioned command or
query declares its operation, validated input/output schema, required
permission, app owner, data classification, audit action, and idempotency
requirement. HTTP routes, server actions, background workers, and AI tools are
thin adapters: they must derive context, call a service, and return the
service's safe result. They do not embed product authorization or directly
access another app's records.

Queries return permission-filtered canonical projections with stable opaque
cursor pagination. Commands that can write, send, export, schedule, or invoke
an external effect require a caller-supplied idempotency key scoped to the
household, operation, and actor. The durable command ledger and conflict policy
are required before persistence; a retry returns the original safe result.

AI tools receive the same service schemas, never a privileged bypass. A tool
may prepare a proposal but may not execute a consequential command outside ADR
0010's confirmation and reauthorization path.

### Events and outbox

Service writes atomically create the canonical update, required audit evidence,
and a versioned domain-event outbox record. The outbox publishes at least once;
consumers deduplicate by event ID, reauthorize before fetching a record, and
keep derived search/notification/projection state reconstructible from
canonical records. Event payloads contain only safe references, not household
content, messages, attachment bytes, prompts, credentials, or pre-signed URLs.

### Attachments

Attachments are a shared service, not app-owned public files. An attachment has
an opaque ID, owning record/service reference, household scope, lifecycle,
integrity/processing status, and retention/access policy. Upload, retrieve,
preview, transformation, sharing, export, and deletion each require a current
authorization decision. Storage references and short-lived delivery URLs are
never included in events, search results, notifications, audit metadata, or
client-owned canonical state.

### Mini-app contract

Each first-party registry entry supplies an app-owned schema version,
capabilities, route/deep-link factory, service/tool declarations, event types,
settings validator, export/import adapter, and retirement behavior. Shared
services own identity, authorization, time, audit, attachments, notifications,
search, recovery, and AI action orchestration. App disablement blocks ordinary
routes, commands, tools, search, and notification surfacing without deleting
records; authorized audit/export/recovery remains available.

## Verification and follow-up

The typed boundary verifies scope matching and event deduplication mechanics in
pure tests. Before a service is released, add schema validation, server-action
and route integration tests, storage transaction/outbox tests, authorization
tests across adult/child/guest and households, attachment access tests, and
consumer replay/rebuild tests. #44–#50 own governance, operations, fixtures,
rollout, and environment decisions; #33–#41 own import adapters and parity.

## Non-goals

- No public API, generic plugin SDK, database schema, event broker, object
  store, signed URL, or third-party mini-app execution is implemented here.
- No app gains permission to bypass record-level visibility, app configuration,
  deletion/retention policy, or AI confirmation requirements.
