# Authentication provider decision

## Status

Decision required before a production identity adapter, session flow, invitation
acceptance, or database-backed active-context route is implemented. This file
does not select or configure a provider.

## Non-negotiable adapter contract

The provider proves only a stable opaque authenticated-subject reference. Life
Chat owns household members, invitations, active-context selection, role and
capability evaluation, audit records, recovery policy, and authorization. A
provider subject ID, email, name, or claim is never a household authorization
key.

The adapter must support secure, server-verifiable sessions; subject deletion or
lock signals; controlled account linking; and a testable local/dev mode without
production credentials. Provider secrets, session IDs, access tokens, and raw
claims stay outside application logs, issues, browser state, export packages,
and household records.

## Candidates to evaluate

| Option | Strength | Decision risk to resolve |
| --- | --- | --- |
| Auth.js adapter | Keeps provider choice behind an application-owned adapter and can support multiple sign-in methods. | Select the credential/identity source, secure session strategy, recovery/MFA posture, email sender, and operational ownership. |
| Clerk | Fast managed session and account UI foundation. | Confirm custody, pricing, data residency, child/guest handling, export/deletion path, lock-in/exit plan, and server-only authorization boundary. |
| Supabase Auth | Can align authentication with a PostgreSQL platform if that platform is selected. | Confirm whether database hosting is also intended, RLS/adaptor boundary, custody, pricing, data residency, exit plan, and environment separation. |
| Other | May meet a specific household/product constraint. | Must demonstrate every required contract and a local/test strategy before adoption. |

## Required acceptance tests for any choice

1. Sign-in yields an opaque subject and no household data without a separately
   resolved active member.
2. A tampered household/member ID, URL, form, route, or tool argument cannot
   cross a household boundary.
3. Member selection accepts only active, subject-linked, non-expired members;
   guest expiry/revocation fails closed.
4. Invitation acceptance is single-use, time-limited, transactional, and does
   not log secrets or raw sessions.
5. Household switching reauthorizes each request and forces pending unsaved or
   proposed-action resolution.
6. Subject/member unlink, suspension, removal, and last-adult protection are
   audited and revoke scoped access/cache/queued intents as applicable.
7. Local and CI tests use fabricated subjects and disposable data, without
   production credentials or network dependence.
8. Provider outage, malformed claims, expired session, callback replay, and
   account-link collision fail closed with a normal UI recovery path.

## Related decisions still needed

The selected provider does not decide PostgreSQL hosting, secret manager,
transaction/outbox implementation, email delivery, MFA/recovery UX, legal
guardian policy, production environment, or deployment. Those remain separate
approved environment/product decisions under ADRs 0002, 0011, and 0018.
