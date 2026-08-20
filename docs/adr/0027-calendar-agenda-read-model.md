# ADR 0027: Calendar agenda read model

## Status

Accepted and implemented for the first calendar shell slice: authorized reads
and adult-created household all-day events. It does not edit, delete,
recurrence-expand, notify, or import calendar records.

## Decision

Calendar records are persisted in the canonical database and always queried
through the active member and household boundary. Adults and children have the
initial `calendar.read` baseline permission. Guests are explicitly denied in
this slice. Household-visible records are available to eligible members;
personal records are available only to their owning member. The database uses
a composite household/member foreign key so a personal owner cannot cross a
household boundary.

An agenda consumes only these already-authorized records. All-day entries
remain date-only, without a timezone or instant. Timed entries retain original
local wall time, event IANA timezone, and derived exact instant; the model
rejects any mismatch. Ranges use an exclusive end and appear on every household
day they overlap. When filtering an agenda date, timed records are viewed in
the household timezone while source semantics remain unchanged.

The responsive `/calendar` normal UI provides previous, next, and date-picker
navigation. The server chooses today's date in the household timezone, and
each agenda entry has an application-relative deep link back to its canonical
place in that day. Adults also receive `calendar.manage` and can add one
household-visible, all-day item for the selected date through the normal UI.
The server derives identity and household context, validates a bounded title
and date-only range, retains a creation command ID for replay safety, and
writes the record, audit event, and outbox event in one serializable
transaction. Children and guests cannot create an item.

The model rejects cross-household data, non-authorized items, unsafe external
links, malformed records, and DST-ambiguous/nonexistent local times. Each
entry links to its canonical normal UI. The pure aggregator makes no
authorization decision; the repository performs that decision server-side
before supplying items.

## Non-goals and verification

There is no recurrence model, participant model, timed or personal creation,
edit/delete flow, availability, external sync, reminder, mutation proposal,
or timezone preference UI. Tests cover all-day versus timed semantics,
overlapping ranges, cross-timezone household views, role/member/household
isolation, create replay safety, database constraints, safe links, and instant
integrity. Authenticated browser validation, human screen-reader review, and
the remaining write/recurrence decisions are still required before #19 can
close.
