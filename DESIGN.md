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
    fontFamily: '"IBM Plex Sans", "Noto Sans CJK SC", "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: 16px
    lineHeight: 1.75
  mono:
    fontFamily: '"IBM Plex Mono", "Noto Sans Mono CJK SC", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 48px
rounded:
  DEFAULT: 12px
omitted:
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
1.8 line height, 28px mobile article titles and 22px section headings. English identifiers and
long titles may wrap. Code retains the shared Markdown renderer and code block owner.

## Layout

Shared Shell owns desktop navigation and the mobile navigation drawer (760px breakpoint).
The topic catalog is at most 1120px, two columns on wide screens, one below 980px.
The article is at most 760px. At 1100px and above, a 220px sticky reading directory sits beside it; smaller screens use collapsible controls above the document. On phones the article uses the content column without nested card padding.
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
Repository publication is content availability, never learner completion. Progress
bars and completion marks reflect recorded learning stages only; route changes move
focus to the new main region while browser Back/Forward keeps its native behavior.

RTOS remains a separate technical workbench with its own established palette in
`src/rtos-sim/rtos.css`. On small screens its complete playback/configuration controls
sit between the editor and trace, rather than hiding export or speed controls.
Native non-modal disclosures own its configuration popup; `keyboardTabs.ts` shares
arrow-key tab behavior between its detail panel and the memory output panel. The memory workbench retains its shared session and rendering model,
with larger mobile controls and consistent dark layout-switch buttons.

## Task-first refinement · 20 October 2026

Keep the existing palette and typography. The signature of the engineering workspaces
is the relationship between source line, current event and object/task state. One shared
compile/playback toolbar lives outside source/output visibility so phone users can
operate a trace while inspecting it. Run actions use brand emphasis; red remains an
error/danger cue. Lab secondary actions share the task disclosure; code should enter
the first phone viewport. Course themes derive from chapter metadata and topic summaries
remain content-owned. Review tasks precede historical summaries. A browser's last-read
course is navigation convenience, explicitly separate from completion or mastery.

## Impeccable refinement · 27 October 2026

The user approved project-local OpenCode and Codex skill integration, whole-site refinement,
and preserving the light engineering-handbook identity. PRODUCT.md owns durable product facts.
Read mode applies to guides, courses, articles, topics and review; Operate mode applies to slide
controls, search, code and RTOS. The independent Slidev canvas and source decks retain their
blueprint identity. No new marketing world, imagery or decorative motion is introduced.

`src/styles.css :root` owns the runtime palette, sans/mono stacks, geometry and scrollbar tokens.
`--space-1/2/3/4/6/8/12` map respectively to the spacing values above. `--font-h1` is 32px on
desktop and 28px below 760px; `--reading-max` is 760px; `--content-max` is 1120px. The site
sidebar is 220px and header 56px. `--radius-control` is 8px, `--control-height` 36px and
`--touch-target` 44px. RTOS imports the shared baseline and maps only its established semantic
palette. These are handwritten canonical CSS values, not a generated theme export.

Page titles speak directly; remove decorative labels above headings. Retain factual course
status, phase labels, source/evidence indicators and native form labels. Homepage pathways are
compact two-column link rows on desktop and a single column on phones. Use borders or whitespace
for grouping; omit colored side stripes, nested decorative cards and ambient glows. Technical
numbers and code may use mono; ordinary UI labels use the sans stack.

Shell navigation, shared page headings and controls use one scale. `common/Icon.tsx` owns the
shared SVG vocabulary for navigation and slide actions, with decorative SVGs hidden from
assistive technology. Native selects remain native. Mobile slide selection is full-width and
its four view tabs form two columns; selected lesson labels do not repeat the full deck title.
The lab task disclosure starts collapsed for a new lesson so code is reachable without reading
an expanded task panel first. All instructions, hints and reset actions remain accessible.

Impeccable is pinned to 4.8.0; see docs/design/impeccable.md. Detection is manual, hooks and
telemetry are disabled. Preserve the existing loading component contract rather than adopting
a conflicting generic skeleton recommendation. Detector findings require visual and behavioral
verification; technical charts, editor internals and document-source content are not marketing.
