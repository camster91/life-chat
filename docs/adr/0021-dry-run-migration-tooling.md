# ADR 0021: Dry-run migration tooling

## Status

Accepted for synthetic fixtures and future user-authorized export analysis. It
does not authorize an import, target write, source-repository operation, or
legacy deployment retirement.

## Decision

The first dry-run implementation accepts an already-validated `ImportDryRunPlan`
and returns a deterministic, review-only `ImportDryRunReport`. Its only output
is metadata needed to review the plan: source/checksum/mapping identifiers,
household scope, outcome counts, and opaque references for ambiguous, conflict,
or invalid records. It has no database, file-system, network, legacy adapter,
or notification dependency.

`eligibleForApprovedExecution` is deliberately not execution authority. It
only means the supplied plan has at least one mapped record and no unresolved
ambiguity, conflict, or invalid record. A later, separate execution flow still
requires fresh adult authorization, consent and retention checks, an approved
rollback point, and an idempotency ledger under ADR 0020.

## Safety and privacy

- Dry runs must set `writesTarget: false`; contract validation rejects anything
  else and derives the target household from the active server context.
- Reports do not carry raw record fields, message bodies, prompts, attachments,
  financial descriptions, credentials, tokens, or source-export contents.
- No automatic identity matching is introduced. Ambiguous identities are
  findings and block approval eligibility.
- The report is not an audit event. A future requested run should emit a safe
  audit event/outbox entry through the shared contracts without sensitive data.

## Verification

Unit tests cover deterministic counts, opaque blocking findings, no-write
state, approval ineligibility when a human decision is needed, and household
scoping rejection. The repository gate suite must pass before review.

## Non-goals and follow-up

- No real source-export parser, user data fixture, or environment-backed CLI is
  included. Each source adapter requires separately approved sample exports,
  schema/version validation, a failure corpus, and data-owner review.
- No execution, rollback, parity certification, source deletion, deployment,
  or retirement occurs here. #40 defines rollback evidence; #41 defines parity
  evidence.
