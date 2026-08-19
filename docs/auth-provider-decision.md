# Authentication provider decision

## Status

Accepted on 2026-08-18: use **Better Auth**, self-hosted with Life Chat, for
identity and sessions. It will use the Life Chat PostgreSQL instance on the
VPS; no managed identity service is a core dependency.

This selects the provider boundary only. No VPS, real user account, session
secret, email sender, domain, credential, or production configuration has been
created. The initial Better Auth and Life Chat foundation migrations exist and
have been rehearsed only against an isolated local PostgreSQL database; they
have not been applied to a VPS, shared, legacy, or production database.

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

## Initial sign-in policy

Use local email/password authentication with an invite-only account-creation
policy. The public Better Auth sign-up endpoint is disabled. A later invitation
acceptance command must authorize the invitation transactionally before it can
create/link an account; it must not enable broad self-registration as a
shortcut.

The initial password policy is 12–128 characters. Better Auth's local
credential storage is used; passwords never enter Life Chat domain records or
logs. Account verification, password-reset delivery, MFA, and passkeys remain
unimplemented until a self-hosted mail/recovery design is selected and tested.

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

Implementation of the first-owner bootstrap, invitation acceptance, and
recovery delivery is tracked in #53. Until that work is complete, the auth
foundation deliberately has no route that can create a household account.

The first-owner bootstrap plus invitation issuance/acceptance contracts now
have durable transaction/audit/outbox persistence, including a local PostgreSQL
integration test for hashed-token storage and single-use acceptance. A
lifecycle command also prevents suspension or removal of the final active
adult, writes audit/outbox evidence, and has local PostgreSQL integration
coverage. Account creation/linking through a secure entry flow, local
delivery/recovery, guest expiry, subject/member unlinking, and
production-readiness validation still remain before #53 can close.

## Account-entry design gate

Do not create Better Auth user/account rows directly from Life Chat code and do
not temporarily enable public sign-up. The remaining account-entry flow must
use a Better Auth-supported mechanism that validates a single-use invitation
before password/session creation and preserves a recoverable failure path if
either provider or domain persistence fails. Its transaction boundary, CSRF
handling, token transport, retry behavior, account-link collision policy, and
local integration proof require a dedicated implementation decision before a
route is added.
