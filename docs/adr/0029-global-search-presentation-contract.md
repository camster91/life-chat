# ADR 0029: Global search presentation contract

## Status

Accepted for a safe result model plus an initial database-backed retrieval
slice for the active member's Chore assignments. It does not create an index,
semantic provider, analytics event, or broad cross-app data access path.

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

There is no index schema, semantic/vector provider, attachment text extraction,
conversation search, logging/analytics, pagination, ranking, or search route.
The first retrieval service queries only enabled Chores assigned to the active
member; database integration proves another household member cannot see them.
Broader indexing/visibility policies and browser/screen-reader validation remain
required before #21 can close.
