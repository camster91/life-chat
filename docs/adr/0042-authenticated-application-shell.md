# ADR 0042: Authenticated application shell

## Status

Accepted for the first authenticated shell increment. Core placeholder
destinations, full Apps management, offline navigation, and human
assistive-technology validation remain incomplete.

## Decision

Today, Apps, Shared Lists, list detail, and Chore assignment detail share one
responsive client shell after a Better Auth session and server-derived active
member context are available. Signed-out, no-membership, multi-household
selection, loading, and context-failure gates render before feature content.

`/api/context` remains the authority boundary. It accepts no household identity
from the browser, reloads active non-expired memberships linked to the verified
subject, and returns only the selected household name, member display name and
role, plus eligible enabled mini-app identifiers loaded from that household's
canonical configuration. A selection cookie is a revalidated preference, not
authority.

The shell:

- shows the acting household/member/role before shared data;
- provides real links only for implemented destinations;
- labels unfinished Chat, Calendar, Family, Search, Notifications, and Settings
  as planned and non-interactive rather than routing to misleading screens;
- lists only eligible enabled mini-apps and links Shared Lists to its normal UI;
- provides a five-control mobile bar (four primary destinations plus More), a
  labelled native dialog, visible focus, and 44px targets;
- keeps every feature API responsible for its own server authorization. Hiding
  or exposing navigation never grants record access.

## Verification

The default Playwright suite leaves the authenticated scenario explicitly
skipped because CI has no PostgreSQL service or fabricated account. An explicit
local-only run uses a freshly migrated disposable database, the CLI-only first
owner bootstrap, and fabricated credentials. It signs in through the normal
form, verifies household context, current-route state, eligible Shared Lists
navigation, Apps handoff, desktop and 375px mobile layouts, 44px mobile targets,
the More dialog, and axe WCAG A/AA results. The named database and temporary
environment file are deleted after the run.

## Non-goals and follow-up

This increment does not implement Chat, Calendar, Family, Search,
Notifications, Settings, app enable/disable commands, offline caching, or
multi-household unsaved-work confirmation. It does not select the final visual
direction or replace human keyboard/screen-reader and usability work in #42.
No production runtime, migration, provider, or legacy application is touched.
