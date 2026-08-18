# ADR 0031: Settings capability catalogue

## Status

Accepted for a read-only settings navigation model. It does not persist a
profile, preference, household policy, export, or AI provider configuration.

## Decision

Settings use distinct server-checked permissions rather than treating read,
chat, or export capability as configuration authority: `household.manage`,
`privacy.manage`, `notification.manage-self`, and `ai.configure`. The catalogue
shows only sections for which the active household context is authorized.
Adults receive the baseline sensitive settings permissions; children can manage
their own profile/notification preferences only; guests are denied by default.

Every sensitive setting remains a separate normal-UI command with impact copy,
fresh authorization, validation, explicit confirmation where consequential,
atomic persistence, audit evidence, and (where relevant) outbox effects. AI
configuration never exposes provider secrets, and export creation remains
subject to its own confirmed/recovery-safe workflow.

## Non-goals and verification

This adds no form, setting store, secret store, export package, provider call,
audit write, or client-side authorization. Tests cover adult/child/guest
catalogue boundaries. Route UI, preference persistence, command integrations,
and browser/screen-reader validation remain required before #23 can close.
