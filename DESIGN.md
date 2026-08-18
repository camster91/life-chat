---
version: alpha
name: Life Chat provisional strong-fit direction
description: Calm household coordination with clear context, modest emphasis, and accessible restraint. Provisional pending issue 42 validation.
colors:
  paper: "#FBFAF6"
  surface: "#FFFFFF"
  ink: "#18221D"
  muted: "#59665E"
  line: "#D7DDD8"
  accent: "#176B4D"
  accentInk: "#FFFFFF"
  danger: "#9B3B22"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  sm: 8px
  md: 12px
  lg: 16px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accentInk}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
---

## Overview

This is a provisional token draft based on the recommended “strong fit” prototype direction. It is not a final brand decision and must not be treated as issue #42 validation evidence. The product should feel calm and trustworthy, never gamified, dense, or chat-only.

## Colors

Warm paper and white surfaces establish low visual noise. Ink is the default text color. Green is reserved for a primary intentional action or confirmed positive state; danger is for a genuinely destructive or sensitive boundary. Do not depend on color alone for status, permission, or proposed-action meaning.

## Typography

Use system sans typography until a licensed, tested type choice is approved. Display text is short and contextual; body text is plain-language and scannable. Do not use all-caps status labels or decorative type to compensate for unclear hierarchy.

## Layout

Use a small spacing scale, a calm single-column mobile reading order, and 44px minimum interactive targets. At narrow widths, keep Today, Chat, Calendar, and Apps primary; use an accessible overflow pattern for secondary destinations. Household context remains visible before consequential actions.

## Elevation & Depth

Use borders and modest elevation only to group related information. Avoid layered card grids, dashboards full of competing metrics, and celebratory visual effects as a proxy for meaningful progress.

## Shapes

Use modest radius. Proposed-action review has a clear boundary and structured field summary; it must remain understandable in monochrome and to screen-reader users.

## Components

Primary actions require unambiguous verbs. Secondary actions remain visible beside chat proposals, including “Open in normal UI”, “Edit”, and “Reject” where relevant. Sensitive actions use deliberate confirmation and state reversibility in text.

## Do's and Don'ts

- Do identify the household/member context and relevant permissions before a change.
- Do show empty, offline/stale, error, no-provider, and no-permission states in plain language.
- Do offer normal UI handoffs for every important chat result.
- Do not use badges, streak pressure, fake progress, or dense analytics as default motivation.
- Do not expose child/private information through labels, notifications, previews, or search snippets.
- Do not lock this draft or export production tokens until #42 records validation findings.
