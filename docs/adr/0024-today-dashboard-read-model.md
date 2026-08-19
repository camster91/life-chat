# ADR 0024: Today dashboard read model

## Status

Accepted for the presentation model plus an initial database-backed read slice
for the active member's due Chore assignments. It does not create an
authentication flow, notification, calendar mutation, or AI action.

## Decision

Today is a small, read-only aggregation of summaries that the calling service
has already authorized for the active household member. The initial model
accepts date-only records, filters them to the chosen household-local date,
sorts them deterministically, and shows at most three items plus an overflow
count. Each item has a canonical normal-UI deep link; chat is never required.

The model rejects cross-household records, non-authorized inputs, malformed
date-only values, unbounded display data, and external deep links. It does not
make authorization decisions or fetch data; production callers must derive the
household context server-side and enforce record visibility before aggregation.

## Non-goals and verification

There is no persisted Today feed, priority algorithm, calendar recurrence
handling, completion action, analytics, or notification delivery. The initial
query returns only enabled, due-today Chores assigned to the active member;
database integration proves another household member cannot see them. Follow-up
work requires broader sources and usability validation, especially
adult/child/guest, no-provider, offline, and empty/error states.
