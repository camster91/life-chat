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
| Desktop/tablet/mobile structure | CSS has desktop sidebar and 720px bottom navigation/mobile reflow. | Static code check only |
| Keyboard and semantics | Skip link, landmarks, buttons, tablist, focus style, `role=status`, and reduced-motion rule exist. | Needs browser/manual review |
| Permission/timezone wording | Fabricated copy makes household context, adult confirmation, app enablement, and timezone visible. | Ready for content review |
| Three directions | Selector toggles conservative, strong-fit, and notebook variables. | Ready for concept test |

## Required validation before #42 closes

1. Run concept testing with the planned adult participants and record
   comprehension/calm findings and selected direction rationale.
2. Test the six UX-plan journeys in a clickable/repo prototype, including
   no-provider, denied, expired, error, offline/stale, and child/guest states.
3. Perform keyboard-only traversal at 375px, 768px, and desktop; run an
   automated accessibility scan and a human semantic/screen-reader review.
4. Test any child research only under an approved guardian/consent protocol.
5. Convert findings to issues or update the prototype/design system; do not
   mark product implementation complete from this artifact.
