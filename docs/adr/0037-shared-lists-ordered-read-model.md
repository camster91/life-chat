# ADR 0037: Shared Lists ordered read model

## Status

Accepted for a read-only ordered list view and completion proposal. It does not write, reorder, merge, sync offline, or persist list data.

## Decision

Shared Lists requires an eligible mini-app and accepts only authorized household-scoped item summaries. It enforces unique non-negative positions, bounded labels, internal deep links, and self-scoped assignment indication. Completion is a confirmation-required proposal, not a state change.

Future writes must derive active context server-side, reauthorize list/item access, validate list version and ordering, resolve offline conflicts as specified in ADR 0007, confirm consequential changes, use idempotency, and persist canonical/audit/domain/outbox events atomically. Groceries is a dependent view and may not bypass these controls.

## Non-goals and verification

No list store, create/edit/reorder/delete command, assignment mutation, offline queue, conflict resolution, export, UI, or notification exists here. Tests cover app gating, ordering, household isolation, safe links, proposal-only completion, and completed-state rejection. Real commands/UI/accessibility validation remain before #29 can close.
