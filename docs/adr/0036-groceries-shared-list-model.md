# ADR 0036: Groceries shared-list model

## Status

Accepted for a read-only grocery presentation model and completion proposal. It does not generate or write grocery lists.

## Decision

Groceries explicitly depends on Shared Lists in the mini-app registry. It accepts only already-authorized household summaries, preserves quantity/category text without rounding or conversion, and orders open entries before completed entries.

A completion request is confirmation-required and does not write state, generate a meal-derived item, or modify a recipe. Future commands must re-derive household context, reauthorize list/item visibility, revalidate version, confirm, apply idempotently, and write audit/domain/outbox evidence. Meal planning may propose reconciliation only; it may not silently add, merge, or purchase items.

## Non-goals and verification

No Meal Planner import, generated list, quantity conversion, list store, purchase-state write, taxonomy, meal integration, UI, or notification is included. Tests cover dependency gating, raw quantity preservation, household isolation, proposal-only completion, and completed-state rejection. Shared Lists implementation and UX/accessibility validation remain before #28 can close.
