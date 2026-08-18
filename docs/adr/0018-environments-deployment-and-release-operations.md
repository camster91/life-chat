# ADR 0018: Environments, deployment architecture, and release operations

## Status

Accepted as an environment-neutral operating contract. Hosting, secret manager,
database provider, CI availability, and deployment tooling are unselected.

## Decision

### Environment boundaries

Life Chat has four distinct trust boundaries:

| Environment | Purpose | Data and access rule |
| --- | --- | --- |
| local | Individual development and pure/disposable tests | Synthetic fixtures only; no shared or production credentials. |
| CI/test | Reproducible validation | Ephemeral, least-privilege, no production network/data/secrets. |
| staging | Isolated release rehearsal | Synthetic/de-identified approved test data only; separate identity, storage, keys, and outbound integrations held disabled/sandboxed. |
| production | Authorized household service | Real data only after all configured gates and action-time release approval. |

No environment shares database, object storage, session signing keys, provider
credentials, export locations, or unrestricted network credentials with a more
sensitive environment. Production data may not be copied down. Access uses
named least-privilege roles, time-bounded elevation, MFA/SSO when selected, and
auditable changes; shared administrator credentials are prohibited.

### Configuration and secrets

Configuration is versioned by schema and environment, validated at startup, and
safe to display only when it contains no secret/material identifiers. Secrets
are references resolved at runtime from an environment-specific secret manager;
they are never committed, placed in browser bundles, printed in logs, passed via
URLs, or stored in household/configuration records. Secret rotation/revocation,
access review, and emergency disablement are environment operations with audit
evidence.

### Immutable release and rollback

- Build one reviewable artifact from an exact commit and lockfile after required
  checks pass; promote the same artifact through environments. Record commit,
  artifact digest, configuration schema, migration state, release owner,
  approval reference, and verification evidence.
- Production release is a manual action after action-time authorization. It
  cannot be triggered by a merge, CI success, flag change, or scheduled job.
- Every release has a tested last-known-good artifact, explicit rollback steps,
  health/readiness and authorized smoke checks, monitoring window, and owner.
  A rollback is itself an approved/audited environment operation when it risks
  data or user impact.
- Schema changes follow expand/contract compatibility. A migration first passes
  a backup/restore precondition and isolated rehearsal with timing, lock, row
  count, error, reconciliation, and rollback evidence. Destructive/irreversible
  migrations, imports, or backfills require separate action-time approval and
  are never bundled silently into deploy.

### Release evidence

`ReleasePlan` is complete only when it has an exact revision, passing local/CI
evidence, a named verification owner, rollback revision, and applicable
migration rehearsal/backup details. Production adds a human approval reference.
Post-release evidence includes deployed revision, readiness/health result,
authorized smoke outcome, migration result, safe monitoring result, and rollback
status. Failure stops promotion; no release is inferred from a pushed commit.

## Verification and follow-up

The pure release-plan guard proves required evidence for normal, migration, and
production plans. #14 needs a successful live CI run once the account state is
resolved. Before a first staging/production release, select and implement the
hosting/platform, environment accounts, secret manager, artifact registry,
database/object store, network policies, branch protection, deployment runner,
monitoring/alerting, backup/restore rehearsal, and incident contacts. A
representative staging rehearsal then becomes required evidence.

## Non-goals

- No host, account, secret, database, CI setting, deployment workflow, staging
  environment, artifact, migration, backup, rollback, or production action is
  created by this ADR.
