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
- react-markdown + GFM
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
- build CI

Deferred:

- browser C++ compiler / WASM
- authenticated cloud sync
- answer grading
- search
- server-side analytics
