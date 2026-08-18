# ADR 0022: Import rollback strategy

## Status

Accepted as a review-only migration safety boundary. No import execution or
rollback is authorized by this decision.

## Decision

Every future import batch must have a durable, household-scoped journal before
its first mutation. Each journal entry records the opaque batch and target
references, mutation class, target version immediately after import, and—when
the mutation was an update—a protected pre-import snapshot reference. It must
be retained under the data-governance and recovery policies.

The initial planner turns that journal into **compensating instructions** only:

- a created record may be retracted only when its version still equals the
  recorded post-import version;
- an updated record may be restored only from its pre-import snapshot and only
  when its version still equals the recorded post-import version;
- missing snapshots, a batch mismatch, household mismatch, malformed version,
  or a later target change stops that record. There is no generic bulk delete.

`eligibleForApprovedRollback` is a review result, not permission to mutate.
Actual rollback needs explicit action-time approval, fresh active household
context and authorization, a transactionally rechecked version, audit/outbox
events, and an isolated-environment rehearsal. It must keep outbound
notifications, messages, provider calls, and AI actions disabled; none may be
replayed during recovery.

## Ownership and evidence

The adult who approved an import owns the initial rollback decision. A future
operator must document the batch, decision maker, reason, affected safe counts,
backup/restore point, audit correlation, verification, and any stopped records.
Conflicts transfer to an authorized household adult; they are never silently
overwritten by a migration process.

## Verification and non-goals

Unit tests cover no-write planning, create/update compensating paths,
pre-import evidence requirements, household scoping, and batch integrity. A
real execution system still requires database transactional tests, a restore
rehearsal, authorization/audit/outbox integration, and a time-bounded approval
flow. This adds no database, journal persistence, rollback command, source
operation, deployment, or legacy retirement.
