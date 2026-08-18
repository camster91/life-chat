# ADR 0012: Accessibility and responsive baseline

## Status

Accepted for all Life Chat interface work.

## Decision

- Design and verify to WCAG 2.1 AA as the initial conformance target. A feature
  is not complete because it merely renders; keyboard, semantic, assistive
  technology, contrast, zoom, and narrow-viewport behavior are acceptance
  criteria.
- Start with native HTML elements. Use a semantic landmark structure, one
  visible `h1`, ordered heading hierarchy, labelled inputs, buttons for actions,
  links for navigation, and real tables/lists where their relationships are
  tabular/list-like. ARIA augments a native pattern only when necessary.
- Every page provides a skip link and a visible, high-contrast focus indicator.
  Keyboard order follows visual order, overlays return focus to their trigger,
  dialogs trap focus only while open and can be dismissed, and no action relies
  on hover, drag, colour alone, or a timed gesture.
- Meet at least 4.5:1 contrast for normal text and 3:1 for meaningful visual
  controls/focus indicators. Error, success, selection, and permission states
  pair colour with text or an icon and accessible name.
- Respect `prefers-reduced-motion`; motion is decorative by default and never
  hides a status or blocks a task. Loading, live updates, and notifications use
  appropriately scoped status semantics without repeatedly interrupting a
  screen reader.
- Build mobile-first. Core flows work at a 320 CSS-pixel viewport, at 200% zoom,
  with reflow/no horizontal page scrolling, adequate touch target sizing, and
  without hover-only navigation. Desktop layout is progressive enhancement.
- Proposed-action review exposes changes in a readable structure, identifies
  irreversible effects before confirmation, and retains normal-UI alternatives.
  Permission denials explain the next safe step without exposing restricted
  information.

## Delivery and verification

Each interactive feature needs automated checks where practical plus manual
keyboard-only traversal, screen-reader semantic review, contrast verification,
reduced-motion check, and 320/768/1280 viewport review. Test actual role and
permission states—not just adult happy paths—so child/guest interfaces do not
expose inaccessible or misleading controls. Defects become linked issues with
the affected route, assistive scenario, expected result, and reproduction.

## Non-goals

- No certification, legal accessibility claim, or full assistive-device matrix
  is asserted by this ADR.
- No custom design system or screen implementation is completed here; #15 and
  #42 own the shell and first-user-flow implementation.
