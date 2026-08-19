# First shell prototype validation log

## Artifact and scope

The interactive prototype is [first-shell-prototype.html](first-shell-prototype.html).
It covers fabricated Today, Chat proposal/review, Apps, Calendar, Family, and
Settings states. It is a design artifact only: no sign-in, storage, provider,
or real data mutation exists.

## Direction hypothesis

The **strong-fit** direction is the working hypothesis: warm off-white surface,
dark ink, natural green accent, low visual density, text-first status language,
and modest corner radius. The conservative and notebook modes are included as
interactive comparison directions. Selection remains provisional until concept
testing; this log does not claim participants selected it.

## Heuristic/prototype review

| Requirement | Evidence | Status |
| --- | --- | --- |
| Today, Chat proposal, Apps, Calendar, Family reviewable | Prototype navigation and key states are present. | Ready for review |
| Normal UI beside chat | Proposal offers edit handoff and clearly says confirmation is not execution. | Ready for review |
| Desktop/tablet/mobile structure | Playwright checks 375×812, 768×1024, and 1280×800 with no horizontal overflow. Mobile has four primary destinations plus a labelled More dialog for Family and Settings. | Automated browser check passed |
| Keyboard and semantics | Browser checks prove skip-link focus, main-content focus after navigation, proposal status announcements, and mobile overflow access. Axe 4.13 reports no WCAG A/AA violations at all three viewports. | Automated checks passed; human review pending |
| Permission/timezone wording | Fabricated copy makes household context, adult confirmation, app enablement, and timezone visible. | Ready for content review |
| Three directions | Selector toggles conservative, strong-fit, and notebook variables. | Ready for concept test |

## Automated browser evidence — 2026-08-19

`pnpm test:e2e` ran six Chromium scenarios and passed after identifying and
correcting three prototype defects:

1. Family and Settings were hidden on mobile without an overflow control.
2. Hiding the visual-direction label removed the select's accessible name.
3. Mobile overflow selection emitted an empty `aria-current` value instead of
   `aria-current="page"`.

The passing suite covers three target viewports, horizontal overflow, axe WCAG
2.1 A/AA rules, all three visual-direction contrast hypotheses, keyboard skip
navigation, proposal/status behavior, and the mobile More dialog. The test is
part of the repository CI workflow, although hosted execution remains blocked
by the separately documented GitHub Actions account gate.

The provisional component, token, responsive, proposed-action, and content
contract is documented in [design-system-foundations.md](design-system-foundations.md).

## Required validation before #42 closes

1. Run concept testing with the planned adult participants and record
   comprehension/calm findings and selected direction rationale.
2. Test the six UX-plan journeys in a clickable/repo prototype, including
   no-provider, denied, expired, error, offline/stale, and child/guest states.
3. Complete a human semantic/screen-reader review at 375px, 768px, and desktop.
   Automated viewport, keyboard-path, and accessibility scans now pass, but do
   not substitute for that review.
4. Test any child research only under an approved guardian/consent protocol.
5. Convert findings to issues or update the prototype/design system; do not
   mark product implementation complete from this artifact.
