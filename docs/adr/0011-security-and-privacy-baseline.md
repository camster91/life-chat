# ADR 0011: Security and privacy baseline

## Status

Accepted as the product implementation baseline. It is not a published
vulnerability-disclosure policy and does not assert deployed controls.

## System and scope

Life Chat is a household-scoped web application with a future PostgreSQL
canonical store, first-party web UI, optional AI-provider adapters, and
future attachment, notification, export, and migration paths. It holds family
information, child profiles, messages, schedules, household activity, optional
financial planning records, and provider configuration references. Legacy
repositories remain read-only references and are outside this system boundary.

## Threat model and trust boundaries

Treat browsers, URL/query data, form input, imports, attachments, external
webhooks, provider responses, notification callbacks, and every client-supplied
household/member/resource ID as untrusted. Authenticated subjects are not
automatically authorized household members. An active household context,
server-side permission check, visibility policy, and mini-app enablement are
required at every protected read or write.

High-value assets are canonical household records, child data, sessions and
invitation secrets, exports and attachments, provider credentials, AI context,
and audit integrity. A vendor/provider, notification channel, search index,
cache, or client device is never a source of authorization truth.

## Data handling rules

| Class | Examples | Handling rule |
| --- | --- | --- |
| Restricted | sessions, invite secrets, passwords, provider keys, signed URLs | Secret-store or secure session mechanism only; never log, place in URLs, commit, export, or expose to browser state. |
| Private household data | messages, attachments, schedules, budgets, child profile data, AI context | Household/member/record visibility checks; minimized disclosure; encrypted transport and environment-managed storage; no public object URLs. |
| Controlled evidence | audit events, domain-event references, metering | Opaque IDs and bounded redacted metadata only; append-only and access-controlled. |
| Operational | health status, aggregate metrics, feature configuration | No private record content or direct identifiers unless explicitly approved and protected. |

## Required security invariants

- Derive active household context from the authenticated session on the server;
  reject cross-household access and fail closed when context, membership,
  permission, app enablement, or visibility is missing.
- Validate and bound all untrusted input at the server/domain boundary. Use
  opaque internal IDs; use parameterized queries/ORMs; authorize attachment
  download, preview, processing, and deletion separately from record lookup.
- Protect sessions, CSRF-sensitive mutations, invitations, recovery flows, and
  provider callbacks with the selected authentication/integration controls.
  Their exact implementation is intentionally unselected, not assumed.
- Keep secrets in deployment secret management. Rotate/revoke on suspected
  exposure; never accept a secret from a client as an identifier or log it.
- Keep audit and application logs separate and redacted. Audit evidence is
  append-only; operational logs have minimum retention and no private content.
- AI receives a least-privilege, permission-filtered request and must use the
  proposed-action flow for meaningful changes. Providers, tools, and prompt
  data cannot bypass household authorization.
- Exports, imports, backups, and restores follow authorization, checksums,
  encryption/storage, expiry, and auditable lifecycle requirements. No restore
  claim is valid until an environment-specific rehearsal succeeds.
- Child and guest access remains least-privilege. Product teams must not add
  behavioral advertising, broad analytics, or external data sharing by default.

## Reportable risk context

A finding is material when it permits cross-household access, privilege
escalation, unapproved mutation, private-data/secret disclosure, attachment or
export bypass, audit tampering, unsafe AI execution, or durable compromise of a
future production environment. Severity depends on reachable impact and actual
deployment exposure; this repository's pure tests show intended behavior only.

## Known limitations and follow-up decisions

- Authentication provider, session/CSRF implementation, hosting, key manager,
  encryption configuration, attachment scanner, retention durations, child-data
  consent process, incident contacts, and vulnerability reporting channel are
  not selected.
- No production database, upload route, external integration, telemetry, or
  security monitoring exists yet. Future implementation needs threat-model
  review, dependency/security scanning, integration tests, and environment
  evidence before a release claim.
- A root `SECURITY.md` disclosure policy is deliberately not added here. Its
  scope, contacts, and triage commitments need explicit owner confirmation.
