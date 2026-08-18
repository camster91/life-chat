# Product architecture

## Product shell

The initial shell is mobile-first and accessible. It exposes Today, Chat, Apps, Calendar, Family, Search, Notifications, and Settings. Each surface reads from shared household-scoped services and must remain useful without chat.

| Surface | Responsibility |
| --- | --- |
| Today | Calm, actionable overview of the member's day, household activity, and relevant mini-app summaries. |
| Chat | Natural-language command and help interface; renders evidence, proposed actions, and links to normal UI. |
| Apps | Registry-driven discovery, enablement, configuration, and permission-aware entry points for mini-apps. |
| Calendar | Unified household/personal calendar, availability, reminders, and links to originating records. |
| Family | Household membership, roles, invitations, permissions, and member preferences. |
| Search | Permission-filtered search across shared records, conversations, and attachments. |
| Notifications | Inbox, delivery preferences, read state, and actionable reminders. |
| Settings | Household, member, privacy, data portability, integrations, and AI-provider settings. |

## Mini-app architecture

Mini-apps are independently enabled product modules, not independent silos. A registry describes each app's identifier, version, navigation entry, capabilities, settings schema, data ownership, dependencies, and supported roles. A household configuration enables an app and stores household-scoped settings; a member may have an additional visibility/preference setting where permitted.

Apps consume common services for identity, authorization, dates/timezones, audit events, attachments, notifications, search indexing, and AI actions. They may own domain records but must expose stable domain events and deep links. Disabling an app hides it and stops new actions without deleting its data; retention and export behavior must be explicit.

## Household and member permissions

Every request is scoped to an authenticated member and active household. Authorization is evaluated server-side from a role plus narrowly granted capabilities; clients never supply trusted household identifiers. Adult, child, and guest roles are baseline personas, while capability grants handle exceptions. Records default to household visibility only when appropriate and otherwise carry an owner/visibility policy. Cross-household access is denied by design and must be tested.

## AI provider abstraction

AI features call a provider-neutral orchestration layer rather than a vendor SDK from product modules. The layer supports model/provider selection, BYO credentials stored separately from product data, capability discovery, cost/credit metering, structured tool contracts, rate limits, safety policy, and traceable results. Providers are interchangeable; core CRUD, search, and navigation remain fully functional without an AI provider.

## Proposed-action and confirmation model

AI may read only the data the acting member is allowed to read. Before creating, changing, deleting, sending, sharing, charging, or otherwise materially affecting data, it returns a structured proposed action containing intent, affected records, field changes, permission context, validation results, and reversible/irreversible status. The normal UI displays the proposal; a permitted human explicitly confirms, edits, or rejects it. The server re-authorizes and validates at confirmation time, executes idempotently, and writes an audit event. Low-risk actions must still have explicit policy rules; never infer broad approval from conversational intent.

## Cross-cutting rules

Use canonical timestamps with a household timezone policy and preserve original timezone/offset for calendar semantics. Notifications and search are event-driven and permission-filtered. Attachments use authorization-checked references rather than public URLs. Audit events record actor, action, target, correlation, outcome, and redacted metadata. Offline behavior, recovery, exports, and retention are foundation decisions rather than per-app afterthoughts.
