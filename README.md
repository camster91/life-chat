# Life Chat

Life Chat is the canonical life and family operating system for a household: a calm, chat-first home for coordinating people, time, tasks, meals, money, and shared information.

It replaces the fragmented experience of standalone applications over time, while preserving safe, explicit migration paths from them. The product is not an implementation of any legacy repository.

## Product promise

- One trustworthy source of household and personal life information.
- A conversational AI home and command interface, with a clear conventional UI for every important action.
- Private and local by default where practical, with strong household/member isolation.
- A self-hosted VPS runtime with local PostgreSQL and Better Auth; external identity or database services are not a core dependency.
- Different, deliberate permissions for adults, children, and guests.
- AI proposals are reviewable before important data changes occur.
- Provider-independent AI support, with optional bring-your-own-AI and future paid credits.
- Accessible, responsive, mobile-first experiences built from reusable components.

## Product areas

Today, Chat, Apps, Calendar, Family, Search, Notifications, and Settings form the shared shell. Optional mini-apps add Habits, Chores, Meals, Groceries, Shared Lists, Rewards and Allowance, Budget, Projects, and Messages.

## Status

This repository contains the product plan, shared-contract foundations,
migration safeguards, and a runnable local authenticated shell. It has
invite-only account entry, server-derived household context, PostgreSQL-backed
identity, app configuration, Today, Calendar, Family, Notifications, Shared
Lists, Chore completion, and query-time Search slices. It is **not yet a
complete or production-ready household product**: Chat, most mini-apps,
delivery workers, recovery operations, broader record commands, human UX and
assistive-technology validation, hosted CI proof, and production services are
still pending.

No data migration, production deployment, legacy-repository modification, or
legacy retirement is complete or authorized. See the
[integrated execution plan](docs/integrated-execution-plan.md) for the current
implementation sequence and external validation gates.

## Reference sources

The following repositories are reference sources only and must not be modified, deleted, archived, or deployed as part of this work: `family-planner`, `lifestreak`, `chore-champs`, `meal-planner`, and `budget-app`.

See the [product scope and feature matrix](docs/product-scope.md), [UX plan](docs/ux-plan.md), [foundation completion plan](docs/foundation-completion-plan.md), [product architecture](docs/product-architecture.md), [data model](docs/data-model.md), and [migration plan](docs/migration-plan.md).
