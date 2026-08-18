# Budget App read-only inventory

## Snapshot and boundary

- Source: private `camster91/budget-app`, default branch `main`, inspected
  read-only on 2026-08-18.
- No financial data, account credentials, Plaid tokens, receipt images, imports,
  exports, production environment, or source repository setting was accessed or
  changed.

## Observed architecture

The source is a Next.js/React/PostgreSQL/Prisma personal-finance app with
custom JWT authentication, PWA/Capacitor/offline components, local notification
and monitoring scripts, CSV/PDF/Tangerine parsing, optional Plaid, client-side
receipt OCR, and server actions for transactions, accounts, budgets, bills,
goals, exports/imports, patterns, and review. Its schema scopes personal users
to a `Household` and represents financial amounts as integers, generally noted
as cents.

Observed entities include transactions, categories, budgets, accounts, bills
and bill payments, goals/contributions, income, receipt records, spending
patterns, daily period/no-spend entries, and wish-list items. Accounts may hold
encrypted Plaid access-token/item/cursor metadata; receipt records may include
image URLs, parsed merchant/date/items, and confidence; transactions may carry
fingerprints, import/reconciliation/duplicate/source fields. The repository has
several source migration/history-repair files and deployment/auto-merge assets.

## Port/redesign/discard matrix

| Source area | Observed concepts | Life Chat decision | Migration rule |
| --- | --- | --- | --- |
| Household/identity/auth | household, personal user, JWT/recovery | Redesign | Map only verified target subject/member/household relationships. Never import password/JWT/recovery data or source role/access assumptions. |
| Transactions/categories/budgets | integer amounts, dates, category rules, period budgets/carryover | Port selectively/redesign | Candidate for Budget after a multi-member visibility/permission and currency/locale contract. Preserve original amount/currency/source evidence; reconcile totals. |
| Accounts/bank sync | accounts/balances and Plaid token/item/cursor fields | Defer/discard credentials | Do not import bank connection metadata, access tokens, cursors, live balances, or sync state. Future aggregation needs separate provider/security/consent work. |
| Bills/income/goals | recurrence, due days, payments, income frequency, saving goals | Port selectively/redesign | Map after timezone/date/recurrence semantics and financial review policy are defined. Do not auto-schedule, pay, or create external effects. |
| Imports/deduplication/reconciliation | CSV/PDF/bank parser, fingerprints, duplicate flags, statement links | Redesign | Reuse only the need for deterministic, reviewable import/reconciliation. Source parser outputs are untrusted and need new #38 validation/provenance rules. |
| Receipts/OCR/AI | receipt images, OCR fields/confidence, optional AI/insights | Defer/discard by default | Financial documents and extracted merchant/line-item data are highly sensitive. No image, OCR result, prompt, provider data, or confidence record is imported without separate approval. |
| Patterns/scores/gamification | spending patterns, health score, no-spend/streak data | Redesign/defer | Do not migrate inferred behavioral data or scores by default. Any product insight needs clear purpose, explainability, privacy, and opt-in rules. |
| Exports/offline/mobile/deployment | CSV export, PWA sync, Capacitor, scripts/workflows | Reference only | Life Chat uses its own export, offline, release, notification, and rollback contracts. |

## Migration risks and required discovery

1. Amounts are integer-based, but schema alone does not prove currency,
   precision, historical migration conversions, or source rounding behavior.
   An import requires explicit currency and control-total reconciliation.
2. Financial transaction descriptions, categories, merchant fields, receipts,
   bank statements, and inferred patterns are sensitive data under the
   governance baseline; minimization and opt-in scope precede mapping.
3. Date-only due days, transaction instants, bill recurrence, timezone, account
   balance point-in-time, transfer handling, duplicates, and reconciliation
   state need discovery and cannot be inferred from model names.
4. External connection tokens, credentials, raw statements, receipt binaries,
   OCR/AI inputs, and source telemetry are prohibited import classes.
5. Source migration repair files and operations are not a target migration plan;
   use extracted/versioned source records, synthetic fixtures, and Life Chat's
   separate rollback/rehearsal gates.

## Next phases

If an owner later approves an opt-in import, start with a non-production dry
run of selected category/transaction/budget records, preserve source references
and exclusions, produce per-household balance/count/control-total reports, and
require adult review before any write. Accounts, bank sync, receipts, OCR,
inferences, and automated action remain excluded. #38–#41 own shared import,
rollback, and parity evidence; no source modification, import, or retirement is
authorized by this inventory.
