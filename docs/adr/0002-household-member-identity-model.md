# ADR 0002: Household/member identity model

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #3, #4, #7, #12, #43, #44

## Decision

Separate the global **authenticated subject** from a household-local **member**.

- An authenticated subject is a provider-agnostic, opaque account identity. It has no household role and no direct access to household data.
- A member is a profile belonging to exactly one household. It has a display profile, lifecycle, baseline persona, preferences, and optional link to an authenticated subject.
- An authenticated subject may link to multiple members across households. A member links to at most one authenticated subject in the initial model.
- A child may be a managed member without an authenticated subject. Activating a child's independent sign-in links an account later and is audit-sensitive.
- A guest is a member with an explicit expiry and narrow capabilities defined by #4; expiry denies access without data deletion.

Authentication proves only the subject. For every server request, the application derives an active context from that subject's active member record. A client may request a member selection, but never supplies a trusted household ID. The server verifies that the requested member is active, belongs to the authenticated subject, and is not expired; it then derives the household from that member.

## Lifecycle

| Record | States | Rules |
| --- | --- | --- |
| Authenticated subject | active, locked, deleted | Provider identifiers are opaque and never used as a household/member ID. Deletion/unlinking preserves required audit references through a non-reusable internal ID. |
| Member | invited, active, suspended, removed | Only `active` members can establish active context. Removing/suspending ends access but retains an auditable record according to retention policy. |
| Invitation | pending, accepted, expired, revoked | Contains a hashed, single-use, time-limited secret; acceptance requires an authenticated subject and creates/links exactly one member in a transaction. |
| Guest access | active until expiry, expired, revoked | Expiry/revocation fails closed. It does not silently promote to another persona. |

## Invariants

- A member belongs to one and only one household. Cross-household use requires a distinct member record.
- A household-scoped request without an active context is denied.
- The browser cannot select another household by modifying an ID, URL, form field, or chat/tool argument.
- Household/member switching re-authorizes every request; unsaved changes and pending AI proposals require an explicit UI resolution.
- A household cannot be left without an adult. The exact adult/capability rule is #4 and must be enforced transactionally.
- Invitations, member links/unlinks, lifecycle transitions, and active-context changes emit audit events without logging secrets or raw session identifiers.
- Subject unlinking reauthorizes the current adult inside the serializable transaction, clears the provider-subject link, suspends the member, and prevents removal of the final active adult. A surviving provider session has no household authority after unlinking.
- Expired guests are denied by request-time context resolution immediately; an idempotent system command also transitions eligible expired guests to suspended and emits one audit/outbox pair.
- No email address, provider claim, name, or legacy external ID is a stable authorization key.

## Provider/session boundary

Better Auth is the self-hosted provider behind an application-owned adapter. It
must yield a stable opaque subject reference and use secure cookie/session
behavior. The application owns member records, household membership,
invitation logic, active-context derivation, and authorization. Session IDs
and invite secrets are never logged, included in URLs, or stored as plain text.

## Non-goals

- Selecting password/passkey/magic-link, MFA/recovery UX, or a social-login list.
- Defining roles/capabilities, which is #4.
- Defining the physical schema, ORM model, or migration, which is #43.
- Solving legal guardianship, custody, identity proofing, or child consent; those remain #44.

## Verification

- Pure context-resolution tests prove that only an active, subject-linked, non-expired member can produce a household context.
- Future integration tests must prove cross-household ID tampering, revoked/expired guest access, invitation replay, and last-adult protection are denied.
- This decision is based on server-side, deny-by-default authorization and secure session-boundary guidance. Better Auth is selected but not configured or deployed.
