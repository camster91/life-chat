# ADR 0024: Today dashboard read model

## Status

Accepted for a presentation-only foundation. It does not create a data query,
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

There is no persisted Today feed, date query, priority algorithm, calendar
recurrence handling, completion action, search, analytics, or notification
delivery. Follow-up work requires database-backed authorization tests and
usability validation, especially adult/child/guest, no-provider, offline, and
empty/error states. Unit tests cover date-only semantics, calm item cap,
household isolation, and safe deep links.
