# ADR 0038: Projects lightweight read model

## Status

Accepted for lightweight canonical project/task records plus the initial read-model contract. It does not yet expose a project command or UI.

## Decision

Projects depends on Shared Lists and uses already-authorized household-scoped project summaries. It exposes bounded labels, personal/household scope, lifecycle status, and safe calendar handoffs; it does not duplicate a general-purpose PM system. Status changes are confirmation-required proposals only.

Project/task records are household-scoped and may retain optional opaque references to canonical Shared Lists or Calendar records; those references do not copy or mutate the linked record. Adults receive `projects.manage`; adults and children receive `projects.read`; guests remain denied. Future commands must derive context server-side, reauthorize visibility and manage capability, validate project/task/list/calendar versions, confirm, apply idempotently, and write canonical/audit/domain/outbox evidence. Cross-app references must use safe canonical links, not direct storage access.

## Non-goals and verification

No assignment, recurrence, workflow, external PM sync, calendar mutation, import, UI, or notification is included. The schema is intentionally only the canonical storage boundary; real commands, integration evidence, and UI/accessibility validation remain before #30 can close.
