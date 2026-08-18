# ADR 0023: Migration parity and retirement gate

## Status

Accepted as a reconciliation and sign-off boundary. It does not approve an
import, deployment change, retirement, archive, deletion, or legacy mutation.

## Decision

Parity is evaluated only against an agreed, versioned migration scope after a
dry run and a controlled, approved import. For every included canonical target
type, the approved source mapping must provide a safe expected control total:
record count plus an opaque deterministic checksum. The target produces the
same form of observed total from its authorized household scope. No raw source
content, financial descriptions, messages, attachments, prompts, tokens, or
identity matches appear in the report.

The reconciliation function returns differences for count/checksum mismatches
or absent types and fails closed for duplicate/malformed controls or a
household-context mismatch. A report can say `verified` only when every agreed
total matches. It always returns `retirementAuthorized: false`.

## Retirement gate

For each reference app, an authorized adult must separately sign off on:

1. approved import scope and exclusions, with unresolved records reconciled or
   explicitly excluded;
2. source/target control-total report, sample authorization reads, timezone and
   money reconciliation where applicable, audit evidence, and rollback/recovery
   rehearsal;
3. continued access/export and support-owner plan for the legacy deployment;
4. explicit action-time authorization naming the deployment and the requested
   retirement action.

Only a documented, current approval can open a separate retirement change.
Until then every legacy repository and deployment remains read-only reference
material.

## Verification and non-goals

Unit tests cover exact match, count/checksum mismatch, missing type, duplicate
control rejection, and server-derived household scoping. Before a real
certification, each source needs an approved adapter/export, actual controlled
import, target queries under authorization, sampled domain validation, recovery
rehearsal, and named sign-off. This includes no source connector, database
query, real import, deployment, or retirement action.
