# Migration plan

Legacy repositories are reference sources only. Do not change their code, repository settings, data, or deployments during discovery or migration planning.

## Framework

For every capability and data set, make one explicit decision:

- **Port** when it provides durable domain behavior/data that fits the shared model.
- **Redesign** when the user value remains but the UX, data ownership, permissions, or technical structure should change.
- **Discard** when it is obsolete, duplicated, unsafe, unsupported, or conflicts with the canonical product.

Inventory source behavior, schemas, integrations, auth/roles, exports, privacy obligations, and operational constraints. Define import contracts and reversible dry runs before writing target data. Verify source/target parity for the agreed scope and retain the old deployment until formal retirement approval.

| Reference repository | Initial disposition | Discovery focus |
| --- | --- | --- |
| `camster91/family-planner` | Redesign/port selectively | Household context, calendar, tasks, family model, navigation, and data boundaries. |
| `camster91/lifestreak` | Redesign | Habit history, streak semantics, reminders, accessibility, and exportable progress. |
| `camster91/chore-champs` | Redesign/port selectively | Child/adult permissions, assignments, rewards, recurrence, and auditability. |
| `camster91/meal-planner` | Redesign/port selectively | Meal plans, grocery flows, recipes/imports, calendar integration, and household sharing. |
| `camster91/budget-app` | Redesign/port selectively | Money representation, categories, imports, privacy, reporting, and financial-data retention. |

## Migration stages

1. Inventory each source repository and approve a port/redesign/discard matrix.
2. Define canonical import/export contracts, identity matching, conflict policy, and privacy/retention boundaries.
3. Build dry-run tooling that reports mappings, validation failures, counts, and no mutations.
4. Build rollback/recovery procedures and test them with representative data.
5. Run controlled imports, verify agreed source/target parity, and collect sign-off.
6. Retire an old deployment only after explicit approval; this repository does not authorize retirement.

## Inventory records

- [Family Planner read-only inventory](migration-inventories/family-planner.md)
