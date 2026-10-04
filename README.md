# Life Chat

A calm, chat-first household operating system for coordinating people, time, tasks, meals, money and shared information. Self-hostable, with strong household and member isolation.

## What it is

Life Chat brings the everyday tools a family juggles (calendar, chores, lists, meals, habits, rewards, budget, projects) into one shared home, with a conversational assistant as the front door and a clear conventional screen for every important action. It is designed to replace a set of separate single-purpose apps with one trustworthy source of household information, with explicit, reversible migration paths from them.

**Status: early foundation, not production-ready.** The repository contains a runnable, authenticated Next.js shell backed by PostgreSQL, the shared domain contracts, and the first working slices listed below. The AI chat is not connected to a provider yet, and most mini-apps are still in progress.

## Design principles

- **One source of truth** for household and personal life information
- **Chat plus conventional UI**: every important action is also available without the assistant
- **Reviewable AI**: the assistant proposes changes for a person to approve; it never acts silently
- **Provider-independent AI**, with room for bring-your-own-key
- **Deliberate permissions** for adults, children and guests, enforced on the server
- **Private by default**, self-hosted with local PostgreSQL and Better Auth instead of third-party identity or database services
- **Accessible, responsive, mobile-first** components

## What works today

- Invite-only account entry and sign-in (Better Auth, PostgreSQL sessions)
- Server-derived household context and a permission engine for adult, child and guest roles
- Shared shell: Today, Chat, Apps, Calendar, Family, Search, Notifications and Settings
- Calendar agenda, family member lifecycle, shared lists, chore assignments and completion, notifications and notification preferences
- Early API and data slices for habits, meal plans, groceries, rewards and reward requests, and projects
- Per-household mini-app configuration (habits, chores, meals, groceries, lists, rewards, budget, projects)
- Query-time search across household records
- Audit and outbox events for important changes
- A first-owner bootstrap CLI (no HTTP bootstrap route)
- Import dry-run, migration parity and rollback contracts for bringing data over from older apps

## Tech stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript |
| Auth | Better Auth with the Prisma adapter |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Dates | Temporal polyfill |
| Testing | Vitest (unit and repository integration tests), Playwright with axe-core |
| Tooling | pnpm workspaces, ESLint, GitHub Actions CI (lint, typecheck, tests, e2e, build, audit) |

## Getting started

Requires Node 22+ and pnpm 10.

```bash
git clone https://github.com/camster91/life-chat.git
cd life-chat
pnpm install --frozen-lockfile
pnpm dev                 # http://localhost:3000
```

For database-backed features, copy `apps/web/.env.example` to `apps/web/.env`, point `DATABASE_URL` at a disposable local PostgreSQL database and set the Better Auth values. Then:

```bash
pnpm --filter @life-chat/web db:generate
pnpm --filter @life-chat/web db:validate
```

The first household owner is created with a local CLI (`pnpm --filter @life-chat/web bootstrap:first-owner`); see [docs/development.md](docs/development.md) for the required environment variables and safeguards.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Generate the Prisma client and build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Prisma generate and `tsc --noEmit` |
| `pnpm test` | Vitest unit and integration tests |
| `pnpm test:e2e` | Playwright end-to-end and accessibility tests |

## Project structure

```
apps/web/
├── prisma/            # Schema and migrations
├── scripts/           # First-owner bootstrap CLI
└── src/
    ├── app/           # App Router pages (today, chat, calendar, family, lists, chores, ...) and API routes
    └── lib/           # Domain logic, repositories, permission engine, contracts and tests
tests/e2e/             # Playwright specs
docs/                  # Product scope, architecture, data model, UX and migration plans
```

## Documentation

- [Product scope and feature matrix](docs/product-scope.md)
- [Product architecture](docs/product-architecture.md)
- [Data model](docs/data-model.md)
- [UX plan](docs/ux-plan.md)
- [Migration plan](docs/migration-plan.md)
- [Local development](docs/development.md)
- [Design notes](DESIGN.md)
