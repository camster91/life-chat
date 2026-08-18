# ADR 0033: Chores assignment model

## Status

Accepted for an assignee-only read model and review-only completion proposal. It
does not import ChoreChamps data, write a completion, award points, or schedule
recurrence.

## Decision

Chores starts with generic, active-member assignment summaries. It requires the
Chores app to be eligible, validates household/member scope and bounded display
data, preserves optional due dates as date-only values, and returns no other
member’s assignments in the child-safe/default view. Completion is a
confirmation-required proposal only; it has no reward or allowance effect.

Future execution must re-derive context, reauthorize assignment visibility and
completion policy, revalidate lifecycle/date, use an idempotency key, write
canonical/audit/domain/outbox events atomically, and apply recipient-specific
notifications. Adult household-management views, recurrence, reassignment, and
exception permissions need separate contracts.

## Non-goals and verification

No ChoreChamps import, child behavior history, points, badges, reward ledger,
recurrence, reminder, assignment store, completion write, or UI is included.
Tests cover ordering, app eligibility, member/household isolation, proposal-only
completion, and completed-state rejection. Real commands/UI and accessibility
validation remain before #25 can close.
