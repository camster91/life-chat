# ADR 0009: AI provider abstraction

## Status

Accepted for the foundation; no provider is integrated or configured.

## Context

Life Chat uses AI as an optional conversational interface and assistant, but
household data, core workflows, and product viability cannot depend on one
vendor, one model, paid credits, or AI availability.

## Decision

- Product modules call a provider-neutral AI orchestration contract. They do
  not import a vendor SDK or store a vendor-specific model identifier as domain
  state.
- The contract separates capability discovery, model selection, request
  execution, and structured tool results. Providers declare capabilities (for
  example, text generation or tool calling) and model descriptors; the
  orchestrator selects only an eligible configured provider.
- A provider receives a minimum, permission-filtered request. Conversation
  history, household records, attachments, and tool inputs are not implicitly
  sent. Prompt construction and disclosure policy are a future, reviewable
  layer.
- BYO credentials are represented only by an opaque credential reference.
  Provider API keys must live in a dedicated secret store, never in household
  records, audit/domain events, source code, browser state, or logs. The
  initial code intentionally has no credential storage or provider client.
- The service returns `unavailable` when no eligible provider is configured or
  when AI is disabled. Non-AI UI and canonical CRUD, search, navigation, and
  exports remain available. Product modules must offer a normal UI path rather
  than treating AI as required.
- Usage/cost records use provider/model references, opaque request IDs, units,
  currency minor units, and outcome. They do not contain prompts, completions,
  provider responses, keys, or raw provider logs. Credit billing and payments
  are deferred.
- Provider failures, rate limits, and safety denials surface a user-safe
  outcome and emit redacted audit evidence. The provider boundary does not
  authorize or execute a mutation; that belongs to the proposed-action flow.

## Consequences

The initial registry can be tested without credentials or network calls, and a
new provider requires an adapter instead of product-module changes. Future
work must provide secret management, a provider adapter, privacy disclosure,
usage persistence, rate limits, retention policy, and independent security
review before enabling AI for a household.

## Non-goals

- No AI provider, model, credential, credit balance, payment, or background
  usage worker is provisioned.
- No prompt retention policy, retrieval pipeline, automatic fallback across
  providers, or model quality claim is made.
- This ADR does not permit an AI mutation; #11 defines proposals and approval.
