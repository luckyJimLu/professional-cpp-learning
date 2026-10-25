---
name: diagram-orchestrator
description: Route, create, review, convert, and maintain diagrams by selecting the appropriate installed Mermaid, PlantUML, draw.io, Excalidraw, or editorial diagram-design skill. Use when a diagram request does not already have an obvious tool, spans formats, or asks to inspect or manage the project's diagram skills.
license: MIT
metadata:
  scope: project
  workflow: diagram-routing
---

# Diagram Orchestrator

Use this skill as the single entry point for diagram work in this project. Select a format deliberately, then load only the specialist skill needed for the task through OpenCode's native `skill` tool.

## Route the request

An explicit user format always wins. Otherwise preserve the repository's established format. For new Markdown documentation in this project, default to `mermaid-diagrams` because Mermaid is already the dominant checked-in format.

| Need | Load this skill | Default deliverable |
|---|---|---|
| Version-controlled Markdown diagrams, ordinary flows, sequences, ERDs, states, class or C4 views | `mermaid-diagrams` | Mermaid fenced block or `.mmd` source |
| Precise UML, source-derived models, complex sequence/class/component diagrams, or an existing `.puml` | `plantuml-skill` | `.puml` plus locally rendered SVG/PNG when available |
| Manually editable diagrams, existing `.drawio`, presentation handoff, or AWS icon work | `draw-io` | `.drawio` plus preview when available |
| Whiteboard or hand-drawn collaboration and existing `.excalidraw` files | `excalidraw` | `.excalidraw` JSON; obey that skill's delegation rules |
| Polished branded editorial graphics, HTML/SVG/PNG, unusual diagram types, or import from other formats | `diagram-design` | Self-contained HTML with SVG, then requested export |

Use one primary specialist. Load a second only when conversion, import, export, or cross-format review genuinely requires it. Do not generate five variants unless the user requests alternatives.

## Working contract

1. Inspect the target document, nearby diagrams, build pipeline, and requested output before selecting a format.
2. Load the selected specialist skill and follow its format-specific instructions and referenced playbooks.
3. Keep an editable canonical source. Generated PNG/SVG files are previews or distribution artifacts, not the only source.
4. Ground architecture and code diagrams in inspected evidence. Clearly label inferred relationships.
5. Validate syntax or structure with the available local renderer or checker. Then inspect the rendered result when layout matters.
6. Preserve the user's language and the project's visual conventions. Prefer a small diagram that answers one question over an overloaded overview.
7. Never upload diagram source, repository structure, or code to a public renderer without explicit user approval.

## Cross-format decisions

- Prefer Mermaid for documentation that should remain easy to review in Git diffs.
- Prefer PlantUML when UML semantics or layout control outweigh Mermaid's lower friction.
- Prefer draw.io when humans must continue editing visually.
- Prefer Excalidraw when the intended result is an informal whiteboard artifact.
- Prefer diagram-design when visual polish or a self-contained web artifact is the primary requirement.
- When converting, preserve the original source unless the user explicitly asks to replace it. State any semantics that the destination format cannot represent.

## Manage the installed set

For inventory, health checks, updates, additions, replacements, or removals, read [`references/skill-registry.md`](references/skill-registry.md).

Run the read-only health check when availability or structure is uncertain:

```bash
python3 scripts/check_diagram_skills.py
```

Do not update, replace, or remove a specialist merely because a newer upstream revision exists. Make lifecycle changes only when requested, preserve local modifications, validate every affected skill, and update the registry in the same change.
