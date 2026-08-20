# ADR 0033: Chores assignment model

## Status

Accepted for a persisted assignment model with adult assignment management and
assignee-only completion. An authenticated API and normal UI let adults create
chores for active non-guest household members, while children retain an
assignee-only view and completion path. It does not import ChoreChamps data,
award points, or schedule recurrence.

## Decision

Chores starts with generic, active-member assignment summaries. It requires the
Chores app to be eligible, validates household/member scope and bounded display
data, preserves optional due dates as date-only values, and returns no other
member’s assignments in the child-safe/default view. Adults with
`chores.manage` can view household assignments and create one for an active
adult or child through a bounded, idempotent command. Creation reauthorizes the
actor, rejects guest/inactive/cross-household assignees, and writes canonical,
audit, and outbox records in one serializable transaction. Completion
re-derives session/household context, reauthorizes the active assignee, uses a
bounded idempotency key, updates canonical state, and writes audit/outbox
evidence in a serializable transaction. It has no reward or allowance effect.

Adult household-management and assignment-creation views, recurrence,
reassignment, persisted exception grants, and recipient-specific notification
policy need separate contracts.

## Non-goals and verification

No ChoreChamps import, child behavior history, points, badges, reward ledger,
recurrence, reminder, reassignment, adult review queue, or exception-grant
management is included. Tests cover ordering, app eligibility,
member/household isolation, replay-safe creation/completion, guest denial, and
completed-state rejection. Browser, mobile, and human assistive-technology
validation remain before #25 can close.
