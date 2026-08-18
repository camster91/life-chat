# ADR 0040: Budget minor-unit overview

## Status

Accepted for a read-only, category-total budget view and allocation-change proposal. It does not connect financial accounts or write financial data.

## Decision

Budget requires a distinct adult `budget.view` permission and an eligible mini-app. The first overview accepts only authorized household category totals in one ISO currency, validates all amounts as non-negative safe integer minor units, and exposes allocated, spent, and remaining totals. It excludes transaction/account/merchant/receipt descriptions and all inferred behavioral data.

Any allocation change is a confirmation-required proposal. Future commands need a distinct write permission, fresh authorization, current balance/category/version validation, idempotency, clear user-visible amount/currency, atomic canonical/audit/domain/outbox persistence, rollback/dispute policy, and separately approved export/retention controls. It cannot create bank, payment, transfer, or financial-advice effects.

## Non-goals and verification

No bank connection, token, account, transaction, receipt/OCR, import, score, recommendation, payment, balance reconciliation, financial export, UI, or migration exists here. Tests cover role/app gating, integer minor units, currency consistency, household isolation, and proposal-only allocation changes. Real financial-data governance, persistence, UI, and UX/accessibility validation remain before #32 can close.
