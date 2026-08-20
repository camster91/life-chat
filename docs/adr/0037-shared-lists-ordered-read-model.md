# ADR 0037: Shared Lists ordered read model

## Status

Accepted for the ordered read model, persisted create-list/add-item/complete/reopen commands, household-scoped reads, and the first normal UI. It does not yet reorder, edit, archive, assign, merge, or sync offline.

## Decision

Shared Lists requires an eligible mini-app and accepts only authorized household-scoped item summaries. It enforces unique non-negative positions, bounded labels, internal deep links, and self-scoped assignment indication. Completion is confirmation-required in the normal UI and a persisted state change only after server reauthorization.

The initial create-list/add-item commands derive active context server-side, reauthorize `lists.manage` and Shared Lists enablement before both first execution and idempotent replay, scope list access to the active household, use serializable transactions and replay-safe command IDs, and persist audit/outbox events. Item replay must also match the original list. Groceries is a dependent view and may not bypass these controls.

Adults and children receive `lists.read` and `lists.complete`; only adults receive baseline `lists.manage`. Guests remain deny-by-default. Read repositories reload the active member and mini-app configuration inside a serializable transaction, return only open lists in the active household, and use a not-found boundary for list-detail isolation. The mobile-first UI supports viewing lists and ordered items, adult-only creation forms, and explicit inline confirmation before completion and adult reopening. Completion carries the item version and a retained command ID, reauthorizes inside a serializable transaction, rejects stale versions, and writes the item state, list version, audit event, and outbox event atomically. A replay must match the original household, list, item, and completing member. Reopening is an adult-only `lists.manage` command with its own retained command ID; it clears completion attribution only after the same household, enabled-app, state, and version checks pass, then writes a separate audit and outbox event atomically.

## Non-goals and verification

No edit/reorder/archive/delete command, assignment mutation, offline queue, automatic conflict resolution, export, or notification exists here. Local PostgreSQL integration tests cover enablement gating, replay-safe creation/completion/reopen, adult/child/guest permission boundaries, inactive-member denial, stale-version rejection, cross-list/member/household isolation, ordered reads, and audit/outbox writes. Browser and assistive-technology evidence, recovery, export, and the remaining mutation UI all remain before #29 can close.
