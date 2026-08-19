# ADR 0037: Shared Lists ordered read model

## Status

Accepted for the ordered read model and an initial persisted create-list/add-item command slice. It does not yet reorder, edit, archive, assign, complete, merge, sync offline, or provide UI.

## Decision

Shared Lists requires an eligible mini-app and accepts only authorized household-scoped item summaries. It enforces unique non-negative positions, bounded labels, internal deep links, and self-scoped assignment indication. Completion is a confirmation-required proposal, not a state change.

The initial create-list/add-item commands derive active context server-side, reauthorize `lists.manage`, check Shared Lists enablement, scope list access to the active household, use serializable transactions and replay-safe command IDs, and persist audit/outbox events. Groceries is a dependent view and may not bypass these controls.

## Non-goals and verification

No edit/reorder/archive/delete command, assignment mutation, completion execution, offline queue, conflict resolution, export, UI, or notification exists here. Local PostgreSQL integration tests cover enablement gating, replay-safe creation, and audit/outbox writes. Version-conflict, cross-household command, accessibility, recovery, and normal UI evidence remain before #29 can close.
