# Integrated execution plan

## Current state

Shared contracts, migration safeguards, inventories, and pure presentation/read models exist for every P1 shell surface and mini-app. They are not a runnable product: authentication, database persistence, server commands, canonical record storage, real routes, delivery workers, and production services are absent. Therefore issues #15–#32 remain open.

## External gates

| Gate | Evidence | Required action |
| --- | --- | --- |
| #14 CI | Run `32130438916` did not start because GitHub reported a recent payment/spending-limit condition. | Account owner resolves it and reruns CI. |
| #42 UX | Prototype and validation log exist; human/browser/assistive-technology validation remains pending. | Complete the UX-plan research and record findings/decision. |

This plan authorizes no deployment, production migration, legacy change/retirement, automatic merge, provider credential, payment rail, or external delivery.

## Execution order

### 1. Runtime spine

Implement the selected self-hosted Better Auth/session and PostgreSQL adapters;
derive active household context server-side; persist household/member/configuration;
add transactional canonical/audit/outbox writes; enforce authorization, feature
eligibility, idempotency, and version conflicts; implement routes and accessible
primitives from the selected #42 direction. Do not configure a production
instance or run migrations until the remaining environment and release gates
are explicitly approved.

Proof: cross-household integration tests, persistence/transaction tests, keyboard/screen-reader review, and hosted CI after #14 resolves.

### 2. First vertical slice: Shared Lists + Chores

Persist lists/items/assignee-safe chore assignments; implement normal UI commands with confirmation, authorization, idempotency, audit/outbox, and conflicts; connect Today, Notifications, Search, and Chat proposals to the same records; test adult, child, and guest boundaries.

Proof: end-to-end daily, child-completion, adult-review, and guest journeys; mobile/a11y review; no direct cross-app storage access.

### 3. Shell services

Implement Calendar persistence/timezone behavior, notification preferences/state commands/outbox adapters, Search indexing/retrieval, Family membership/invitation/role safeguards, and Settings persistence with audit/confirmation.

Proof: role-boundary, timezone/DST, notification/search leakage, recovery, and export tests appropriate to each command.

### 4. Optional mini-apps

Implement in order: Habits; non-financial Rewards; Meals then Groceries; Projects; Messages after content/attachment/moderation policy; Budget only after financial-data governance, reconciliation, recovery, and explicit write controls.

Proof: each issue’s outstanding acceptance criteria plus privacy/retention/export/recovery coverage.

### 5. Migration and release readiness

Use real exports/adapters only with approved #38–#41 process; run dry-runs, controlled imports, rollback rehearsals, parity evidence, and named sign-off. Do not retire legacy deployments without explicit action-time approval. Resolve #14 before relying on hosted CI; seek separate deployment approval only when release evidence is complete.

## Content and design (#49)

After #42 selects a direction, define labels, empty/error/permission/offline copy, child/guest language, localization readiness, and message/notification content boundaries. Apply those standards to the first vertical slice before claiming P1 shell or mini-app completion.

## Completion evidence

| Area | Current evidence | Required before closure |
| --- | --- | --- |
| #15–#23 shell | ADRs 0024–0031, pure tests | authenticated routes, persistence, commands, real UI, browser/a11y/usability evidence |
| #24–#32 mini-apps | ADRs 0032–0040, pure tests | canonical stores, UI commands, audit/outbox, dependency/privacy/recovery evidence |
| #38–#41 migration | contracts, inventories, synthetic tests | approved real exports, rehearsals, parity and sign-off |
| #14/#42/#49 | workflow/prototype/plans | hosted CI, human research, content standards |
