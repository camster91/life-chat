# CI and release gates

## Required local and pull-request evidence

Before review, run the following from the repository root and report both
results and anything not run:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level high
git diff --check
```

The CI workflow runs the first five checks on pull requests and `main` with a
read-only token, a lockfile-frozen install, and no application secrets. It does
not deploy, publish packages, run database migrations, access production, or
merge pull requests. Dependabot may open limited update pull requests; each
requires ordinary review and the same checks.

## Review gates

- Link the issue and state the product, authorization, audit, timezone,
  migration, and privacy impact or explicitly mark each as not applicable.
- Include unit/integration tests for changed server authorization, date/time,
  proposed-action, import/export, and destructive/reversible boundaries.
- Review accessible behavior for changed UI: keyboard, semantics, focus,
  contrast, reduced motion, and 320/768/1280 CSS-pixel viewports.
- Do not merge based only on a green build when required manual evidence,
  migration review, or a product/permission decision remains open.

## Release gate (manual and environment-specific)

A release is a human-approved action after a reviewable change has passed CI.
The release owner records the exact commit, approved environment, change list,
rollback procedure, schema/data migration plan, backup/restore precondition,
health-check expectation, and named verification owner. Production changes,
database migrations, data imports, DNS, billing, provider credentials, and
public communication require separate action-time authorization.

After an approved release, collect only non-sensitive evidence: deployed
revision, health/readiness result, authorized smoke test result, migration
result if applicable, monitoring outcome, and rollback status. A failed or
incomplete gate stops the release and keeps the last known-good version
available; never bypass a gate by disabling checks or automatically merging.

## Follow-up configuration

Before the first production release, an owner must configure and verify branch
protection/rulesets, required checks, reviewer rules, secret scanning and
dependency-alert settings, environment protection, deployment credentials,
backup/restore rehearsal, observability, incident contacts, and rollback
automation. This repository foundation does not claim those settings exist.
