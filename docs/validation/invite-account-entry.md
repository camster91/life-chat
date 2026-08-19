# Invite-only account-entry validation

Validated locally on 2026-08-19 with fabricated data and a disposable PostgreSQL 16 database only. No VPS, production, shared, or legacy database was contacted.

## Automated and integration evidence

- The default suite passed 133 tests; the nine database integration tests run only with an explicit disposable database URL.
- The provider/database suite passed 9/9. It covers hashed invitation storage, single-use acceptance, expiry, subject collision, duplicate email, credential hashing, session creation, member/audit/outbox persistence, and compensating deletion of a new user/account/session after an acceptance race.
- Lint, TypeScript, the production Next.js build, production dependency audit, and migration deployment against a fresh database passed.

## Local HTTP evidence

Against a separate fabricated database, `/join` returned 200. The mounted Better Auth `/api/auth/sign-up/email` endpoint returned 400 and created no user. `/api/invitations/accept` returned 201, established the session, and `/api/context` returned 200. Replaying the code returned 409 and created no replay user. Database inspection found exactly one invited auth user, one linked member, and one consumed invitation.

No raw invitation code, password, provider token, or session value is recorded in this document or command output.

## Accessibility evidence

At a 390 by 844 viewport, keyboard focus followed brand, invitation code, email, password, submit, and sign-in in visual order. Every interactive stop had a visible solid focus outline. Invalid/expired-code copy was visible in a live `role="alert"`, and the submit button returned from its pending state. Axe 4.13 reported no WCAG 2.1 A/AA violations on `/join` or `/sign-in`. The recovery-unavailable explanation was visible on sign-in.

This is browser accessibility-tree and automated evidence, not a human screen-reader sign-off. Human screen-reader testing, external delivery/recovery operations, abuse/rate-limit validation, and hosted runtime evidence remain required.
