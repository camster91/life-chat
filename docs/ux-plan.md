# Life Chat UX plan

## Aim

Create a calm operating surface for household life: people should be able to see what matters, take a normal UI action quickly, and use chat when it is more convenient—not because it is the only path. The experience should feel dependable for adults, understandable for children, and tightly bounded for guests.

This is a design and validation plan, not a claim that the screens, research, or prototypes have been completed.

## Experience principles

1. **Orient before acting.** Every surface answers: where am I, which household am I acting in, and what needs attention now?
2. **One clear next step.** Today and mini-app views lead with the most relevant task, not a dashboard of competing metrics.
3. **Chat proposes; people decide.** A proposed change is visually distinct from a completed change and always offers review, edit, confirm, or reject.
4. **Calm through restraint.** Prefer hierarchy, whitespace, and plain language over badges, alerts, and dense card grids.
5. **Household context is never implicit.** Shared versus personal, member visibility, and permission boundaries are clear before an action is taken.
6. **Age-appropriate without being patronizing.** Children receive simpler language, scoped choice, and visible progress; guests receive only their granted context.
7. **Normal UI is first-class.** Chat results always link to their source record and allow continued work in a conventional screen.

## Information architecture and navigation

Desktop uses a persistent sidebar. Mobile uses four primary destinations plus an accessible overflow sheet, keeping one-handed navigation practical without burying the shared shell.

| Navigation element | Desktop | Mobile | Purpose |
| --- | --- | --- | --- |
| Today | Sidebar | Primary tab | Calm starting point and agenda. |
| Chat | Sidebar | Primary tab | Ask, plan, and review proposed actions. |
| Calendar | Sidebar | Primary tab | Time-based household/personal coordination. |
| Apps | Sidebar | Primary tab | Enabled mini-apps and their entry points. |
| Search | Global control | Global control | Permission-filtered retrieval, not navigation replacement. |
| Notifications | Global control | Global control | Inbox and actionable reminders. |
| Family and Settings | Sidebar secondary | Overflow sheet | Membership, permissions, preferences, privacy, and configuration. |

The active household/member context is visible in the shell and selectable only when the user belongs to more than one household. Switching context requires a clear confirmation when unsaved work or a proposed AI action is in progress.

## Core journeys to design first

| Journey | User outcome | Required screens/states |
| --- | --- | --- |
| Adult onboarding | Create/join a household, establish basics, invite a member, and reach an uncluttered Today. | Welcome, identity, household setup, invite, app starter choices, success/empty Today. |
| Daily coordination | See the day's few meaningful items and complete, defer, or open each one. | Today default, quiet/empty day, overdue item, permission-limited summary, offline/stale state. |
| Chat to proposed action | Ask for a supported change; inspect exactly what will happen; edit, confirm, or reject it. | Chat, thinking/error/no-provider, proposal review, confirmation, success, conflict/re-authorization failure. |
| Child chore/habit | Understand an assignment, mark a permitted completion, and see an appropriate outcome. | Child Today, assignment detail, completion confirmation, locked/unavailable action, progress/history. |
| Adult review | Review a child's completion or a consequential action and approve, adjust, or decline it. | Review queue, detail, audit context, approval/rejection, resulting notification. |
| Guest participation | Open only a shared, time-bounded item and complete the explicitly permitted interaction. | Invite acceptance, scoped item, expired/revoked access, request-access explanation. |

## First screen inventory

### Shared shell

- Sign in, recovery, join/create household, and safe invitation acceptance.
- Today: calm default, no-content, attention-needed, and permission-limited variants.
- Chat: empty/helpful start, threaded conversation, streaming/working, no-provider, error/retry, and proposal review.
- Apps: enabled app list, app details, enable/disable confirmation, configuration, and unavailable-dependency state.
- Calendar: agenda first on mobile, week/month options where space permits, create/edit, conflict, recurrence, and timezone explanation.
- Family: member list, member detail, invitation, role/capability explanation, and restricted-action state.
- Search, notification centre, settings, and a reusable record detail pattern.

### First mini-app slices

Design Shared Lists and Chores first because they exercise canonical records, membership, permissions, dates, auditability, notifications, Today, Chat, and simple completion flows without requiring financial or external-provider complexity. Habits follows as the personal routine variant. Rewards, meals, groceries, projects, messages, and budget are designed only after their dependencies and legacy inventories clarify their boundaries.

## Interaction model

### Proposed-action pattern

