# ADR 0038: Projects lightweight read model

## Status

Accepted for a lightweight, read-only project view and status-change proposal. It does not create or mutate projects/tasks.

## Decision

Projects depends on Shared Lists and uses already-authorized household-scoped project summaries. It exposes bounded labels, personal/household scope, lifecycle status, and safe calendar handoffs; it does not duplicate a general-purpose PM system. Status changes are confirmation-required proposals only.

Future commands must derive context server-side, reauthorize visibility and manage capability, validate project/task/list/calendar versions, confirm, apply idempotently, and write canonical/audit/domain/outbox evidence. Cross-app references must use safe canonical links, not direct storage access.

## Non-goals and verification

No project/task store, assignment, recurrence, workflow, external PM sync, calendar mutation, import, UI, or notification is included. Tests cover dependency gating, household isolation, safe calendar links, status proposal behavior, and duplicate-status rejection. Real commands/UI/accessibility validation remain before #30 can close.
