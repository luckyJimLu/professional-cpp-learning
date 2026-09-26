# Learning UX

## Today

Today answers only:

- where am I?
- what should I do now?
- where is Continue?

Repository `progress.md` is used as the baseline. If the next Day has not yet been published, Today shows the next planned Day and falls back to reviewing the latest published lesson.

## Daily lesson

Each historical course section is mapped to the pipeline:

| Markdown section | Compile Rail |
|---|---|
| ① Reading | READ |
| ② Recall | RECALL |
| ③ Concept | CONCEPT |
| ④ C vs Modern C++ | REFACTOR |
| ⑤ Coding Guideline | RULES |
| ⑥ Lab | LAB |
| ⑦ Pitfalls | REVIEW |
| ⑧ Quiz | PASS |

The mapping uses the circled section number, so historical Chinese titles can vary without breaking navigation.

## Roadmap

Roadmap is a vertical execution path grouped by week. It is generated from the Course Index instead of manually maintained cards.

Part is inferred from Chapter only as a backward-compatibility fallback. New lessons should provide frontmatter.

## Lab extraction

Resolution order:

1. `lab.path` from frontmatter;
2. `examples/day-XXX/main.cpp`;
3. first C++ code fence in the Day ⑥ Lab section.

This allows old lessons to work today while moving future exercises into independent compilable files.

## Progress

Repository history through the current completed Day forms the baseline. Browser learning state extends that baseline for future lessons.

Local state key:

`professional-cpp-learning-console:v1`

The first release intentionally avoids a backend.

## Responsive behavior

Desktop:

- persistent 7-item left navigation;
- focused central workspace;
- optional sticky lesson metadata.

Mobile:

- no desktop sidebar;
- compact header;
- bottom navigation for Today / Roadmap / Lab / Progress;
- lesson becomes one reading column;
- Lab becomes task-above-code.

## Accessibility

- real buttons are used for navigation actions;
- visible focus rings are preserved;
- status is not communicated by color alone;
- touch targets are kept near or above 40 px where practical.