1. Chat states the interpreted request in plain language.
2. It presents a compact proposal card: affected household, records, exact fields, schedule/timezone, permissions, and consequence level.
3. The user can open a full review, edit permitted fields, confirm, or reject. Consequential/reversible status is explicit.
4. Confirmation re-checks authorization and conflicts. The completed state links to the canonical UI and audit record where appropriate.
5. If it cannot act, Chat explains why and offers a normal UI path; it never pretends a change occurred.

### Destructive and sensitive actions

Use deliberate confirmation—not accidental double-clicking—for deletion, sharing, membership/role changes, data export, disabling apps with retention implications, financial effects, and externally delivered messages. Describe reversibility before confirmation. Never hide these controls in chat-only interactions.

## Visual direction exploration

No visual direction is locked. Before component implementation, create three original, low-content visual boards and test the strongest one against the core journeys:

| Direction | Character | Risk to test |
| --- | --- | --- |
| Conservative | Clean neutral surfaces, precise sans typography, restrained single accent, familiar forms and navigation. | May feel too generic or administrative. |
| Strong fit (recommended) | Warm off-white/ink palette, calm natural accent, generous but efficient spacing, clear text hierarchy, light tactile controls. | Must retain sufficient contrast and avoid becoming overly precious. |
| Divergent | Editorial “family notebook” posture with richer type hierarchy and more contextual chronology. | Could reduce scan speed or feel less useful for children. |

The recommended direction is the starting hypothesis, not a final brand. No invented logos, stock imagery, fake metrics, or decorative dashboards. Type, spacing, and clear status language do the work.

## Design-system plan

The provisional reusable contract is in
[design/design-system-foundations.md](design/design-system-foundations.md). It
supports implementation and testing without claiming that the strong-fit brand
direction has been selected before concept testing.

| Layer | Initial deliverables |
| --- | --- |
| Foundations | Colour roles with contrast checks, typography scale, spacing, breakpoints, elevation, radius, focus, motion, and content voice. |
| Primitives | Button, icon button, input, select, checkbox, segmented control, dialog, bottom sheet, toast, tabs, disclosure, and skeleton. |
| Product patterns | Shell, household switcher, record list/detail, status, empty state, permission explanation, notification, attachment, and proposed-action review. |
| Quality | Keyboard model, focus order, error copy, touch targets, reduced-motion rules, light/dark policy, and responsive behavior. |

## State and accessibility requirements

Every screen design includes default, loading, empty, error, success, no-permission, offline/stale, and narrow-mobile states where applicable. Components must support keyboard operation, visible focus, semantic labels, validation/error announcements, 44px minimum touch targets, reduced motion, and sufficient contrast. Proposed actions must be understandable without colour alone and remain reviewable with screen readers.

Validation uses 375px, 768px, and desktop views, keyboard-only walkthroughs, automated accessibility scans, and human semantic review. Browser emulation does not replace later physical-device or assistive-technology testing.

## Research and validation plan

1. **Workflow interviews:** 5–7 adults representing different household arrangements; map current coordination failures and privacy expectations. Do not collect unnecessary family data.
2. **Concept test:** Show the three visual/interaction directions with the Today, Chat proposal, and child-task scenarios; select one direction based on comprehension and perceived calm, not preference alone.
3. **Prototype usability:** Test the six core journeys with 5 participants in two rounds. Start with adults; any research involving children requires appropriate guardian consent and a separate protocol.
4. **Accessibility review:** keyboard and screen-reader-oriented review of the selected shell/proposal pattern before production implementation.
5. **Build validation:** test real implementation at specified breakpoints and record observed failures against acceptance criteria.

## Delivery sequence

1. Confirm stack and shared contracts (#2–#14) enough to make interaction constraints real.
2. Produce navigation map and low-fidelity flows for the six core journeys.
3. Explore the three visual directions and select one.
4. Build a clickable, accessible shell prototype covering Today, Chat proposal, Apps, Calendar, and Family.
5. Write the design-system spec and screen/state annotations.
6. Run concept/usability/accessibility reviews; revise before production shell work.
7. Implement the shell and Shared Lists/Chores vertical slices; verify against the plan.

## Decisions needed before high-fidelity work

- Brand posture: should Life Chat feel more domestic/warm or more neutral/productivity-oriented?
- Initial supported household model: one adult, co-adults, children, guests, and multi-household membership assumptions.
- Which first mini-app proves the product: Shared Lists + Chores (recommended) or Habits?
- Whether the initial UX supports light mode only, or light/dark from the first release.
- Whether product research can recruit existing adult users, and what consent/privacy process applies.
