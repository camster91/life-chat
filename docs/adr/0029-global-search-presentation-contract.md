# ADR 0029: Global search presentation contract

## Status

Accepted for a safe, presentation-only result model. It does not create an
index, query storage, provider, analytics event, or data access path.

## Decision

Search consumes only summaries already authorized for the active household
member. It verifies household scope, authorization marker, bounded display
fields, and application-relative normal-UI handoffs. It then matches a bounded
local query and groups results by canonical type.

Results owned by a disabled or ineligible mini-app are omitted from
presentation. Omission is not an authorization decision: the production index
and retrieval service must derive active context and visibility server-side
before any summary reaches this model. Search must never use a client-supplied
household ID as authority or send household content to an external semantic
provider by default.

## Non-goals and verification

There is no index schema, database query, semantic/vector provider, attachment
text extraction, conversation search, logging/analytics, pagination, ranking,
or search route. Tests cover grouping, disabled-app omission, household
isolation, safe links, and bounded query validation. Server retrieval/indexing
and browser/screen-reader validation remain required before #21 can close.
