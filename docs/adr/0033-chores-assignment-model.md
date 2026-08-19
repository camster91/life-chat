# ADR 0033: Chores assignment model

## Status

Accepted for an assignee-only persisted read/detail model and idempotent
completion command. An authenticated API and normal UI now expose only the
active assignee's record and allow completion only when current role/capability
authorization permits it. It does not import ChoreChamps data, award points, or
schedule recurrence.

## Decision

Chores starts with generic, active-member assignment summaries. It requires the
Chores app to be eligible, validates household/member scope and bounded display
data, preserves optional due dates as date-only values, and returns no other
member’s assignments in the child-safe/default view. Completion re-derives
session/household context, reauthorizes the active assignee, uses a bounded
idempotency key, updates canonical state, and writes audit/outbox evidence in a
serializable transaction. It has no reward or allowance effect.

Adult household-management and assignment-creation views, recurrence,
reassignment, persisted exception grants, and recipient-specific notification
policy need separate contracts.

## Non-goals and verification

No ChoreChamps import, child behavior history, points, badges, reward ledger,
recurrence, reminder, assignment-creation UI, or adult management view is
included. Tests cover ordering, app eligibility, member/household isolation,
replay-safe persisted completion, and completed-state rejection. Runtime API,
browser, mobile, and assistive-technology validation remain before #25 can
close.
