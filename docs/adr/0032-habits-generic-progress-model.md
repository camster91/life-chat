# ADR 0032: Habits generic progress model

## Status

Accepted for generic personal routines, derived streaks, and confirmation-led
completion. It does not import LifeStreak data, send a reminder, or store a
separate streak record.

## Decision

Habits uses generic household/member-scoped routines with date-only completion
history. It validates each unique date through the shared date contract and
calculates current streaks transparently from consecutive dates including the
chosen household-local day. Streaks are a derived view, never a source of truth
or gamified pressure mechanism.

The model requires the Habits mini-app to be enabled/eligible and only accepts
an already-authorized routine belonging to the active member in the active
household. Adults receive `habits.manage` and can create a routine for
themselves; adults and children can read and record only their own routines.
Guests remain denied. The normal UI proposes a completion and requires explicit
Confirm/Cancel before writing.

Routine creation and completion derive active identity/household context on the
server, reauthorize the relevant capability and app eligibility in a
serializable transaction, retain an idempotency command ID, and write audit and
outbox evidence atomically. Completion date is derived from the server `now`
and household timezone—not client input—so it cannot be shifted across a local
day boundary. A routine can have one completion per household-local date.

## Non-goals and verification

No LifeStreak export/device store, spiritual content, native schedule, reminder,
offline queue, edit/archive, import/migration, or provider action is included.
Tests cover streak semantics, app eligibility, personal/household isolation,
timezone-derived dates, replay-safe creation/completion, duplicate completion,
and audit/outbox writes. Reminder, recovery/export, authenticated browser,
screen-reader, and usability validation remain before #24 can close.
