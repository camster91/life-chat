# ADR 0035: Meals date-only plan model

## Status

Accepted for a read-only, date-only meal-plan foundation and review-only plan
change proposal. It does not import Meal Planner data or mutate plans, recipes,
calendar, groceries, or lists.

## Decision

Meals begins with authorized household summaries for a given date-only local
day. Entries may expose a bounded display label, meal slot, and a canonical
internal recipe handoff only. Recipe instructions/ingredients/notes, images and
URLs, dietary data, serving quantities, grocery generation, and completion
state are deliberately outside this presentation model.

The mini-app must be eligible. Production commands must re-derive context,
reauthorize, validate date/list/calendar conflicts, explicitly confirm,
persist atomically, emit audit/domain/outbox events, and never use an AI or
recipe link to silently alter groceries or a schedule.

## Non-goals and verification

No Recipe/Meal Planner import, source database access, recipe storage, image
attachment, quantity normalization, calendar sync, grocery generation, plan
write, or UI is included. Tests cover app eligibility, date-only filtering,
household isolation, safe links, and proposal-only behavior. Shared Lists and
Groceries integration plus UX/accessibility validation remain before #27 can
close.
