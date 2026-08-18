# Family Planner read-only inventory

## Snapshot and boundary

- Source: private `camster91/family-planner`, default branch `master`, inspected
  read-only on 2026-08-18.
- No source data, secrets, export, code, repository setting, or deployment was
  accessed or changed. This is not an import/security assessment.

## Observed architecture

The source is a Next.js/TypeScript application with Prisma/PostgreSQL,
self-hosted JWT/cookie authentication, REST route handlers, Tailwind/Zustand,
and Capacitor dependencies. Its central `Family` and `User` schema uses the
source roles `parent`, `child`, and `teen`; observed helpers load a user family
ID and perform a parent-only role check. It includes Docker/Coolify-oriented
configuration, backup/restore/deploy scripts, workflows (including auto-merge
and deploy), per-family JSON feature toggles, file/upload routes, a user export
route, PostHog dependencies/routes, and public handoff-share routes.

These source facts do not become Life Chat architecture or operating policy.

## Port/redesign/discard matrix

| Source area | Observed concepts | Life Chat decision | Migration rule |
| --- | --- | --- | --- |
| Family/member/auth | family, users, join/invite, roles, JWT/session/recovery fields | Redesign | Map verified identities to subject + household-local member. Never import passwords, sessions/JWTs, reset/verify tokens, raw invite codes, or source roles as authority. |
| Chores/gamification | assignments, recurrence, points, completion/verification, photo URL, XP/streak | Port selectively/redesign | Candidate for Chores/Habits after new authorization, attachment, time, audit, and approval mapping. |
| Calendar/events | timed events, locations, recurrence strings, project link | Port selectively/redesign | Map only through Life Chat date/timezone contract; source snapshot does not establish all-day/original-timezone semantics. |
| Shared lists | lists, order, check/purchase state, quantity, price floats | Port selectively/redesign | Candidate for Shared Lists/Groceries. Convert money only through a loss-checked integer-minor-unit rule. |
| Messages/notifications/activity | content, attachment URLs, read arrays, body/title notifications, metadata strings | Redesign | Import only with approved purpose, participant/visibility mapping, retention, and content policy. Do not copy content to audit/events. |
| Rewards/allowance/budget | reward lifecycle, allowance, transactions, categories | Redesign/defer | Source includes floats. Require adult review, conversion/reconciliation, and no real-money movement. |
| Meals/projects/notes/anniversaries/wishlist/pickups | planning records and links | Port selectively | Only after app-specific source-field discovery and target contract approval. |
| Location/emergency/health/medication/handoff | address/coordinates, health/contact data, public share token, illness/medication details | Discard/defer | Sensitive/high-risk and outside initial scope. Do not import by default. |
| Travel/flags/analytics | JSON flags, travel dates, PostHog | Redesign/discard data | Reuse only explicit configuration concepts. Never import analytics history or source feature state as canonical data. |
| Files/export/deployment | upload/file URLs, export route, Docker/Coolify/scripts/workflows | Redesign/discard | Legacy attachments and operations are not Life Chat import/release mechanisms. |

## Risks and discovery requirements

1. The schema's family scope does not prove every historical route enforced it;
   Life Chat uses its own server-derived household and visibility checks.
2. Source messages, notifications, URLs, public handoff tokens, health/contact
   fields, and metadata require classification/exclusion before a dry run.
3. Export format, historical deletion/orphans, timezone/all-day/recurrence,
   attachment integrity, and invite provenance remain unknown. They require
   discovery, not assumptions.
4. Float financial/list values need documented conversion and reconciliation;
   ambiguous values must be reported, never silently rounded.
5. Existing source deployment/CI/backup behavior is out of scope. Life Chat
   must satisfy its own release, rollback, and approval contracts.

## Approved next phases

- **A — discovery:** synthetic source fixtures, source-field classification,
  identity matching policy, and mapping specification.
- **B — dry run:** mapping/exclusion/ambiguity/count report with no production
  write.
- **C — opt-in import:** only approved low-risk mappings, idempotency ledger,
  audit evidence, rollback point, and parity review.
- **D — retirement consideration:** agreed parity, export/recovery proof, and
  separate explicit retirement approval.

Nothing in this inventory authorizes phases C or D. #38–#41 own shared import
contracts, dry runs, rollback, and parity. Sensitive areas remain excluded.
