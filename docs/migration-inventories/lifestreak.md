# LifeStreak read-only inventory

## Snapshot and boundary

- Source: private `camster91/lifestreak`, default branch `main`, inspected
  read-only on 2026-08-18.
- The source README marks LifeStreak **archived** and says its personal
  spiritual-routine successor is JW Companion. It also states records remain
  on the device; this inventory did not access any device, export, account,
  deployment, or source data.

## Observed architecture and behavior

LifeStreak is a React/Vite PWA with Zustand persisted stores, Capacitor iOS and
Android wrappers, browser/native local notifications, PWA/offline assets, and
local backup validation. It has screens for personal routines, reading/study,
service, goals/projects, settings, stats, and share. Progress uses date/week
keys and client clock calculations; stores prune bounded local history. Settings
include notification schedules, theme, personal reading schedule, and optional
local AI configuration; the AI key is session-only and stripped from backups.

The source includes PWA/native build/release material, production smoke tooling,
and a private-app deployment history. Those implementation/operational details
are not carried forward to Life Chat.

## Port/redesign/discard matrix

| Source area | Observed concepts | Life Chat decision | Migration rule |
| --- | --- | --- | --- |
| Habit/progress mechanics | dated completion, status/progress, weekly routine, completion rate, streak calculation | Redesign selectively | Habits may use explicit routine/completion history and transparent progress, but Life Chat defines its own timezone, permissions, notification, audit, and streak semantics. |
| Reminders | local schedule preferences, permission request, cancellation/rescheduling | Redesign | Use Life Chat's recipient-specific notification envelope and household/member preferences. Do not import scheduled native notifications. |
| Local/offline behavior | persisted browser/native data, bounded pruning, offline assets | Reference only | Preserve the lesson that offline data needs bounds/recovery, but use Life Chat's server-canonical offline/recovery contract. |
| Backup/export | recognized store keys, bounded backup validation, secret stripping | Reference only | No routine import contract exists yet. Do not accept raw local-storage dumps as a Life Chat import without #38 schema/version/security rules. |
| Optional AI settings | provider/model settings and session-only API key | Discard | No provider key, endpoint, or session secret may be imported. Life Chat uses its provider-neutral credential boundary. |
| Spiritual/content-specific routines | reading/study/service/prayer/family-worship content and notes | Discard | Outside Life Chat's generic household-product scope and already directed to another canonical product by the source archive notice. |
| Goals/projects/memories/gamification | goals/projects, free-text memories, XP/badges/achievements | Redesign/defer | Projects may later have an independent Life Chat model; free text requires purpose/retention review. Do not port XP/badges/streak pressure by default. |
| Native/PWA/deployment/app-store assets | Capacitor, push/local notification config, PWA, Docker/CI/release assets | Reference only | Do not inherit identifiers, certificates, notification channels, deployment, app-store assets, or source operational controls. |

## Migration conclusion

There is **no approved LifeStreak-to-Life Chat data migration path**. The source
is a device-local, archived app whose published continuity route is a separate
personal product. Life Chat can reuse generic design lessons—clear completion
history, opt-in reminders, bounded offline data, safe backup validation, and
mobile accessibility—only after its own Habits contracts exist.

If a future user-requested import is considered, it must be opt-in and
device-local: identify an explicit compatible export, present field-by-field
mapping/exclusion, treat all free text as private, validate dates/timezones,
strip secrets, generate a dry-run report, and require #38–#41 evidence. It
must not read device storage, migrate spiritual content, or claim parity.
