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
4. Lab
5. Review
6. Guidelines
7. Progress

Mobile primary navigation:

- Today
- Roadmap
- Lab
- Progress

Secondary destinations remain reachable from desktop and can later be added to a mobile overflow surface.

## 5. Lesson layout

Desktop:

- left: Day TOC / 8 stages
- center: lesson document
- right: session metadata

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

Phase 2 may add WebAssembly compilation with warning flags, but it MUST NOT change the Markdown content model.

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
