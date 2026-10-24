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

1. Today (学习指南)
2. 课程 (Lessons - 进阶路线与完整目录合一)
3. 专题 (Topics)
4. 实验 (Lab)
5. 编码规范 (Guidelines)
6. 复盘 (Review - 进度闭环、薄弱点与周复盘检查点)

Mobile primary navigation:

- 学习指南
- 课程
- 专题
- 实验
- 编码规范
- 复盘

All destinations, including code search, are reachable on mobile through the shared navigation drawer.

## 5. Lesson layout

Desktop & Mobile:

- left: shared site navigation
- center: distraction-free lesson document with sticky CompileRail at the top, ensuring optimal reading line length and single canonical stage navigation.

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

The Lab route places instructions before a full-width compiler workbench.
Source and output may share the width only while each remains readable;
otherwise the existing source/output switcher becomes the sole visible pane.
Long C++ lines wrap inside the Lab editor, and fenced source code must never be
rendered as experiment prose.

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

Published repository days MUST NOT prefill learner completion. A day becomes complete
only after all eight learning stages have recorded evidence. Publication counts and
course position use labels such as “已发布” or “课程”, never “当前进度”.

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

## 13. Topic browsing and reading

- The topic root (`?view=topics`) is a catalog; a `topic` query opens a document.
- `topicCategory` is a URL-backed domain filter. Filter changes show the catalog, never a stale article from another category.
- Series and article lists derive from repository Markdown. OpenHarmony and TRACE32 belong to embedded systems; Asio has its own network/async domain.
- Catalog series expose full article titles through native disclosures. Reading has a separate series directory, heading directory and adjacent article links.
- Native `<select>` owns domain selection, including its platform popup. `Topics.tsx` owns the selector; `src/docs.css` owns layout and focus treatment. Verify keyboard and narrow-screen behavior in `tests/topics.spec.ts`.
- `Markdown.tsx` remains the renderer/anchor owner. Topic heading navigation uses rendered h2 IDs rather than a second heading parser.
- Reading positions and the last-read document are stored locally, without implying completion. Storage failure must leave reading and navigation usable.
- On phones, the shared Shell drawer remains the only global navigation; topic controls use full-width disclosures and prose has no nested card padding.

- At desktop widths (1100px and above), topic and heading directories open by default in a sticky reading column beside the document. On smaller screens they start collapsed; resizing updates the layout and disclosure defaults.
- Topic reading normalizes repeated top-level Markdown headings through the shared renderer AST option; fenced code and stored Markdown are unchanged. The heading directory reads the resulting section IDs.

## 14. Shared UI refinement

- `PageHeader.tsx` renders the provided eyebrow, page title and description consistently. `src/product-ui.css` owns cross-page structural styling; existing semantic tokens remain in `styles.css`.
- The guide's primary learning action is visible on desktop and phone; its destination is an existing published course when the planned course is unavailable.
- Courses persist `courseQuery` and `courseTab` in URL query state. IME composition does not commit partial queries. Clearing returns focus to the course input. Current-week disclosure starts open; full article titles may wrap.
- Review cards and queued knowledge points link back to actual courses. Repository progress is identified as a baseline, not an assessment. Removing a review item means removing it from the list, not claiming mastery.
- Lab instructions and checklists live in a native disclosure; the workbench remains reachable without expanding them. The shared workbench toolbar owns the sole compile action and remains visible in source and output modes. Merely opening the RTOS page or generating an approximate memory trace does not complete the lab stage.
- Shell owns the mobile drawer focus loop, Escape dismissal, focus restoration, and removing background inertness after switching to desktop width. Header search uses the same route/shortcut owner as sidebar search.
- Activating a primary navigation destination scrolls to the top and focuses the new main region. Escape from the mobile drawer restores its trigger; choosing a destination moves focus into the destination instead.
- CodeBlock reports clipboard success only after the write resolves. Failure leaves manual copy and retry available.
- RTOS detail tabs support Left/Right, Home/End and tabpanel associations. Its configuration is a native non-modal disclosure with Escape/outside dismissal. Mobile retains playback speed, granularity, configuration and export.
- Regression owners: `tests/ui-polish.spec.ts`, existing topics/search/docs/visualizer/browser-compiler/RTOS browser suites. Touch target, keyboard and viewport checks supplement static design checks; they are not a full accessibility certification.

## 15. Task-first navigation and workspaces

- `VisualizerWorkbench.tsx` owns one compile/playback toolbar outside pane visibility; phone output mode supports play/pause, back, step and reset without changing panes. Existing event evidence labels remain authoritative.
- Lab task instructions, hints and reset use the same native disclosure. External-source status remains visible outside it. The compiler action is named “运行代码” everywhere in the Lab workspace.
- Course week themes derive from lesson chapter metadata; current-week anchors preserve real URL navigation.
- Topic Markdown may supply `summary` metadata. Without it, a complete introductory sentence is used instead of cutting a word at an arbitrary character limit.
- Search entries retain source paths and line numbers while displaying content titles. One authored clear action cancels pending query commits and restores input focus.
- `App.tsx` stores only a valid last-visited lesson ID under `professional-cpp:last-lesson`. Reading does not mark completion. Missing/unavailable storage falls back to the published learning plan/latest course.
- Review tasks come before baseline summaries in DOM order. The guidelines chapter index reads the shared renderer's actual heading IDs.
