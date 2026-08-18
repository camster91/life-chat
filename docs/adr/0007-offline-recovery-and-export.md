# ADR 0007: Offline, recovery, and export strategy

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #8, #12, #14, #38–#41, #43, #44, #48, #50

## Decision

Life Chat is online-first with bounded offline support. The server is the only canonical household source of truth. A device may retain an explicitly scoped, encrypted-at-rest cache for recently authorized read data and may queue a limited low-risk user intent, but it may not independently resolve household authority, permissions, destructive operations, consequential AI actions, or external delivery.

## Offline behaviour

| Capability | Offline policy |
| --- | --- |
| Read recently authorized records | Available when a cache is present; visibly marked stale/offline and never expanded to new household data. |
| Complete an assigned low-risk task or record an append-only personal completion | Queue intent with device ID, idempotency key, canonical base version, active member reference, and local timestamp. Server re-authorizes on sync. |
| Edit shared text, ordering, schedule, or a value with concurrent change risk | Queue as a conflict candidate; do not auto-merge silently. |
| Membership/role/grant, app configuration, deletion, export/restore, money/allowance, provider settings, external messages, AI confirmation/execution | Online only. The client explains why and supplies no local “completed” state. |

The initial implementation may ship with read-only offline cache before queued writes. It must never claim full offline synchronization until its command queue, device storage, conflict UI, recovery, and physical-device tests are complete.

## Conflict and sync rules

- Every queued intent has a unique device-generated idempotency key and known base version.
- Sync re-derives active household context, re-checks permission/app enablement/record visibility, validates current state, and emits audit events. A local queue is never authority.
- The server may accept an idempotent monotonic completion only when it remains allowed and is semantically compatible. Concurrent text/field edits, list reordering, schedules, deletions, grants, money, and all AI action confirmations require a conflict or explicit re-entry in current UI.
- Conflict records retain local intent and current canonical reference but never retry external delivery or an AI mutation automatically.
- Sign-out, member revocation, household switch, or device-cache invalidation clears/revokes scoped cached data and queued intents according to recovery/privacy policy.

## Export format

An authorized, confirmed household export is an asynchronous immutable package with a JSON manifest. The manifest contains format/schema version, generated UTC instant, household opaque ID, included app/schema versions, file paths, byte sizes, and SHA-256 checksums. Records are portable JSON; attachments are separate files referenced by stable IDs and checksums; audit data is exported only as permitted redacted evidence. Secrets, provider keys, sessions, tokens, raw system logs, and signed download URLs are never included.

Export creation is auditable. The package is generated from a consistent point-in-time snapshot, encrypted/stored/delivered through environment controls in #50, and expires according to governance in #44. A requester sees a completion state only after package integrity checks pass.

## Backup, restore, and recovery

- Environment operations must back up canonical database data and attachments from a compatible point, retain a manifest/checksum, encrypt storage, and preserve a documented offsite/retention policy (#50).
- A restore is first rehearsed in an isolated environment. It verifies checksums, schema/app compatibility, record counts, access boundaries, and sampled canonical reads before any promotion decision.
- Restore/import disables outbound notifications, messages, provider calls, and AI execution by default. Those effects are never replayed merely because an event is restored.
- Production restore, destructive recovery, legacy import, or retirement requires action-time approval plus a verified rollback point. This ADR does not authorize any of them.
- Recovery objectives, backup frequency, retention durations, and storage providers remain explicit environment/governance decisions; no unverified RPO/RTO is claimed.

## Non-goals

- A database, service worker, client-side encryption implementation, full CRDT system, backup provider, restore tooling, or migration importer.
- Automatic conflict resolution for consequential actions or a claim that local cache is private on a compromised device.

## Verification

Pure tests classify unsafe offline intents as online-only/conflicting and validate an export manifest’s paths/checksums. Later evidence must include device-cache threat tests, sync integration tests, isolated restore rehearsal, download authorization/expiry tests, and migration dry-run/rollback proof.
