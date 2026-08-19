# Life Chat design-system foundations

## Status and decision boundary

This is the provisional implementation contract for the first shell. It uses the
warm **strong-fit** direction as a working hypothesis because it best expresses
the documented calm, domestic operating-surface intent. It is not a selected
brand direction until concept testing is recorded against issue #42. The
conservative and notebook prototypes remain comparison inputs.

No component may treat a visual token, hidden control, or client state as an
authorization boundary. Household scope and permissions remain server-derived.

## Foundations

| Role | Provisional token | Usage rule |
| --- | --- | --- |
| Paper | `#fbfaf6` | Quiet application background. |
| Surface | `#ffffff` | Forms, panels, sheets, and records. |
| Ink | `#18221d` | Primary text and high-contrast controls. |
| Muted ink | `#59665e` | Supporting copy only; never placeholder-only instructions. |
| Accent | `#176b4d` | Primary actions, links, and selected state with text/icon reinforcement. |
| Accent soft | `#e7f1ea` | Non-critical selected/background state; never the only state indicator. |
| Destructive | `#9b3b22` | Sensitive or destructive choices with explicit text. |
| Focus | `#d18219` | Three-pixel visible outline with a three-pixel offset. |

- Use system sans typography initially. Heading levels preserve document order;
  visual size never substitutes for semantics.
- Use a four-pixel spacing base with restrained `8/12/16/24/32/48` steps.
- Default radius is 8–16px by component scale. Shadows are supplementary, not
  required to perceive a boundary.
- Minimum interactive target is 44 by 44 CSS pixels. Compact actions may look
  smaller only when their actual target retains this minimum.
- Motion is optional and must respect `prefers-reduced-motion`. No workflow may
  depend on animation.
- Initial release is light-mode only. Dark mode needs its own contrast and
  browser evidence rather than automatic token inversion.

## Responsive shell contract

| Width | Shell behavior |
| --- | --- |
| 320–720px | Bottom navigation exposes Today, Chat, Apps, Calendar, and a labelled More dialog for Family and Settings. Content is a single column; no horizontal scrolling. |
| 721–1023px | Persistent compact sidebar; content stays within readable measure. |
| 1024px and wider | Persistent sidebar and bounded workspace; additional space improves measure and grouping rather than adding dashboard density. |

Opening the mobile More dialog moves focus inside it. Escape and Close dismiss
it, focus returns to the invoking control, and selecting a destination closes it
before moving focus to main content. The More control exposes the active state
when its Family or Settings child is current.

## Primitive requirements

- **Button and link:** use the correct native element; visible focus; disabled
  and busy states are announced and cannot be the only error explanation.
- **Field:** persistent programmatic label, hint and error association, bounded
  input, and a live or alert error summary after submission.
- **Checkbox/switch:** label the resulting state and consequence. App disablement
  is configuration, never deletion.
- **Dialog/bottom sheet:** labelled native dialog semantics, contained keyboard
  focus, Escape/Close behavior, and focus restoration.
- **Tabs:** `tablist`, `tab`, `tabpanel`, selection state, arrow-key behavior,
  and stable focus. Use navigation links instead when each destination is a URL.
- **Status/alert:** `status` for non-urgent outcomes and `alert` for failed or
  blocked actions. Important meaning must be present in text, not color alone.
- **Skeleton/loading:** preserve the future region label, announce long waits,
  and offer a safe retry without implying an action completed.

## Product patterns

- **Household context:** show household and acting member before shared actions.
  Multiple memberships require an explicit server-revalidated selection.
- **Record list/detail:** normal UI remains complete without Chat. Empty, loading,
  denied, stale/offline, error, and success states use the same record language.
- **Proposed action:** label it as proposed; show affected household, records,
  exact changes, consequence/reversibility, and permission context; provide
  Review/Edit/Confirm/Reject; reauthorize and version-check only at execution.
- **Permission explanation:** state what is available and who can perform the
  blocked action without revealing another member's private data.
- **Destructive/sensitive action:** separate proposal from execution, name
  reversibility and retained data, and never make the default focus destructive.

## Content and localization readiness

Use short concrete labels, sentence-case outcomes, and neutral household terms.
Do not encode names, dates, roles, or plural rules into concatenated UI strings.
Dates always include the governing timezone when ambiguity could change an
action. Child-facing language is simpler but not patronizing; guest copy explains
expiry and scope without exposing broader household structure.

Detailed content standards remain issue #49 work after concept findings are
available.

## Verification contract

Every reusable shell/pattern change requires:

1. keyboard traversal and focus restoration checks;
2. automated WCAG A/AA checks at 375px, 768px, and 1280px;
3. no horizontal overflow at 320px or wider;
4. reduced-motion behavior;
5. human semantic and screen-reader review before issue closure;
6. role/household authorization tests when data or actions are involved.

Playwright/axe automation covers the prototype baseline, but it cannot select a
visual direction, assess comprehension, or replace usability and assistive-
technology sessions.
