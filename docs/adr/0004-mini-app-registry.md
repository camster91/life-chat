# ADR 0004: Mini-app registry

- Status: accepted for the foundation
- Date: 2026-08-18
- Related: #5, #7–#11, #15–#32, #43

## Decision

Life Chat has a code-owned registry of first-party mini-app definitions and a separate household-owned configuration for enabled state/settings. A mini-app is a module in the canonical application, not a separate deployment, database, identity domain, or arbitrary plugin.

Each registry entry defines a stable app ID, version, display metadata, dependencies, declared domain capabilities, settings schema version, supported navigation surface, and lifecycle status. The registry is reviewed in source control. A household configuration only enables/disables a known entry and stores validated app settings; it cannot supply code, routes, permissions, or provider credentials.

## Lifecycle

| State | Behaviour |
| --- | --- |
| unavailable | Registry entry exists but is not eligible for a household because it is planned, retired, or a required dependency is unavailable. |
| disabled | The app is hidden from normal navigation and rejects new app actions for the household. Existing domain data is retained, auditable, and exportable according to policy. |
| enabled | A permitted member can navigate to/use the app subject to record-level authorization and the app's declared capabilities. |
| retiring | New enablement/actions stop on an explicit date; export, migration, and successor guidance must be supplied before removal. |

Disabling an app is never data deletion, nor does it erase audit events. Re-enabling may restore data access only if retention policy has not separately removed data. Today, Search, Notifications, and Chat must check enabled state before surfacing app-owned records or invoking app tools, except authorized audit/export/recovery paths.

## Rules

- Registry IDs are lowercase stable identifiers and never reuse a retired app's semantics.
- App dependencies must be enabled before activation; dependent apps do not silently enable their prerequisites.
- Every request to an app route/action/tool resolves active household context, app enabled state, declared capability, and target-record authorization server-side.
- App configuration, enablement, disablement, migration/retirement, and dependency failures emit audit events (#7).
- App settings are versioned/validated and do not contain secrets. Provider configuration belongs to the relevant shared adapter.
- First-party apps may publish domain events/deep links through shared contracts (#43), but cannot query another app's private tables directly.
- Third-party code execution, public marketplaces, and user-installed scripts are out of scope.

## Initial catalogue

`habits`, `chores`, `rewards`, `meals`, `groceries`, `shared-lists`, `projects`, `messages`, and `budget` are known first-party entries. Their domain implementations remain P1 work; registry presence does not claim that an app is built. `rewards` requires `chores`; other dependencies remain deliberately narrow until product data contracts are designed.

## Verification

Pure registry tests prove unique IDs, default-disabled configuration, dependency checks, and that a disabled/unknown app cannot be activated. Integration tests later must prove route/tool/search/notification enforcement and retention behavior with physical data.
