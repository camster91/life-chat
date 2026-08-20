# ADR 0036: Groceries shared-list model

## Status

Accepted for a Shared Lists-backed grocery classification and normal list entry point. It does not generate groceries or introduce a separate grocery store.

## Decision

Groceries explicitly depends on Shared Lists in the mini-app registry. A grocery list is a canonical Shared List whose purpose is `grocery`; its items, completion state, audit trail, recovery behavior, and household isolation remain owned by Shared Lists. Adults can create a grocery-purpose list through the Groceries UI, while adults and children can read eligible grocery lists. Guests remain denied.

A completion request is confirmation-required and does not write state, generate a meal-derived item, or modify a recipe. Future commands must re-derive household context, reauthorize list/item visibility, revalidate version, confirm, apply idempotently, and write audit/domain/outbox evidence. Meal planning may propose reconciliation only; it may not silently add, merge, or purchase items.

## Non-goals and verification

No Meal Planner import, generated list, quantity conversion, purchase-state write, taxonomy, meal integration, or notification is included. The isolated local migration rehearsal, normal UI, and Shared Lists command boundaries provide the initial evidence. Grocery-specific integration, quantity/category capture, meal reconciliation, and authenticated UX/accessibility validation remain before #28 can close.
