# ADR 0035: Meals date-only plan model

## Status

Accepted for a date-only household meal plan and adult-managed plan entries. It
does not import Meal Planner data or mutate recipes, calendar, groceries, or
lists.

## Decision

Meals begins with authorized household summaries for a given date-only local
day. Entries may expose a bounded display label, meal slot, and a canonical
internal recipe handoff only. Recipe instructions/ingredients/notes, images and
URLs, dietary data, serving quantities, grocery generation, and completion
state are deliberately outside this presentation model.

The mini-app must be eligible. Adults receive `meals.manage`; adults and
children can read; guests are denied. Adults can add a bounded date-only entry
with a meal slot through the normal UI. The command derives context server-side,
reauthorizes the mini-app and capability inside a serializable transaction,
retains a replay-safe command ID, and emits audit/outbox evidence atomically.
It never uses an AI or recipe link to silently alter groceries or a schedule.

## Non-goals and verification

No Recipe/Meal Planner import, source database access, recipe storage, image
attachment, quantity normalization, calendar sync, grocery generation,
edit/archive flow, or recipe UI is included. Tests cover app eligibility,
date-only filtering, household isolation, adult management, replay-safe create,
and audit/outbox writes. Shared Lists and Groceries integration plus
authenticated UX/accessibility validation remain before #27 can close.
