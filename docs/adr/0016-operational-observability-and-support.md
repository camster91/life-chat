# ADR 0016: Operational observability and support model

## Status

Accepted as an implementation and release requirement; no monitoring vendor or
operational environment is configured.

## Decision

### Signals and boundaries

- Health answers only whether the process can serve a basic request. Readiness
  additionally checks required dependencies/configuration for that environment.
  Neither endpoint returns household data, secrets, provider configuration,
  database errors, or stack traces.
- Operational logs are structured, timestamped, bounded records with severity,
  event code, component, outcome, correlation/trace references, and safe opaque
  IDs where needed. They are separate from append-only product audit evidence.
  Logging follows the existing fail-closed redaction boundary: never log prompts,
  messages, attachments, sessions, tokens, credentials, raw request/response
  bodies, personal contact data, or connection strings.
- Metrics are aggregated counts, rates, durations, queue depth, saturation, and
  dependency availability. They have no household/member labels, record titles,
  raw error payloads, or high-cardinality private identifiers. Future tracing
  links a correlation/trace ID across components but is sampled/redacted under
  the same data policy.
- Security and product audit evidence retains its distinct audience and
  immutability requirements. Support/operations staff receive least-privilege,
  read-only tools with access itself logged; they do not impersonate members or
  bypass household authorization as an ordinary support workflow.

### Service objectives, alerting, and triage

- Before a release, the owning environment defines measurable availability,
  latency, error-rate, queue/backlog, backup, restore, and notification-delivery
  objectives. This ADR intentionally sets no unverified SLO/RPO/RTO values.
- Alerts are actionable and routed to a named on-call/owner: sustained
  unready/dependency failure, elevated failures, exhausted resources, failed
  backups/restores, audit/event outbox backlog, security-relevant authorization
  anomalies, and failed migration/reconciliation. Alert payloads contain safe
  identifiers and a runbook link, not household content.
- Triage begins with impact, time window, affected component/version, safe
  correlation IDs, and known recent change. It preserves evidence, avoids
  copying household data into tickets, and declares an incident owner. A support
  request involving access, exports, deletion, child data, payment, provider,
  or suspected disclosure follows its specialized policy and audit path.

### Recovery and learning

- Every release has a versioned operational runbook: health/readiness checks,
  dependency checks, safe log/metric lookup, rollback, backup/restore evidence,
  and escalation contacts. Recovery claims require a rehearsal in the target
  environment, not a local build.
- An incident records timeline, impact, decision maker, containment, customer
  communication approval, recovery evidence, and follow-up actions. It does not
  auto-contact households, change production, or disclose details without
  action-time authority.

## Verification and follow-up

The foundation tests safe structured operational events. #50 must select
environments, readiness dependencies, alert destinations, retention, runbook
owners, backup/restore rehearsal, and incident contacts. #14's successful CI
evidence remains separately blocked by the GitHub account state.

## Non-goals

- No uptime/SLO claim, monitoring vendor, pager, log sink, support desk,
  production health check, or incident declaration is created.
- No diagnostic action may extract private household data, alter production, or
  override authorization.
