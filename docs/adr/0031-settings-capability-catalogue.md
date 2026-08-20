# ADR 0031: Settings capability catalogue

## Status

Accepted for an authenticated, read-only settings route based on the capability
catalogue. It does not persist a profile, household policy, export, or AI
provider configuration. Notification preferences remain in their dedicated
normal UI.

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
audit write, or client-side authorization. The server derives the active
context before returning the catalogue, and the normal UI labels unavailable
controls instead of exposing dead actions. Tests cover adult/child/guest
catalogue boundaries. Profile/household commands, export/recovery, provider
configuration, and browser/screen-reader validation remain required before #23
can close.
