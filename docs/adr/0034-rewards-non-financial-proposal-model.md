# ADR 0034: Rewards non-financial proposal model

## Status

Accepted for a non-financial catalogue and redemption-request foundation. It
does not implement an allowance, balance, earning rule, payment, or ledger.

## Decision

Rewards is enabled only when its Chores dependency is eligible. The initial
catalogue accepts already-authorized, household-scoped, non-financial reward
summaries. Any active member may request a listed reward, but the request
explicitly requires adult approval. `rewards.approve` is a distinct adult
capability; a request is neither approval nor fulfillment.

Future approval/execution requires a durable ledger, policy/version checks,
fresh authorization, explicit confirmation, idempotency, audit/domain/outbox
events, reversal/dispute handling, age-appropriate visibility, and separate
money/allowance rules using integer minor units. No ChoreChamps points or
redemption history is authority for Life Chat.

## Non-goals and verification

No balance, points, money, allowance, earning, payment provider, redemption
write, fulfillment, notification, or migration is included. Tests cover app
dependency eligibility, household isolation, adult-only approval capability,
and request-only behavior. Ledger/UI/accessibility work remains before #26 can
close.
