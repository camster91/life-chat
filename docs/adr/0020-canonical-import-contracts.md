# ADR 0020: Canonical import contracts

## Status

Accepted for discovery and dry-run planning only. It does not authorize a
target write, source export, production import, or legacy retirement.

## Contract

An import has four versioned, reviewable layers:

1. **Source adapter:** reads a user-provided/authorized, documented export or
   synthetic fixture; validates source schema/version; assigns opaque source
   record IDs; strips prohibited secrets/operational data; and records a
   content checksum outside audit/event metadata.
2. **Mapping plan:** maps each accepted source record to one Life Chat canonical
   target type, field transformation/version, visibility/owner rule, retention
   class, consent/authorization status, and deterministic idempotency key. It
   records every skip, ambiguity, validation failure, conflict, and required
   human decision.
3. **Dry-run report:** writes no target domain record. It contains counts by
   source/target/outcome, schema/mapping versions, safe opaque references,
   checksums, control totals where relevant, and a reviewable exclusion/conflict
   report. It never embeds raw content, credentials, tokens, attachment bytes,
   messages, prompts, or financial descriptions in audit/events/logs.
4. **Approved execution (future):** only after explicit action-time approval,
   a fresh active household context, current authorization, app/feature checks,
   consent/retention validation, backup/rollback point, and a persisted import
   idempotency ledger. It writes canonical records/audit/outbox atomically and
   never replays notifications, messages, provider calls, AI actions, or
   external financial effects.

Identity matching is never automatic across source accounts. An authorized adult
reviews each proposed household/member match. Unmatched/ambiguous identities
remain excluded until resolved. Existing target records are never overwritten by
source data: a conflict requires an explicit merge policy or creates no change.

## Source mapping eligibility

| Source | Eligible only after adapter evidence | Default exclusions |
| --- | --- | --- |
| Family Planner | selected household/members, chores, calendar events, lists, plans/projects where mapping/visibility is approved | auth tokens/passwords/invites, messages/notification bodies, health/emergency/location/handoff, uploads/URLs, analytics, money floats until reconciliation |
| LifeStreak | no direct default data import; future user-selected generic habit completion export only | all spiritual/content-specific records, device storage, AI settings/keys, native schedules, achievements/XP, private notes |
| ChoreChamps | selected family/member profiles, chore definitions/assignments, approved non-financial reward definitions | credentials/tokens/push, child behavioral/badge history by default, point authority, recovery/login data |
| Meal Planner | user-selected recipes/ingredients/meal plans and optionally inactive shopping lists | passwords/JWTs, image URLs/files, active/purchased list state unless explicitly reviewed |
| Budget App | selected categories, transaction/budget records with currency/control totals and adult review | accounts/bank tokens/cursors, receipts/OCR, raw statements, imported financial descriptions without approved scope, inferred patterns/scores, provider/AI data |

## Validation and conflict rules

- Target household/member context is server-derived; a source ID/household ID is
  never trusted as authorization.
- Every record declares source schema, mapping version, source record checksum,
  target type, field transformation, owner/visibility, data classification,
  retention class, and outcome (`map`, `skip`, `ambiguous`, `conflict`,
  `invalid`). Unknown fields fail closed or are explicitly excluded.
- Dates/timezones retain original representation and map through ADR 0005;
  currency/money uses ISO currency and integer minor units; quantities preserve
  precision/original unit text without silent rounding; attachments require a
  separate authorization/integrity workflow.
- An import idempotency key is scoped to source system, source export/checksum,
  target household, mapping version, and actor. Retrying returns the same plan
  or result; it must not duplicate records.
- Consent/retention/legal-hold uncertainty, source drift, incomplete export,
  or unverifiable control totals stop affected records. A partial dry run is a
  report, not a successful migration.

## Verification and follow-up

Pure contracts verify source allow-listing, no-write dry-run state, target
household matching, and conflict/consent/retention rejection. #39 builds the
synthetic dry-run harness, #40 the execution rollback ledger, and #41 parity
evidence. Each concrete adapter requires its own fixtures, mapping spec,
authorization tests, failure corpus, and approved data owner before execution.

## Non-goals

- No source export reader, data connector, parser, target database, migration
  command, bulk write, automatic identity merge, data deletion, or production
  import is created.
