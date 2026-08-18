# ADR 0017: Feature flags, beta controls, and staged rollout

## Status

Accepted as a product-control contract; no remote flag service or rollout is
configured.

## Decision

- Feature definitions are code-owned, versioned, reviewed, and default to
  disabled. A flag describes one narrowly scoped capability, owning app/service,
  risk level, and expiry/removal issue. It cannot inject code, grant a
  permission, override a record visibility rule, bypass confirmation/audit, or
  change retention/consent policy.
- Runtime configuration is household-scoped and server-evaluated from the
  active household context. It supports disabled, opt-in beta, generally
  enabled, and killed states. A kill state always wins over beta/general
  enablement; a disabled mini-app, missing dependency, or failed authorization
  still denies the underlying operation.
- Only an authorized adult using normal configuration UI may enroll a household
  in a beta or change its flag configuration. The action states purpose, known
  limitations, data/provider impact, reversibility, and feedback path; it emits
  audit evidence. Child/guest members do not independently enroll a household.
- Beta eligibility is an explicit household allow-list, never hidden profiling,
  experimentation on child behavior, or a client-controlled percentage. A
  beta has owner, start/expiry/review date, support path, success/stop criteria,
  and opt-out. Configuration and feedback contain no household content in
  operational telemetry.
- Rollout proceeds through: local synthetic verification; reviewed code and
  CI; named internal/non-production environment validation; explicit household
  opt-in beta; limited expansion only after recorded evidence; and normal
  availability. Any material incident, security/privacy concern, failed metric,
  or rollback signal pauses expansion. A kill switch suppresses future entry
  points/actions but preserves records and audit/export/recovery access.
- Legacy migration/replacement stays opt-in and reversible. A flag cannot
  retire a legacy deployment, migrate user data, or delete/transform canonical
  records without a separately authorized migration/retirement decision.

## Verification and follow-up

Pure tests verify disabled-by-default, household scoping, explicit beta allow
lists, and kill-switch precedence. #14 needs a successful live CI run; #50 must
select runtime configuration storage/ownership, non-production environments,
and rollback operations. #47 owns privacy-preserving feedback/metrics. Feature
implementation issues must define their own flag removal date and acceptance
evidence.

## Non-goals

- No experiment platform, percentage rollout, remote configuration provider,
  automatic production rollback, beta household, data collection, or deployment
  is created.
- A feature flag does not replace mini-app enablement, server authorization,
  consent, proposed-action approval, or migration governance.
