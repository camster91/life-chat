# ADR 0024: Today dashboard read model

## Status

Accepted for the presentation model and authenticated database-backed Today
slice for the active member's due Chore assignments. The API derives the active
member from the verified session and revalidated active-member cookie, derives
the calendar date from the stored household IANA timezone, and returns only safe
summary fields. It does not create a notification, calendar mutation, or AI
action.

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
The implemented caller does so and refuses missing, expired, ambiguous, or
cross-subject context rather than accepting household/member identifiers from
the browser.

## Non-goals and verification

There is no persisted Today feed, priority algorithm, calendar recurrence,
analytics, or notification delivery. The query returns only enabled, due-today
Chores assigned to the active member and links to a recipient-scoped normal UI
detail/completion path. Database integration proves another household member
cannot see or complete the assignment, and unit tests cover timezone date
boundaries and protocol-relative-link rejection. Runtime session/database,
browser, physical-device, and assistive-technology validation remain pending,
as do broader Today sources and offline/stale behavior.
