# Initial shared data model

All entities have opaque IDs, `created_at`, `updated_at`, household scope where applicable, and audit correlation IDs. Exact storage design is intentionally deferred.

| Entity | Core fields and relationships |
| --- | --- |
| household | Name, IANA timezone policy, locale, status, privacy/data-retention settings; owns household-scoped records. |
| authenticated subject | Provider-agnostic opaque account identity; has no household role itself and may link to multiple household-local members. |
| member | Household-local profile linked optionally to one authenticated subject; baseline persona, display profile, lifecycle, expiry, timezone/preferences. A person in several households has separate member records. |
| role | Named baseline persona (`adult`, `child`, `guest`) plus capability set and policy version. |
| mini-app configuration | Household, app identifier/version, enabled state, settings, rollout state, and per-member visibility overrides. |
| task/action | App-owned or shared actionable item; owner/assignees, status, due/schedule, visibility, source, and completion/audit links. |
| calendar item | All-day date range or local timed range plus IANA timezone and derived instant, participants, recurrence, visibility, reminders, source link, and conflict state. |
| list/list item | A named permission-scoped collection and ordered items with status, assignee/owner, attributes, and source references. |
| message/thread | Thread participants, visibility, message body/version, delivery/read state, attachments, and moderation/deletion policy. |
| notification | Recipient-specific template and safe canonical-record references, source event, exact delivery instant, lifecycle state, deduplication key, in-app/deferred adapter status, and optional action/deep link; never a copy of private source content. |
| attachment | Owner/scope, storage reference, content metadata, integrity status, access policy, retention policy, and virus/processing state. |
| audit event | Append-only actor/household/action/target/outcome evidence with correlation/causation IDs, exact timestamp, and bounded redacted metadata; never a data-content replica. |
| AI conversation/action | Conversation messages and model context references; each consequential action links to an immutable, expiring proposal (operation, affected-record references, bounded field-change summary, validation, reversibility, idempotency key), explicit confirmation, fresh authorization result, executor result, provider/model references, bounded usage/cost metadata, and audit event. Credentials, keys, raw prompts/completions, and provider logs are separate from this shared entity. |

## Invariants

- Household-scoped queries require server-derived household context.
- An active context is derived from an authenticated subject's active, non-expired member record; a client-provided household ID is never trusted.
- Role/capability checks occur for reads and writes; child and guest defaults are deny-by-default.
- Money uses integer minor units plus ISO currency. Date-only, wall-clock, and exact-instant values remain distinct; times retain IANA timezone semantics.
- Deletion, export, retention, and migration mapping require auditability and explicit policy.
- Search indexes and notifications reference canonical records; they never become the source of truth.
- Notifications are server-selected and permission-filtered per recipient. The in-app notification centre is canonical; future external-channel payloads remain generic and are reauthorized at presentation/delivery.
- Audit events and domain events are separate append-only envelopes: audit is evidence, while domain events are idempotent canonical-record references for internal consumers.
- Export packages carry a versioned manifest with opaque IDs, record/attachment references, and checksums; they omit secrets, sessions, provider keys, and raw operational logs.
- A canonical record has one owning service. Cross-app work uses versioned service contracts, safe references/events, and re-authorized retrieval; mini-apps do not directly read or mutate one another's storage.
