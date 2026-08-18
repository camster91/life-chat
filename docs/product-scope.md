# Life Chat product scope and feature matrix

Issue: #1

## Product definition

Life Chat is the canonical operating system for household and personal life. It combines a calm, conventional app experience with an optional conversational command interface. The canonical record lives in a shared product domain; a chat message, a mini-app screen, a notification, and search results all operate on that same record.

The first release is intentionally a foundation and shell, not a broad port of five existing apps. It must be useful with AI unavailable and must never require a user to converse with AI to complete an important task.

## Personas and permission baseline

| Persona | Core needs | Baseline authority |
| --- | --- | --- |
| Adult | Coordinate the household, manage settings, review consequential changes, and retain control over shared data. | Manage household, membership, app configuration, exports, and approvals, subject to household policy. |
| Child | See an age-appropriate view of assigned/shared information and complete allowed actions independently. | Read and act only on explicitly permitted records/capabilities; no implicit access to adult/private information. |
| Guest | Participate temporarily in a limited context such as an event, list, or message thread. | Explicitly granted, time-bounded access only; cannot discover unrelated household data. |

Roles are starting points, not blanket access rules. Server-side capabilities and record visibility decide each read and write.

## Delivery tiers

| Area | Foundation (P0) | First usable shell (P1) | Later / explicitly deferred |
| --- | --- | --- | --- |
| Today | Shared summary contract, date/timezone rules, permission model. | Calm overview, empty states, deep links, relevant summaries. | Predictive/ranking features and automated planning. |
| Chat | Provider abstraction, structured tools, proposed-action confirmation, audit trail. | Conversation UI, citations/deep links, reviewable proposals, error/no-AI states. | Autonomous background agents or unsupervised mutations. |
| Apps | Registry, enablement lifecycle, shared services, data retention/export rules. | Apps management and the first approved mini-apps. | Arbitrary third-party code execution or a public marketplace. |
| Calendar | Canonical time/recurrence/visibility policy. | Calendar shell and links to supported records. | External calendar sync until provider, conflict, and privacy decisions are approved. |
| Family | Identity/membership, roles, capabilities, audit events. | Family/member management and invitations. | Complex guardianship, custody, or legal-document workflows. |
| Search | Authorization-safe indexing contract. | Global search across enabled supported records. | Semantic search that sends household data to an external provider by default. |
| Notifications | Event model, preferences, delivery policy, deduplication. | Notification centre and in-app actionable notices. | Unbounded push/email/SMS integrations or critical-alert guarantees. |
| Settings | Privacy, retention, export/recovery, provider settings boundaries. | Household and member settings UI. | Billing/credit checkout until payments and compliance are designed. |

## Mini-app matrix

| Mini-app | Product outcome | First release boundary | Depends on |
| --- | --- | --- | --- |
| Habits | Encourage personal routines without punishing or exposing members. | Habits, completions, history, optional reminders. | Identity, permissions, dates, notifications. |
| Chores | Make household responsibilities visible and age-appropriate. | Assignments, recurrence, completion, auditability. | Identity, permissions, dates, notifications. |
| Rewards and allowance | Let households connect approved outcomes to balances transparently. | Ledger-like history and adult approval; no real-money movement. | Chores, permissions, audit. |
| Meals | Coordinate meal intentions for a household. | Meal plan entries and calendar/list handoffs. | Calendar, shared lists, permissions. |
| Groceries | Maintain a useful shared shopping list. | Household lists, completion, meal handoffs. | Shared lists, permissions. |
| Shared lists | Give households a canonical lightweight list primitive. | Lists, ordered items, assignment, visibility. | Permissions, offline/recovery strategy. |
| Projects | Track small household/personal projects without a full PM suite. | Projects, simple tasks/statuses, calendar links. | Shared lists, calendar. |
| Messages | Facilitate scoped family communication. | Threads, participants, read state, attachments subject to policy. | Permissions, notifications, attachment/privacy policy. |
| Budget | Provide an understandable view of household/personal planning. | Budgets, categories, integer-minor-unit entries, export. | Permissions, audit, recovery/export. |

## Non-goals for the first usable release

- Rebuilding or retiring any legacy application wholesale.
- A general-purpose autonomous AI agent, automatic sending, automatic purchasing, or unreviewed data mutation.
- A public mini-app marketplace, third-party mini-app code execution, or plugin sandbox.
- Financial-account connectivity, bank aggregation, payment movement, tax advice, or credit-card handling.
- Medical, legal, emergency-response, surveillance, or child-safety monitoring claims.
- Guaranteed offline synchronization, external calendar synchronization, email/SMS/push delivery, or multi-provider AI billing before their foundation work is complete.

## Product guardrails

- Every important action has a normal, accessible UI path.
- AI can propose; authorized people confirm before consequential effects.
- App disablement changes availability, not data existence. Retention/deletion is explicit and auditable.
- Private and sensitive data is minimized, access-controlled, exportable according to policy, and never used to train a provider by default.
- Each view is responsive and usable with keyboard and assistive technology from its first implementation.

## Success measures for the first usable release

- A household can invite/manage at least the intended role baselines and cannot read or write another household's data.
- An adult can enable an approved mini-app, complete a representative task through UI, and find it through Today/Search where applicable.
- A permitted member can ask Chat to draft a supported change, inspect the proposed action, and confirm or reject it without a silent mutation.
- Core shell and one mini-app remain useful when no AI provider is configured.
- Key flows are verified at narrow mobile width, keyboard-only navigation, and at least one screen-reader-oriented semantic review.

## Decisions intentionally pending

- Application stack, database/hosting topology, and repository package structure (#2).
- Identity provider, account recovery, invitation delivery, and membership verification details (#3).
- Capability taxonomy and exact child/guest defaults (#4).
- Local/offline implementation level, encryption model, retention periods, and export format (#8 and #12).
- AI provider defaults, BYO credential custody, usage-credit billing, and supported provider set (#10 and #11).
- The port/redesign/discard decision for every legacy capability after the read-only inventories (#33–#37).
