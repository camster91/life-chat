# ADR 0041: Invite-only account entry

## Status

Accepted for the initial local runtime. Public Better Auth signup remains disabled. No mail delivery, password recovery, first-owner operator command, production configuration, or deployment is included.

## Decision

Life Chat exposes `/join`, not a public registration endpoint. A recipient pastes a raw one-time invitation code into a POST form; invitation secrets are never placed in URLs, logs, household exports, audit metadata, or provider claims. The join POST requires the exact configured origin and returns generic failure copy.

The mounted Better Auth instance keeps `disableSignUp: true`. New-account acceptance uses a separate server-only Better Auth instance that is never mounted as an HTTP handler. Its supported server API validates and hashes the password, creates the credential account, and establishes a session only after Life Chat has prevalidated the unexpired invitation. Life Chat then conditionally consumes the invitation and creates the member, audit event, and outbox event in its existing serializable transaction.

If invitation acceptance fails after account creation, the server uses the fresh Better Auth session and password to invoke Better Auth's supported account-deletion API. An account that survives an interrupted response still has no household authority; the user can sign in and retry the invitation as an existing authenticated subject. Existing users must sign in before entering a code, avoiding email-based account linking or enumeration.

## Security and recovery boundaries

- The browser never chooses a subject, household, role, display name, or member identifier.
- The invitation supplies household, role, and display name; the verified session supplies an existing subject.
- The custom endpoint exposes no provider token or raw session response.
- Provider info logging is disabled on the unmounted provisioning instance.
- Passwords remain in the request/provider boundary and never enter Life Chat records, audits, errors, or documentation.
- A cleanup failure returns a generic conflict. Operators must treat a subject without membership as a recoverable orphan account, never as authorized access.

## Remaining verification and operations

Database integration must prove new-account acceptance, replay/expiry, existing-subject collision, and compensating cleanup. Browser keyboard and screen-reader validation remains required. Before external delivery, select and rehearse the private mail/recovery service, rotation procedure, redacted logging, rate limits, and operator recovery runbook. The first-owner bootstrap still requires a loopback/local-operator command with one-time and replay evidence.
