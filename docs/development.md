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
- Do not add a database schema or migration before #3 and #43 define shared contracts and household context.
- Do not add direct AI-provider calls to UI or mini-app code.
- Do not treat a local build as release or production evidence.
