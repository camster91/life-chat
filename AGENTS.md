# Life Chat agent guidance

## Scope and safety

- Treat Life Chat as a new canonical product. Old repositories are read-only references unless a task explicitly authorizes a separate change there.
- Do not deploy, delete data, archive repositories, merge pull requests, alter production settings, or run migrations against production without explicit action-time authorization.
- Never expose credentials, private household data, prompts, attachments, or AI-provider keys in source, logs, issues, or screenshots.

## Architecture rules

- Keep product modules behind the shared household/member authorization, audit, notification, search, attachment, timezone, and AI-action contracts.
- Enforce household scoping and permission checks server-side. Do not trust a client-provided household/member ID.
- Every meaningful AI mutation must use the proposed-action/confirmation flow, reauthorize at execution, be idempotent, and emit an audit event.
- Keep AI providers behind an abstraction. Core product workflows must work when AI is unavailable.
- Treat mini-app enablement as configuration, not deletion. Preserve export/recovery paths.

## Delivery rules

- Prefer small, reviewable changes and reusable accessible components. Design mobile-first; test keyboard, screen-reader semantics, contrast, reduced motion, and narrow viewports.
- Add or update tests for authorization, timezone/date behavior, destructive/reversible action boundaries, and migration/import paths when relevant.
- Before a PR, run the documented local checks and report what passed, what was not run, and any remaining decisions. Never describe planned work as implemented.
- Use conventional commits and link issues. Keep implementation decisions in docs or ADRs when they affect shared contracts.
