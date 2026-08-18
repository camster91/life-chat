# ADR 0003: Roles and permission engine

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #4, #5, #7, #11–#13, #43–#44

## Decision

Life Chat uses a deny-by-default, server-side capability engine. A member's baseline persona (`adult`, `child`, or `guest`) supplies only a small set of named permissions; a scoped, expiring capability grant can add an explicitly justified exception. Roles are never checked directly by feature code.

Every authorization decision receives the server-derived active household context from ADR 0002, a requested permission, and the target household/app/resource scope. The engine denies a request when the context is missing/inactive, the requested household differs, the permission is unknown, or no matching baseline/grant exists. A browser, chat tool, URL, form, or client action cannot override this decision.

## Baseline personas

| Persona | Baseline | Explicitly not implied |
| --- | --- | --- |
| Adult | Household/member read and management, app configuration, audit read, data export, and AI proposal/confirmation eligibility. | Permission to bypass record visibility, approve an action without later risk policy, or access another household. |
| Child | Read household context, read/update own profile preferences, and propose an AI action. | App-wide data, household management, export, audit access, and consequential AI confirmation. |
| Guest | No broad baseline record access. | Discovery of household data, membership data, exports, AI, or any access after expiry. |

Mini-app resource permissions are introduced only through the registry/contracts in #5/#43. A feature may define a narrow permission such as `chores.complete-assigned`, but it must define target visibility/ownership and tests at the same time.

## Scoped grants

A grant names one permission and the member, household, optional app/resource scope, expiry, grantor, and audit correlation. The grantor must have a separately authorized management permission. A grant never crosses household boundaries, becomes invalid when its member is suspended/removed, and fails closed at expiry. Broad wildcard grants are prohibited in the initial model.

## Mutation rules

- Authorization is evaluated on every read and write at the server boundary, and again at AI confirmation/execution time.
- Domain services—not UI components—enforce permission and record-visibility checks.
- Membership/role/grant changes, exports, app enablement, and AI action confirmation write audit events.
- Removing the final adult, self-escalation, cross-household grants, and silent role inheritance are prohibited. Transactional enforcement is part of the physical data contract in #43.
- The permission engine answers eligibility, not user experience. UI may explain an unavailable action but must not use hidden controls as enforcement.

## Non-goals

- Fine-grained mini-app permissions, physical tables, row-security policy, and delegated administration UX.
- A final child-consent/guardian/legal policy (#44).
- AI risk classification and step-up confirmation requirements (#11).
- An authorization vendor or policy-as-code service.

## Verification

Pure authorization tests cover deny-by-default, household isolation, child/guest limits, grant expiry, and scope matching. Integration tests later must cover server actions, route handlers, tools, queries, and database-level defences. The policy follows OWASP's server-side, least-privilege, deny-by-default guidance; current tests prove only the local pure engine.
