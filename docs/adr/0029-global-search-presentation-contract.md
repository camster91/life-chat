# ADR 0029: Global search presentation contract

## Status

Accepted for a safe result model and an authenticated, query-time retrieval
slice for Calendar, Shared Lists, and the active member's Chore assignments.
It does not create an index, semantic provider, analytics event, or broad
cross-app data access path.

## Decision

Search consumes only summaries already authorized for the active household
member. It verifies household scope, authorization marker, bounded display
fields, and application-relative normal-UI handoffs. It then matches a bounded
local query and groups results by canonical type.

Results owned by a disabled or ineligible mini-app are omitted from
presentation. The authenticated `/api/search` route derives the active member
and household server-side, then rechecks the member's current lifecycle, role,
and applicable app permission before each retrieval policy runs. Calendar
returns only household-visible records plus personal records owned by the active
member. Shared Lists returns only open lists/items to members with list-read
access. Chores returns only assignments to the active member. Guests cannot
search. Search never uses a client-supplied household ID as authority or sends
household content to an external semantic provider by default.

## Non-goals and verification

There is no index schema, semantic/vector provider, attachment text extraction,
conversation search, logging/analytics, pagination, ranking, or fuzzy search.
The normal UI presents grouped, application-relative handoffs and makes the
search boundary clear. Database integration proves cross-household exclusion,
personal-calendar isolation, assignee-only chores, and guest denial. Browser and
human screen-reader validation, richer visibility policies, and deliberate
indexing/ranking decisions remain required before #21 can close.
