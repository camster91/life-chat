# ADR 0001: Application stack and repository structure

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #2, #3–#14, #43, #48, #50

## Context

Life Chat needs one maintainable, mobile-first web application that can evolve into a multi-household product without binding core data or AI behavior to one vendor. The foundation must support accessible conventional UI alongside chat, server-side authorization, a relational shared-data model, and independently testable mini-apps.

## Decision

Use a pnpm workspace with one deployable application at `apps/web` and reserved shared-package boundaries at `packages/*`.

| Concern | Decision |
| --- | --- |
| Web application | Next.js 16 App Router, React 19, strict TypeScript. Every state-changing request must pass server-side household/member authorization. |
| Styling | Component-scoped CSS plus CSS custom properties for design tokens. No UI kit is adopted until UX direction is selected. |
| Canonical data | PostgreSQL is the source of truth for household-scoped records, audit events, and migration state. |
| Persistence | Prisma ORM 7 for schema, migrations, generated types, and typed queries. SQL constraints and appropriate row-level security are defence in depth, not authorization replacements. |
| Authentication | Better Auth is self-hosted with the application and backed by PostgreSQL. Life Chat retains a server-only provider adapter boundary; the initial sign-in and recovery methods remain a separate decision. |
| AI | Provider-neutral orchestration selected in #10–#11; mini-apps cannot call a vendor SDK directly. |
| Testing | Vitest for domain tests and Playwright for isolated browser journeys. Fixtures are fabricated/disposable (#48). |
| Tooling | pnpm, ESLint, TypeScript, and documented local checks. CI/release configuration remains #14/#50. |

```text
apps/
  web/                 # only deployable application initially
packages/
  contracts/           # reserved: shared types/API/event contracts after #43
  config/              # reserved: shared tooling configuration when needed
docs/
  adr/                 # durable shared decisions
```

## Consequences

- One application/database avoids fragmented household truth, authorization, audit, and migration behavior.
- Workspace boundaries permit contracts and reusable components to move out only after a second consumer exists.
- PostgreSQL provides relational constraints and transactions for household, calendar, list, money, and audit data.
- The server-first structure keeps authorization decisions close to data access while supporting UI and tool/API surfaces.
- No route, action, query, or worker may trust client-supplied household/member IDs. #3–#4 define the trusted context and capability model.
- Prisma does not guarantee tenant isolation; #43 defines repository/service boundaries and #12 decides database-level defence in depth.
- `packages/contracts` remains empty until #43; no speculative shared models are created.
- A single deployment unit is not a permanent process commitment. Queue/worker separation needs a later ADR.

## Alternatives rejected

- Independent mini-app services now: fragments shared truth before contracts exist.
- Single non-workspace app: makes later shared contracts harder to introduce safely.
- SQLite/local-only canonical store: insufficient for multi-member sharing, audit, and controlled migration; offline remains #8.
- Managed AI/identity as a core dependency: conflicts with adapter and no-AI requirements.

## Verification

- `apps/web` must install, lint, type-check, unit-test, and build without database or provider credentials.
- The health route proves local application readiness only; it does not claim database, provider, or deployment health.
- Dependency/tool behavior was checked against primary Next.js, Prisma, and Playwright documentation on 2026-08-18.

## Follow-up

- #3–#4: identity, trusted household context, roles, and capability checks.
- #43: data/API/event/mini-app contracts.
- #48: deterministic fixtures and local database test path.
- #50: environments and release operations; no deployment choice is made here.
