# ADR 0027: Calendar agenda read model

## Status

Accepted for a read-only calendar shell foundation. It does not persist,
recurrence-expand, edit, notify, or import calendar records.

## Decision

An agenda consumes only already-authorized household records. All-day entries
remain date-only, without a timezone or instant. Timed entries retain original
local wall time, event IANA timezone, and derived exact instant; the model
rejects any mismatch. When filtering an agenda date, timed records are viewed
in the household timezone while source semantics remain unchanged.

The model rejects cross-household data, non-authorized items, unsafe external
links, malformed records, and DST-ambiguous/nonexistent local times. Each
entry links to its canonical normal UI. It performs no authorization decision
or data lookup; production services must derive context and record visibility
server-side before supplying items.

## Non-goals and verification

There is no calendar database, recurrence model, write flow, availability,
external sync, reminder, mutation proposal, or timezone preference UI. Tests
cover all-day versus timed semantics, cross-timezone household views,
household isolation, safe links, and instant integrity. Real route/UI and
browser/screen-reader validation remain required before #19 can close.
