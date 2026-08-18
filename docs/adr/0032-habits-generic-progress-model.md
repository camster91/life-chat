# ADR 0032: Habits generic progress model

## Status

Accepted for a generic, read-only habits foundation and completion proposal. It
does not import LifeStreak data, write a completion, send a reminder, or store
streak records.

## Decision

Habits uses generic household/member-scoped routines with date-only completion
history. It validates each unique date through the shared date contract and
calculates current streaks transparently from consecutive dates including the
chosen household-local day. Streaks are a derived view, never a source of truth
or gamified pressure mechanism.

The model requires the Habits mini-app to be enabled/eligible and only accepts
an already-authorized routine belonging to the active member in the active
household. A new completion becomes a confirmation-required proposal, not a
write. Future execution must reauthorize, revalidate the date/configuration,
use idempotency, persist/audit atomically, and apply notification policy.

## Non-goals and verification

No LifeStreak export/device store, spiritual content, native schedule, reminder,
offline queue, routine store, history write, migration, or provider action is
included. Tests cover streak semantics, app eligibility, proposal-only behavior,
household/member isolation, duplicate history, and duplicate completion. Real
UI, persistence, reminders, and UX/accessibility validation remain before #24
can close.
