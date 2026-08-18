# Local development

## Prerequisites

- Node.js 22 or newer
- pnpm 10.32.1

No database, AI provider, authentication provider, or production credential is required for the foundation shell.

## Commands

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

`http://localhost:3000/api/health` intentionally reports only local application readiness.

## Boundaries

- Do not use real household data in local fixtures or tests.
- Use `createLifeChatFixture()` for deterministic fabricated multi-household scenarios; tests must create any mutable copy they need rather than changing the shared fixture.
- Do not add a database schema or migration before #50 defines environment, migration rehearsal, and release operations.
- Do not add direct AI-provider calls to UI or mini-app code.
- Do not treat a local build as release or production evidence.
- Local test setup may never point at production, a legacy deployment, or an unapproved shared environment.
