# Initial shared data model

All entities have opaque IDs, `created_at`, `updated_at`, household scope where applicable, and audit correlation IDs. Exact storage design is intentionally deferred.

| Entity | Core fields and relationships |
| --- | --- |
| household | Name, timezone policy, locale, status, privacy/data-retention settings; owns household-scoped records. |
| member | Household membership, identity reference, display profile, lifecycle status, timezone/preferences; may belong to multiple households through separate memberships. |
| role | Named baseline persona (`adult`, `child`, `guest`) plus capability set and policy version. |
| mini-app configuration | Household, app identifier/version, enabled state, settings, rollout state, and per-member visibility overrides. |
| task/action | App-owned or shared actionable item; owner/assignees, status, due/schedule, visibility, source, and completion/audit links. |
| calendar item | Time range, timezone/original offset, participants, recurrence, visibility, reminders, source link, and conflict state. |
| list/list item | A named permission-scoped collection and ordered items with status, assignee/owner, attributes, and source references. |
| message/thread | Thread participants, visibility, message body/version, delivery/read state, attachments, and moderation/deletion policy. |
| notification | Recipient, type, payload reference, delivery channels, scheduling, state, deduplication key, and action/deep link. |
| attachment | Owner/scope, storage reference, content metadata, integrity status, access policy, retention policy, and virus/processing state. |
| audit event | Actor, household, action, target/type, before/after summaries, outcome, correlation ID, timestamp, and redacted metadata. |
| AI conversation/action | Conversation messages and model context references; each action links to its proposal, confirmation, executor, provider/model metadata, cost/credit metadata, result, and audit event. |

## Invariants

- Household-scoped queries require server-derived household context.
- Role/capability checks occur for reads and writes; child and guest defaults are deny-by-default.
- Money uses integer minor units plus ISO currency. Times retain instant and relevant timezone semantics.
- Deletion, export, retention, and migration mapping require auditability and explicit policy.
- Search indexes and notifications reference canonical records; they never become the source of truth.
