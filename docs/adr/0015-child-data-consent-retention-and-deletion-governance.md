# ADR 0015: Child data, consent, retention, and deletion governance

## Status

Accepted as a conservative product baseline; jurisdiction-specific legal review
and operational implementation are pre-launch requirements.

## Decision

### Child and household data

- Treat child/member profile data, household schedules, messages, attachments,
  rewards, and inferred activity as private household data. Collection is
  purpose-limited, minimal, and disabled where the product cannot explain a
  clear household benefit in age-appropriate language.
- Initial child use is through a household-local, adult-managed member profile.
  A child cannot create a household, invite others, enable a provider, export
  household data, or independently consent to a new disclosure. Adult status
  is a product permission, not proof of a legal guardian relationship.
- No behavioural advertising, sale, public profile, third-party data sharing,
  or AI training use is permitted for child/household content. A provider gets
  no child/household data by default; any future provider disclosure needs its
  own data-flow review, adult approval, clear purpose, consent/authorization
  determination, opt-out/withdrawal handling, and audit evidence.
- Product communication about a child must be short, understandable, and avoid
  dark patterns. Adults see the purpose, visibility, recipient, and retention
  effect before enabling a sensitive feature. Child-visible controls include a
  safe explanation and route to an appropriate household adult where relevant.

### Consent, access, and correction

- Store a versioned, auditable consent/authorization record only when a feature
  truly needs it: purpose, data categories, recipient, collection method,
  acting adult/member, time, withdrawal/revocation result, and policy version.
  It never stores a signature image, full legal document, or unnecessary proof
  of relationship.
- Consent/authorization is granular and withdrawable where technically and
  legally applicable. Withdrawal stops the related future collection/disclosure
  promptly; it does not silently erase records whose retention is required for
  a stated policy, audit, dispute, or legal hold.
- Access/correction requests are scoped, identity/relationship-reviewed, and
  redacted to avoid revealing another household member's private information.
  A request, decision, export, correction, and denial are auditable without
  copying the private content into audit metadata.

### Retention, deletion, and exports

- Every data category must have an owner, collection purpose, sensitivity,
  retention class, deletion method, backup/export treatment, and legal-hold
  behavior before persistence. A feature without this declaration cannot store
  new personal data.
- Default user-facing deletion is a request/confirmation workflow. It resolves
  record ownership, dependent records, active exports, audit evidence, backup
  lifecycle, retention class, and legal holds before marking content pending
  deletion, deleting/anonymizing it, or explaining why it is retained.
- Audit evidence is not silently edited. It receives a permitted lifecycle
  event that references the deleted/anonymized record without copying it.
  Backups and exports receive expiry and destruction/revocation treatment per
  their retention class.
- Importers classify each source field before mapping it, omit fields without a
  documented purpose, record consent/retention uncertainty, and never use a
  migration as a new consent grant. Old applications remain active until an
  approved parity and retirement decision.

## Legal-readiness boundary

This ADR is product policy, not legal advice or a statement that Life Chat
complies with a specific law. Before collecting real child data or serving a
new jurisdiction, an owner and qualified counsel/privacy review must determine
applicability, age/guardian requirements, valid consent method, retention
periods, data subject rights, breach/incident duties, transfer/provider terms,
and required notices. Canadian privacy guidance emphasizes meaningful consent,
purpose limitation, and retention only as long as necessary; those principles
informed this conservative design but do not replace that review.

## Verification and follow-up

The pure policy guard verifies that prohibited child-data purposes and missing
retention declaration fail closed. #50 must add environment retention and
backup disposal evidence; #33–#41 must add source-field classification; #20,
#23, and mini-app work must provide accessible consent, request, and deletion
UI with authorization/audit tests.

## Non-goals

- No legal-age threshold, guardian-verification system, consent form, deletion
  scheduler, data-protection officer, retention duration, or production data
  processing is implemented here.
- This does not authorize a deletion against an active environment or legacy
  application.
