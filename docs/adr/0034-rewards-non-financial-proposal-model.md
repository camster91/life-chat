# ADR 0034: Rewards non-financial proposal model

## Status

Accepted for a non-financial catalogue, request, and adult-decision flow. It
does not implement an allowance, balance, earning rule, payment, or ledger.

## Decision

Rewards is enabled only when its Chores dependency is eligible. The initial
catalogue accepts already-authorized, household-scoped, non-financial reward
summaries. Any active member may request a listed reward, but the request
explicitly requires adult approval. Adults manage the catalogue and have the
distinct `rewards.approve` capability; adults and children can read/request;
guests are denied. A request is neither approval nor fulfillment. The normal UI
presents explicit Confirm/Cancel review before a request or decision.

Every catalogue create, request, and approval/rejection derives context
server-side, reauthorizes household/app access in a serializable transaction,
retains an idempotent command ID, and writes audit/outbox evidence atomically.
An adult decision is final in this slice and records only its status—never a
balance change or reward delivery.

Future approval/execution requires a durable ledger, policy/version checks,
fresh authorization, explicit confirmation, idempotency, audit/domain/outbox
events, reversal/dispute handling, age-appropriate visibility, and separate
money/allowance rules using integer minor units. No ChoreChamps points or
redemption history is authority for Life Chat.

## Non-goals and verification

No balance, points, money, allowance, earning, payment provider, fulfillment,
notification, reversal/dispute workflow, or migration is included. Tests cover
app dependency eligibility, household isolation, adult-only setup/approval,
replay-safe request/decision behavior, and audit/outbox writes. Ledger,
recovery/export, authenticated browser, screen-reader, and usability work
remain before #26 can close.
