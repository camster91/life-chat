# ADR 0005: Date, time, and timezone rules

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #6, #7–#11, #16, #19, #24–#32, #38–#41

## Decision

Life Chat distinguishes three temporal meanings and never infers one from another:

| Meaning | Canonical representation | Examples |
| --- | --- | --- |
| Date-only | ISO calendar date (`YYYY-MM-DD`), no timezone or midnight conversion | birthdays, all-day events, due dates, meal-plan days |
| Wall-clock date/time | ISO local date/time plus an IANA timezone ID | a household appointment at 09:00 in Toronto |
| Exact instant | UTC instant | audit timestamps, message sent time, executed notification time |

Household timezone is an IANA timezone and supplies the default for new household-scheduled records. A member's timezone is a display/preference default only; it never rewrites the event's original time semantics. An event stores its own IANA timezone because a household may coordinate travel or remote participants.

## Timed and all-day records

- Timed records persist local start/end values, IANA timezone, and derived exact instants. The local representation remains authoritative for recurring schedules; exact instants are used for ordering/execution.
- All-day records persist an inclusive start date and exclusive end date. They are not converted to UTC or another member's calendar day.
- A due date is date-only unless an explicit time is chosen. A timed deadline is a timed record and shows its timezone.
- Audit, delivery, and execution events are UTC instants. Display happens only at the boundary using the viewer's selected timezone.

## DST and timezone policy

- Persist region-based IANA IDs, never fixed offsets, as the timezone authority.
- Creating a timed value that falls in a skipped or repeated DST wall-clock interval is rejected. The UI must ask for a valid time or, for a repeated time, an explicit earlier/later occurrence. It must not silently shift an action.
- Recurrence preserves the original local wall-clock rule and timezone; each occurrence resolves under the then-current timezone rules. The first version supports only recurrence forms that carry this timezone context. Floating, timezone-less timed recurrence is out of scope.
- Importers must supply enough temporal context to map a value safely. Missing/ambiguous timezone data is a dry-run validation error, not a guessed conversion.

## Display and notifications

- Show a timed record in the viewer's timezone by default and show its original timezone when different or material to the action.
- Use the household timezone when a member has no display preference. Locale/12-hour preference changes formatting only.
- Today groups all-day items by the active household's calendar date and timed items by the viewer's display timezone, with an explicit original-zone indicator when necessary.
- Notification scheduling uses the event's resolved instant; delivery preferences do not change the record's time.

## Implementation rules

- Use Temporal through the `@js-temporal/polyfill`; do not parse date-only strings with `Date` or derive timezone from a server/browser default.
- Parse external data at an adapter boundary, validate IANA IDs, and carry temporal type explicitly across APIs/events.
- Exact PostgreSQL instants use `timestamptz`. Every Prisma PostgreSQL adapter
  session is forced to UTC through the shared adapter factory; otherwise the
  adapter can parse the database host's rendered wall time as UTC and shift an
  instant. Integration fixtures must use the same factory as the application.
- Calendar/mini-app code must use shared constructors/helpers and test DST transitions. A later recurrence adapter may implement RFC 5545 parsing but cannot change these semantics.

## Non-goals

- Full recurrence editor/parser, external calendar synchronization, non-Gregorian calendars, or an offline synchronization implementation.
- Backfilling legacy data or deciding its import mappings; those are migration work.

## Verification

Unit tests prove date-only values stay zone-free, timed values resolve to UTC instants in an IANA zone, and both missing and repeated DST local times require an explicit resolution. Calendar integration and authenticated browser tests now cover physical exact-instant round trips and source-zone display. Recurrence, notification delivery, and import coverage remain follow-up work.
