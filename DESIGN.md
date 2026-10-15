# Professional C++ Learning Console · Design

## Product model

The repository is not a dashboard with duplicated course data.

```text
Professional C++ book
        ↓
Markdown daily learning unit
        ↓
Concept → Guideline → Refactor → Lab → Quiz
        ↓
Weekly review / project
        ↓
Embedded C++ engineering skill evidence
```

Markdown remains the canonical course source. The Web UI is a learning-state and navigation layer.

## Architecture

```text
daily/*.md ──────────────┐
examples/day-*/main.cpp ─┼─→ Vite raw imports
progress.md ─────────────┤
guidelines/*.md ─────────┤
docs/learning-plan.md ───┘
                         ↓
                   Course Index
                         ↓
     Today / Roadmap / Lesson / Lab / Review
                         ↓
                 localStorage progress
```

## Stack

- React 19
- TypeScript
- Vite
- react-markdown + GFM + lazy-loaded Mermaid
- no backend required for phase 1
- local progress stored in browser localStorage

## Content compatibility

The parser supports two modes:

1. legacy Day 1–32 Markdown without YAML frontmatter;
2. new lessons with the frontmatter contract in `UX-CONTRACT.md`.

Legacy content is never required to be rewritten merely to support the UI.

## Visual system

Direction: **Engineering Notebook × Compiler**.

Primary tokens:

- Canvas: `#F6F7F9`
- Ink: `#15191F`
- C++ Blue: `#00599C`
- Compile Green: `#18794E`
- Warning Amber: `#B35C00`
- Code Surface: `#10151C`

The strongest visual element is Compile Rail. Code is treated as primary content, not decoration.

## Phase 1 scope

Implemented:

- Today
- Compile Rail
- Lesson reader
- Roadmap
- Lessons index
- Lab split mode
- Weekly Review
- Guidelines
- Progress / skill evidence
- responsive mobile shell
- categorized bilingual topic library
- source search with line-level preview
- build CI

Deferred:

- authenticated cloud sync
- answer grading
- server-side analytics

## Diagram and topic reading

Shared Markdown rendering lives in `src/components/Markdown.tsx`; diagrams use `MermaidDiagram.tsx`. The reading frame uses the existing `--surface`, `--line`, `--radius`, `--blue` and `--amber` tokens from `src/styles.css`; SVG content uses Mermaid's neutral theme with the existing font stack. Diagrams retain source access, keyboard-scrollable overflow, and readable failure feedback. Topic navigation uses the existing button style and reads repository Markdown, without duplicating topic content.

## Workspace and source explorer

The existing Engineering Notebook × Compiler identity is preserved. `src/styles.css` owns runtime tokens: Canvas → `--canvas`, Ink → `--ink`, C++ Blue → `--blue`, Compile Green → `--green`, Warning Amber → `--amber`, Code Surface → `--code`. IBM Plex Sans/system CJK fallbacks serve reading; IBM Plex Mono serves paths, line numbers and compiler output.

`Shell.tsx` owns grouped primary navigation and the shared search entry. Desktop uses the 248px documentation sidebar; mobile uses an inline disclosure containing every destination. `Topics.tsx` uses a 245px classified reading rail and flexible document column. `CodeSearch.tsx` uses source rows and a dark line-numbered code preview: the code itself is the signature visual. At narrow widths the selected preview precedes results and document navigation collapses above reading.

Use existing white surfaces, 12px panel radius and blue selection accents. No new brand palette. `src/workspace.css` defines global scrollbars using `--scroll-thumb`, `--scroll-track`, `--scroll-hover`, `--scroll-active`; reduced-motion and forced-colors modes respect platform preferences.

Reconciliation: prior topic button wrapping did not scale to the imported corpus; replaced with classified disclosure navigation. Prior mobile navigation omitted secondary destinations; all destinations now remain accessible. Existing color tokens remain unchanged.

## Documentation UX · October 2026

Reference: https://opencode.ai/docs/ — persistent header, grouped navigation,
readable document measure and on-page orientation. This is a Chinese learning
product for C / embedded engineers, not a marketing landing page.

The existing palette is retained: canvas #F6F7F9, white surface #FFFFFF,
ink #15191F, blue #00599C, green #18794E, amber #B35C00, code #10151C.
Runtime ownership remains Model B: `styles.css` semantic tokens →
`workspace.css` shared components → `docs.css` documentation layout.
`docs.css` owns --sidebar (248px) and --header-height (72px; 64px on mobile).
Typography keeps system CJK reading fallbacks and the existing mono stack for
brand, paths and pipeline labels. No external font dependency is introduced.

The signature is the real eight-stage learning pipeline, surrounded by quiet
white reading space. Homepage: introductory guide, two starting points, latest
published lesson, daily method and engineering resources. Course counts and
latest lesson always derive from the Markdown index. No duplicated course data.

Desktop: 248px left navigation, flexible document (home max 760px), right TOC.
At 1200px the home TOC becomes an inline section index; below 980px lesson TOC
moves above the article; below 760px primary navigation is a disclosure.
Header search and all destinations remain accessible. Lesson metadata belongs
below its right TOC. Search and Lab retain task-specific working layouts.

Reconciliation: replaces dashboard-style homepage and four-column lesson
reading with documentation-first navigation. Existing 12px application panels
remain; documentation links and callouts use a restrained 6px radius.

## Memory visualizer

The C++ memory visualizer uses one deterministic DOM/SVG stack-and-heap view.
Its signature is the pointer line between real variable and allocation cards;
layout remains quiet and stable while the VCR advances. Runtime tokens remain
owned by `styles.css`, while `visualizer.css` owns the dark code surface and
semantic pointer treatments: raw green, smart blue, reference gray and
dangling red. Approximate regex traces are always labeled and never presented
as exact runtime evidence. Graph-layout libraries and force-directed motion are
not part of this product surface.
