# Foundation completion plan

This plan closes the gaps between the current product/UX briefs and a build-ready Life Chat foundation. It is a planning artifact only: no application, production environment, migration, or legacy repository is changed by its completion.

## Completion map

| Workstream | Outcome | Existing owner | Added owner |
| --- | --- | --- | --- |
| Product and platform | Stack, repository layout, environments, hosting assumptions, and engineering decision records. | #2 | #50 |
| Identity and authorization | Household/member lifecycle, capability model, child/guest defaults, recovery, and cross-household isolation tests. | #3–#4 | — |
| Shared domain contracts | Canonical schema, visibility/ownership, API/tool contracts, domain events, and mini-app integration rules. | #5–#7 | #43 |
| Time, data lifecycle, and recovery | Timezone/recurrence behavior, retention/deletion, sync/conflicts, export/import, backups, and restore verification. | #6, #8 | #44 |
| AI | Provider-neutral orchestration, data boundaries, action taxonomy/risk, cost/credit policy, confirmation, and failure handling. | #10–#11 | — |
| Security and privacy | Threat model, secrets, attachments, audit access, data classification, consent, and child-data safeguards. | #12 | #44 |
| UX and accessibility | Navigation, flows, prototype, visual direction, component patterns, content, localization, and validation evidence. | #13, #42 | #49 |
| Quality and delivery | Test strategy, fixtures, local developer workflow, CI, release evidence, and rollback gates. | #14 | #48, #50 |
| Operations | Health, structured/redacted logs, metrics, alerts, audit review, support triage, incident handling, and runbooks. | — | #45 |
| Safe rollout and learning | Feature flags, household beta controls, staged rollout/rollback, privacy-preserving product analytics, and feedback loops. | — | #46–#47 |
| Legacy migration | Read-only inventories, approved import mappings, dry-runs, recovery, reconciliation, and explicit retirement gate. | #33–#41 | — |

## Required decision records

Before application implementation, record decisions for:

1. application stack, database, package boundaries, authentication provider, and environment strategy;
2. canonical identity/membership and capability vocabulary;
3. data ownership/visibility, event/API contracts, attachment storage/access, and deletion/retention rules;
4. offline promise, synchronization/conflict behavior, export format, and recovery target;
5. AI data-processing boundaries, provider selection, BYO key custody, proposal risk taxonomy, and credit/billing deferral;
6. visual direction, light/dark policy, content voice, localization readiness, and first mini-app slice;
7. observability, release/rollback evidence, beta eligibility, analytics consent, and support response boundaries.

## Build-ready acceptance gate

The team may begin the shared shell only when the following are approved and represented in versioned documentation/tests:

- A chosen stack and environment model with local setup instructions.
- Server-side household isolation, role/capability rules, and representative adversarial test cases.
- A canonical shared-data and event/API contract that mini-apps can implement without direct cross-app database access.
- Written retention/export/recovery behavior and an initial restore rehearsal plan.
- A threat model, provider/secret boundary, AI no-provider behavior, and proposed-action confirmation contract.
- A selected UX direction, core-flow prototype, component/state requirements, and accessibility acceptance criteria.
- A developer/CI test strategy with deterministic fixtures and no production dependency.
- Explicit beta/feature-flag/observability strategy, even if the first version has no external users.

## Execution order

1. Finish platform, identity, roles, mini-app registry, time, audit, and shared contracts (#2–#7, #43).
2. Define privacy/consent/data lifecycle and recovery as a single cross-cutting policy (#8, #12, #44).
3. Establish AI, notification, accessibility, developer/test, CI, operational, and rollout foundations (#9–#14, #45–#50).
4. Complete prototype/research, select the visual direction, and turn validated flows into shell implementation slices (#42).
5. Build the shell and the approved first mini-app slice; Shared Lists + Chores remains the recommended starting slice.
6. Perform legacy inventories and design only approved import paths. No deployment retirement occurs without the parity gate (#33–#41).

## Explicitly deferred until the corresponding gate

- Production deployment, provider credentials, paid credits/billing, payment rails, external calendar sync, push/email/SMS delivery, and public/third-party mini-app execution.
- Importing, modifying, archiving, deleting, or retiring any legacy application or deployment.
- Any AI action that changes consequential data without the proposed-action/confirmation and audit path.
