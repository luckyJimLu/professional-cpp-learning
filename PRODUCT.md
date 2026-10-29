# Professional C++ Learning

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chinese-speaking developers with C and foundational embedded-systems experience, learning modern C++ language mechanisms, ownership and system architecture. This audience is established by the homepage and repository course introduction.

## Product Purpose

Connect repository-backed reading, recall, concepts, refactoring, coding rules, browser experiments and review in a daily learning workflow. Success is recorded evidence through the eight learning stages, not publication counts, page views or a claimed mastery score.

## Operating Context

Desktop browsers support long-form reading and side-by-side code inspection. Phones support reading, course navigation, slides in portrait/landscape and trace playback. The application is built with React, TypeScript and Vite for static GitHub Pages hosting. RTOS is a separate web entrypoint.

## Capabilities and Constraints

- Markdown is the course, topic and slide source of truth. Existing URLs, browser history and local records must remain compatible.
- Native selects and disclosures retain their platform keyboard behavior. Navigation drawers and search remain keyboard accessible.
- The Clang/WASM compiler is optional and failure must not claim success or silently become an exact trace. Approximate trace evidence is labeled.
- Booklets provide a Chinese C17 quick reference with local keyword search and downloadable Markdown/C examples; C fragments are separate from C++ Lab execution.
- RTOS is a teaching simulator; viewing or playing a trace does not prove course completion.
- Source edits and UI work must preserve the three existing Slidev course decks and their speaker notes.

## Brand Commitments

Professional C++ is an engineering learning handbook. The user approved refinement of the established light reading surfaces, blue accent and dark code/slide surfaces, rather than a visual rebrand. Interface language is simplified Chinese; source identifiers and established technical terminology remain intact.

## Evidence on Hand

README.md, UX-CONTRACT.md, DESIGN.md, daily/ Markdown, repository examples, topic documents, three Slidev decks and existing Playwright regression suites. No invented benchmark, usage, completion or testimonial claims.

## Product Principles

- Make the next meaningful learning action findable.
- Keep reading focused and technical evidence inspectable.
- Apply consistent controls without merging unrelated runtime state.
- Preserve the distinction between published content and learner achievement.

## Accessibility & Inclusion

Target WCAG 2.2 AA: native semantics, visible focus, sufficient contrast, keyboard operation, reduced motion and usable narrow layouts. Maintain 44px touch targets on phones and local overflow for code, diagrams and tables.
