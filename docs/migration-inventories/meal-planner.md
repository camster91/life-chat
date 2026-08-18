# Meal Planner read-only inventory

## Snapshot and boundary

- Source: private `camster91/meal-planner`, default branch `main`, inspected
  read-only on 2026-08-18.
- No source data, SQLite file contents, credentials, export, environment, or
  repository/deployment state was modified or imported.

## Observed architecture

The source is a Next.js/React app with Prisma over SQLite, email/password JWT
sessions, route protection, and APIs for recipes, meal plans, shopping lists,
grocery lists, and shopping-list generation. Its schema uses a personal `User`
as owner of recipes, plans, and lists. A recipe has free-text instructions,
image URL, ingredients, floating quantities/units/notes; a meal plan has date
range and dated meal entries; shopping items have optional float amount, unit,
category, check state, and recipe reference. The repository includes a local
development SQLite database path and one migration history.

## Port/redesign/discard matrix

| Source area | Observed concepts | Life Chat decision | Migration rule |
| --- | --- | --- | --- |
| Recipe and ingredients | recipe metadata/instructions/images, ingredient library, recipe ingredients, servings/units | Port selectively/redesign | Candidate for Meals. Recipes need household/personal ownership, visibility, attachment/image access policy, free-text retention, and source attribution rules. |
| Meal plans | named date range, meal entry date/type/servings, recipe relation | Port selectively/redesign | Candidate for Meals/Calendar. Convert only after date-only versus timed/timezone semantics are discovered and mapped. |
| Shopping/grocery lists | named lists, generated/manual items, category, checked, recipe link | Port selectively/redesign | Candidate for Groceries/Shared Lists. Preserve provenance where approved; normalize permissions, ordering, units, and duplicate/merge behavior. |
| Ingredient quantities/servings | floating amounts and free-text units/notes | Redesign | Quantity/units are domain values, not money; establish normalization/precision and preserve original text where needed. Do not silently round ambiguous quantities. |
| User/auth/JWT | individual user ownership, email/password/session cookies | Redesign/discard sensitive data | Map only verified identity/member relationship. Never import password hashes, session/JWT values, auth secrets, or source user authority. |
| Image URLs/files | recipe image URL | Redesign/defer | Never trust or transfer remote URLs as attachment authorization. Import requires owner/right/availability/integrity review. |
| SQLite/migrations/runtime | local SQLite file, Prisma migration, Docker/CI | Reference only | Do not copy source database, run its migrations, or inherit runtime/deployment controls. |

## Migration risks and required discovery

1. Source ownership is personal rather than household-scoped; shared recipes,
   plan visibility, assignees, and member permissions need target policy.
2. Source date fields do not prove all-day/timezone behavior. Meal/Calendar
   integration needs an explicit date-only mapping and conflict behavior.
3. Recipe instructions, notes, URLs, categories, and units are content-bearing
   fields subject to privacy, validation, retention, and attachment policy.
4. Generated shopping lists need deterministic provenance, duplicate handling,
   and user-visible reconciliation instead of a blind source copy.
5. No verified source export format was identified in this inventory; routine
   import work must begin with synthetic adapters and #38 contract discovery.

## Next phases

Future opt-in migration may consider user-selected recipes, ingredients, and
meal plans only after source export, household/member matching, visibility,
date/unit, attachment, and dry-run reports are defined. Shopping-list state is
separately optional due to active/purchased semantics. #38–#41 own all import,
rollback, and parity evidence. Nothing here authorizes source mutation,
database access, import, or retirement.
