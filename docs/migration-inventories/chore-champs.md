# ChoreChamps read-only inventory

## Snapshot and boundary

- Source: private `camster91/chore-champs`, default branch `master`, inspected
  read-only on 2026-08-18.
- No source data, production environment, credentials, account, export,
  migration, or repository setting was accessed or changed.

## Observed architecture

The source is a Next.js/React application with Prisma/PostgreSQL, NextAuth
credential/JWT sessions, Zod, web-push, Capacitor, PWA/mobile UI, and a
parent-account plus child-profile model. Its schema has `Family`, `Parent`,
`FamilyMember`, `Kid`, chores/assignments, rewards/redemptions, habits/logs,
goals, badges, notifications, push subscriptions, invitations, recovery codes,
and rate-limit/login-attempt records.

The source README describes local schema drift and treats `db push` as local
setup while production relies on committed migrations. This is a source risk,
not a Life Chat migration approach. Source README privacy/compliance and
deployment claims are not verified or adopted by Life Chat.

## Port/redesign/discard matrix

| Source area | Observed concepts | Life Chat decision | Migration rule |
| --- | --- | --- | --- |
| Family/parent/child model | family, parent account, parent membership, child profile, invite | Redesign | Map to Life Chat subject + household-local member. Do not import passwords, JWT/session data, recovery codes, invite tokens, login attempts, IP/email values, or source role authority. |
| Chores/assignments | chore definition, points/difficulty/icon, recurrence string/time-of-day, per-child due-date assignment, completion status | Port selectively/redesign | Candidate for Chores. Normalize recurrence/timezone, ownership/visibility, assignment, lifecycle, idempotency, audit, and adult review. |
| Completion/gamification | current/longest streak, points/gems/levels, milestone badges | Redesign/defer | Preserve only transparent, age-appropriate progress if selected. Never make points/levels a permission, money, or hidden behavior score; source client-clock streak logic is not canonical. |
| Rewards/redemption | household reward catalogue, point cost, child redemption | Redesign | Candidate for Rewards. Define ledger/approval/reversal/audit separately; source redemption alone is insufficient for allowance or financial behavior. |
| Habits/logs/goals | family habits, dated logs, family goals | Port selectively/redesign | Candidate for Habits/Projects after member, date/timezone, visibility, and retention mapping. |
| Badges/avatar/theme/celebration | badge definitions/earned records, avatar items, visual effects | Defer/discard data | UX reference only. No automatic import of child behavioral history or cosmetic data. |
| Notifications/push | notification title/body/data, web-push endpoint/keys | Redesign/discard | Use Life Chat notification envelopes/preferences; do not import subscriptions, endpoints, keys, or content-bearing notification history. |
| Mobile/PWA/deployment | Capacitor, web push, Docker/VPS scripts, health/smoke, store assets | Reference only | Do not inherit app identifiers, deployment, push certificates, store assets, workflow behavior, or production migration process. |

## Migration risks and requirements

1. Child profiles have no independent subject identity; matching must not infer
   an account or legal guardian relationship.
2. Recurrence/time-of-day/due-date semantics need source data discovery and
   Life Chat timezone conversion before any dry run.
3. Existing point, streak, badge, redemption, and goal data requires explicit
   household opt-in, child-data/retention assessment, and reconciliation.
4. Notifications, tokens, passwords, recovery data, push subscriptions, login
   metadata, and operational tables are prohibited from import.
5. Historical source migration drift means imports must use extracted/versioned
   source records and reports, never invoke source Prisma migration tooling.

## Next phases

Use #38–#41 to define a source-record adapter, dry-run mapping/count/exclusion
report, idempotency/rollback, and agreed parity. A future opt-in scope may
consider low-risk chore definitions and verified completion history only after
app contracts, privacy governance, and adult review are approved. Nothing here
authorizes an import, source change, or retirement.
