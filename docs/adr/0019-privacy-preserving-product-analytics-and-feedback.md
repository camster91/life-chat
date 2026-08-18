# ADR 0019: Privacy-preserving product analytics and feedback

## Status

Accepted as a default-off measurement contract; no analytics or feedback vendor
is configured.

## Decision

- Product analytics is optional, off by default, and cannot collect until an
  authorized adult has made an informed, versioned, revocable choice in normal
  settings UI. Child and guest members cannot enable household analytics. A
  consent change stops future collection promptly and is auditable without
  storing private content.
- The initial taxonomy is limited to coarse product-health events: feature
  availability, navigation surface, task success/failure category, performance
  bucket, accessibility preference support, and feedback submission state.
  Events contain an event name, schema version, UTC time, bounded enum/boolean
  properties, and a short-lived pseudonymous measurement subject only when
  needed to deduplicate/aggregate.
- Analytics never contains household/member IDs, display names, contact data,
  message/list/calendar/attachment content, titles, free text, prompts,
  locations, financial values, raw errors, IP addresses, device fingerprints,
  provider credentials, or record deep links. It is not used for advertising,
  sale, cross-context tracking, automated eligibility/discipline, or AI model
  training.
- Aggregate reports use minimum group-size thresholds, coarse date buckets, and
  access limited to named product/operations roles. No dashboard may expose a
  household-level timeline or identify a participant. Retention, processor,
  region, and access audit configuration require the selected provider and
  privacy review before activation.
- Qualitative feedback is a distinct, voluntary workflow. It shows a purpose
  and privacy notice, supports a no-contact option, limits attachments, and
  routes private content through the same household/attachment policies rather
  than analytics. Feedback triage redacts tickets and never grants staff a
  household-data bypass.
- Legacy analytics and tracking data are not imported. Any measurement change
  needs a new purpose/taxonomy review, consent impact assessment, retention
  declaration, and rollout flag/removal owner.

## Verification and follow-up

Pure validation proves default-off consent, safe property names/values, and
rejection of free text/private identifiers. #23 must implement accessible
settings/withdrawal UI, #49 supplies plain-language notices, and #50 selects
any processor, retention, region, access, aggregation, and deletion operations.

## Non-goals

- No SDK, cookie/banner, tracking script, user profiling, dashboard, survey,
  data warehouse, external transmission, or analytics collection is enabled.
