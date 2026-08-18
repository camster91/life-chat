# Authentication provider decision

## Status

Accepted on 2026-08-18: use **Better Auth**, self-hosted with Life Chat, for
identity and sessions. It will use the Life Chat PostgreSQL instance on the
VPS; no managed identity service is a core dependency.

This selects the provider boundary only. No VPS, database, user account,
session secret, email sender, domain, credential, or production configuration
has been created. No Better Auth migration has been generated or applied.

## Non-negotiable adapter contract

Better Auth proves only a stable opaque authenticated-subject reference. Life
Chat owns household members, invitations, active-context selection, role and
capability evaluation, audit records, recovery policy, and authorization. A
provider subject ID, email, name, or claim is never a household authorization
key.

The adapter must support secure, server-verifiable sessions; subject deletion or
lock signals; controlled account linking; and a testable local/dev mode without
production credentials. Provider secrets, session IDs, access tokens, and raw
claims stay outside application logs, issues, browser state, export packages,
and household records.

## Selected integration shape

| Concern | Decision |
| --- | --- |
| Provider | Better Auth, mounted through a Next.js server route. |
| Storage | Database-backed Better Auth records in the self-hosted PostgreSQL service; Life Chat domain records remain application-owned. |
| Application boundary | A small server-only adapter exposes only the opaque authenticated subject and verified session state to Life Chat authorization. |
| Authorization | Every request still derives active household context and capabilities from Life Chat member records; Better Auth data is never a source of household authority. |
| Portability | The adapter, not feature code, owns Better Auth imports. Replacing it must not change household/member, invitation, role, audit, or command contracts. |
| Local/test mode | Fabricated subjects and disposable databases only; no production credentials or network-dependent test setup. |

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

The selected provider and self-hosted topology do not decide the initial
sign-in method (password, passkey, or magic link), MFA/recovery UX, email
delivery, secret manager, transaction/outbox implementation, backup/restore
operations, legal guardian policy, production domain, or deployment procedure.
Those remain separate decisions under ADRs 0002, 0011, and 0018.
