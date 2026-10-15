# Learning UX Contract

This document is the contract for future UI changes made by ChatGPT, OpenCode, or other agents.

## 1. Source of truth

- Course content MUST come from repository Markdown.
- The frontend MUST NOT maintain a duplicate hard-coded list of Day lessons.
- Adding a valid `daily/day-XXX-*.md` file MUST make the lesson discoverable without editing UI code.
- Existing historical lessons MUST remain readable without frontmatter.

## 2. Primary learning path

```text
Today
  ↓
READ → RECALL → CONCEPT → REFACTOR → RULES → LAB → REVIEW → PASS
  ↓
BUILD SUCCEEDED
  ↓
Progress / Review
```

A lesson is not complete merely because the user scrolled to the bottom.

## 3. Compile Rail

Compile Rail is both navigation and state.

States:

- `●` complete
- `◐` current
- `○` upcoming

Labels remain:

`READ · RECALL · CONCEPT · REFACTOR · RULES · LAB · REVIEW · PASS`

Do not replace Compile Rail with a generic percentage-only progress bar.

## 4. Information architecture

Desktop primary navigation:

1. Today
2. Roadmap
3. Lessons
4. 专题
5. Lab
6. Review
7. Guidelines
8. Progress

Mobile primary navigation:

- Today
- Roadmap
- 专题
- Lab
- Progress

All destinations, including code search, are reachable on mobile through the shared navigation disclosure.

## 5. Lesson layout

Desktop:

- left: shared grouped site navigation
- center: lesson document
- right: Day TOC / 8 stages followed by session metadata

The right column MUST NOT contain recommendations, social content, ads, or unrelated cards.

Mobile collapses to a single reading column.

## 6. Lab

Lab is a first-class mode.

Phase 1:

- task panel
- repository C++ source or extracted code fence
- checklist
- hint
- completion state

Browser compilation is implemented as a lazy-loaded Web Worker. It MUST remain optional infrastructure around the Markdown Lab source and MUST NOT change the Markdown content model.

Memory visualization has one canonical session shared by Lab and the standalone visualizer. Preset snapshots are the fast path; Clang `[VIS]` events are exact runtime evidence; regex inference is explicitly labeled approximate. A compiler/toolchain failure remains an error and may only enter approximation after an explicit user action. Editing code preserves the previous trace for inspection and marks it stale until the next run.

The canonical renderer is the deterministic DOM/SVG stack-and-heap view. Stack, heap, and pointer SVG share one scroll owner so geometry cannot detach while scrolling. VCR steps are clamped, autoplay stops at the final frame, and a new trace resets playback to its first frame.

The Lab source shown in the editor starts from the repository source. Browser edits are ephemeral unless a future explicit save workflow is introduced.

## 7. Daily frontmatter

New lessons SHOULD use:

```yaml
---
day: 33
week: 5
part: II
chapter: 5
chapter_title: Designing with Classes
title: Polymorphism and Virtual Interfaces
duration: 60
status: published

topics:
  - polymorphism
  - virtual-functions
  - interface-design

guidelines:
  - small-interface
  - explicit-lifetime
  - avoid-realtime-allocation

lab:
  path: examples/day-033/main.cpp

previous: 32
next: 34
---
```

## 8. Time budget

Target session: 60 minutes.

| Stage | Budget |
|---|---:|
| Read | 5 |
| Recall | 5 |
| Concept | 12 |
| C → Modern C++ | 8 |
| Coding Guideline | 8 |
| Lab | 15 |
| Pitfalls | 3 |
| Quiz | 4 |

When content must be shortened, reduce prose before reducing Lab.

## 9. Progress semantics

Progress should prioritize learning evidence over vanity metrics.

Skill bars MUST be described as coverage/evidence, not objective mastery scores unless a real assessment system is introduced.

## 10. Markdown diagrams and topics

- `src/components/Markdown.tsx` is the shared owner for Markdown across lessons, roadmap, guidelines and topics.
- Fenced Mermaid blocks render diagrams; other code blocks retain their existing code behavior.
- Mermaid loads on demand in strict mode. A failure must leave source readable and allow retry without breaking the rest of the lesson.
- Diagram overflow is local and keyboard accessible; it must not expand the whole page on mobile.
- Topics come from repository Markdown in patterns, frameworks/asio, and the Mermaid guide. Links between these documents select the target document in the reader.
- No new progress or completion semantics are introduced by merely viewing a diagram or topic.

## 11. Workspace navigation and search

| Capability | Canonical owner | Contract |
|---|---|---|
| Navigation | `src/lib/navigation.ts`, `Shell.tsx` | URL query state, reload and browser back/forward, Ctrl/Cmd+K opens search |
| Reading | `Topics.tsx`, `Markdown.tsx`, `topics.ts` | Classified bilingual repository documents, shared asset resolution |
| Search | `CodeSearch.tsx`, `search.ts` | Local literal case-insensitive search, C/C++ files and fenced code; 30 matches per page |
| Scrollbar | `src/workspace.css` | Global token baseline and forced-colors fallback |

Search stores query, type, page and preview location in the URL. Local search updates immediately, suspends commits during IME composition, and clear restores input focus. Empty query and no matches have distinct guidance. Code previews show original file line numbers, escaped text and highlighted matches. Viewing search results does not mark lessons complete. PDF reference files are downloadable; source files and diagram assets remain usable after static deployment.

## 12. Documentation navigation

`Shell.tsx` owns the sticky site header and grouped desktop/mobile navigation.
`OnThisPage.tsx` owns the homepage anchor index and scroll-position highlight.
`LessonView.tsx` retains the canonical eight-stage navigation and progress;
its right TOC follows the visible section and adjacent-course links use published
Markdown lessons only. Anchor targets clear the sticky header. Navigation uses
query URLs compatible with the GitHub Pages repository base path.
`App.tsx` owns localized document titles. The homepage is a learning guide and
shows the latest published lesson when the next lesson is unavailable.
