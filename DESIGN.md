---
version: alpha
colors:
  primary: "#00599c"
  canvas: "#f6f7f9"
  surface: "#ffffff"
  ink: "#15191f"
  muted: "#66717e"
  line: "#dfe3e8"
  primarySoft: "#e9f3fb"
typography:
  sans:
    fontFamily: '"IBM Plex Sans", "Noto Sans SC", Inter, system-ui, sans-serif'
    fontSize: 16px
    lineHeight: 1.7
  mono:
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'
rounded:
  DEFAULT: 12px
omitted:
  - section: spacing
    reason: Existing stylesheet owns context-specific layout spacing.
  - section: components
    reason: Component behavior is maintained in UX-CONTRACT.md; no parallel component token export.
---

# Professional C++ Learning · Design context

## Overview

A Chinese-first engineering reading console for developers with C / Embedded experience.
Preserve the existing white documentation surface, blue links and restrained code presentation.
The topic library behaves like a technical handbook: choose a domain, open a series, then read
one document with its chapter directory nearby. Avoid marketing heroes, decorative metrics,
and long titles compressed into horizontal pills.

## Colors

`src/styles.css :root` is the runtime token owner. The values above document its existing
palette; this file does not generate CSS. `src/docs.css` topic components consume `--blue`,
`--blue-soft`, `--surface`, `--ink`, `--muted`, `--line` and `--line-strong` directly.
Selected states use text and a border as well as color. Do not create a second topic palette.

## Typography

Shared fonts and `--mono` remain canonical. Chinese prose is at least 16px; topic reading uses
1.8 line height, 27px mobile article titles and 22px section headings. English identifiers and
long titles may wrap. Code retains the shared Markdown renderer and code block owner.

## Layout

Shared Shell owns desktop navigation and the mobile navigation drawer (760px breakpoint).
The topic catalog is at most 1100px, two columns on wide screens, one below 980px.
The article is at most 820px. At 1100px and above, a 220px sticky reading directory sits beside it; smaller screens use collapsible controls above the document. On phones the article uses the content column without nested card padding.
Only code, tables and bounded directories may scroll locally; the page must not scroll sideways.

## Elevation & Depth

Use borders and spacing for document structure. Static topic cards have no elevation.

## Shapes

Use existing `--radius` for topic cards; controls use 8px corners, not pill-shaped article titles.

## Components

`topics.ts` owns derived series classification; Markdown remains the content source.
`Topics.tsx` owns topic browsing and reading. Native selects use platform-owned popups;
native details/summary owns expandable directories. `Shell.tsx` remains the only global menu.
All navigation supports real URLs and modified-click opening in a new tab.

## Do's and Don'ts

- Keep domain filtering in URL state, separate from the document being read.
- Preserve deep links, browser history and relative Markdown navigation.
- Reading position is a convenience, not completion or mastery evidence.
- Keep full article names readable and controls at least 44px tall on phones.
- Honor reduced motion through the shared stylesheet; no new decorative animation.

## Cross-screen refinement · October 2026

Preserve the engineering handbook identity across the guide, course catalog, lesson,
topic reader, lab, review and search. `src/product-ui.css` is the shared structural
adapter loaded after the existing documentation styles; semantic palette values stay
in `src/styles.css`. It owns consistent page headings, native disclosures, course
rows, review cards and narrow-screen touch sizing. It must not define a second palette.

The guide exposes its next action on desktop and phone. The course catalog uses
full titles, URL-backed search/view state and expandable weeks, not a permanently
expanded list of clipped titles. Reading surfaces stay bounded; code workbenches
keep their existing full width. Mobile Compile Rail uses four columns over two rows,
preserving all eight stages and their labels.

Keep normal empty states neutral. Provide a route back into the task (review to
course, search to suggestions, lab to code). A claimed clipboard success requires
an actual successful write. Local reading and review records do not imply mastery.

RTOS remains a separate technical workbench with its own established palette in
`src/rtos-sim/rtos.css`. On small screens its complete playback/configuration controls
sit between the editor and trace, rather than hiding export or speed controls.
Native non-modal disclosures own its configuration popup; `keyboardTabs.ts` shares
arrow-key tab behavior between its detail panel and the memory output panel. The memory workbench retains its shared session and rendering model,
with larger mobile controls and consistent dark layout-switch buttons.
