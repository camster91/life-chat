# Content, localization, and communication standards

## Status

Draft for issue #49. It is aligned to the provisional #42 design direction and
must be revised after research and accessibility validation. It does not
authorize new data collection, child research, external message delivery, or
translation publication.

## Voice

Use plain, calm, concrete language. State what is known, what will happen, who
can act, and what to do next. Prefer “Review this change” to “Great news!” and
“You do not have access to this item” to vague failure language. Do not imply a
chat, provider, notification, or background task completed work that has not
been executed and verified.

## Required state copy

| State | Content requirement |
| --- | --- |
| Empty | Name the surface, explain that nothing needs attention, and offer one safe next step if authorized. |
| Loading | Say what is loading without exposing private record names. |
| Error | State that the change did not happen, preserve safe recovery options, and avoid raw provider/server errors. |
| No permission | Explain the action is unavailable in the current household/member context; do not reveal hidden records. |
| Offline/stale | Identify that information may be out of date and which actions require reconnection. |
| No AI/provider | Explain that normal UI remains available; never frame AI as required. |
| Proposal | Name the records/effects/permissions/reversibility, then offer review, edit, confirm, and reject where allowed. |
| Success | State the verified result and link to canonical normal UI; do not celebrate a mutation without evidence. |

## Roles and sensitive data

Adults receive precise policy, audit, export, and financial language. Children
receive shorter, age-appropriate instructions without behavior scoring or
pressure. Guests see only the granted task/context and a clear expiry/access
explanation. Copy, titles, snippets, notifications, and errors must not reveal
private member, message, attachment, financial, health, location, or hidden
record information.

## Localization readiness

Externalize user-facing strings, avoid concatenated sentence fragments, support
plural/select rules, and allow expansion without truncation. Use locale-aware
formatting for numbers/currency and the shared date/timezone contract for dates
and times. Keep canonical IDs, audit actions, and permission names separate from
translated display strings. Do not claim a locale is supported until it has
translated, cultural, assistive-technology, and layout review.

## Notification and message boundaries

External-channel payloads are generic and reauthorized at presentation/delivery.
They must not repeat private body text, financial descriptions, child details,
attachments, provider output, or secrets. Message content is never placed in
audit metadata, analytics, issue comments, screenshots, or generic errors.

## Validation

Before #49 closes, test this standard against the six UX-plan journeys at
375px, 768px, and desktop; keyboard and screen-reader review proposal/error/
permission states; and perform localization expansion checks. Record findings
from adult research and only perform child research under the approved guardian
and consent protocol.
