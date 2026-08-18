# ADR 0014: Local fixtures and test-data policy

## Status

Accepted for local development, automated testing, design review, and migration
dry runs.

## Decision

- Routine development and tests use deterministic, fabricated fixtures only.
  Production database dumps, household exports, credentials, provider payloads,
  screenshots containing household information, and copied legacy production
  records are prohibited in source, test snapshots, issue bodies, and local
  seed files.
- The base fixture always includes two separate households and a representative
  adult, child, guest, suspended member, enabled/disabled app state, timezone,
  audit/event references, and reversible/denied scenarios. It intentionally
  exercises household isolation and role boundaries rather than only an adult
  happy path.
- Fixtures are immutable input data. Each test gets a new cloned fixture or a
  disposable database/schema/tenant created by the test harness; tests do not
  depend on execution order, shared mutable state, wall-clock time, network
  access, provider credentials, or a production-like persistent environment.
- Time-sensitive tests supply an exact instant and IANA timezone. IDs are
  opaque, deterministic, and visibly synthetic. Money uses integer minor units.
  Attachments use metadata-only placeholders; no binary personal content is
  committed.
- A future database harness uses an explicitly local/disposable connection and
  refuses known production/staging hostnames. Setup/reset/teardown are owned by
  the test command, not manually run against a shared environment.
- Migration work uses versioned synthetic source fixtures, expected mapping
  manifests, dry-run reports, reconciliation cases, and failure/rollback cases.
  It must not require a legacy production export for routine validation.

## Verification and follow-up

The foundation fixture verifies separate households and representative member
states in pure tests. Before persistence exists, #50 and migration issues must
add a disposable database harness, schema-reset proof, import fixture corpus,
and a CI test tier. Any exceptional use of a de-identified dataset needs a
documented purpose, minimization review, access restriction, retention/deletion
plan, and explicit owner authorization.

## Non-goals

- No database, seed command, database reset, or connection string is provided
  yet.
- This is not permission to copy production/legacy data into local tools or
  claim that synthetic tests prove production privacy or migration parity.
