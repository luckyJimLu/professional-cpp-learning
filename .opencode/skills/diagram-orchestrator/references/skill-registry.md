# Diagram skill registry

This registry is the source map for the project-local skills under `.opencode/skills`. OpenCode derives each skill ID from its directory name.

| Skill ID | Upstream repository and path | Installed revision | Role |
|---|---|---|---|
| `slidev-ppt` | Project-local (Core Hub) | local | Central Slidev PPT generator, 3-zone outline fidelity & multi-skill coordinator |
| `diagram-orchestrator` | Project-local | local | Routing, inventory, and lifecycle coordination for all diagram sub-skills |
| `diagram-design` | `cathrynlavery/diagram-design` → `skills/diagram-design` | `0b9b10cab3dbf695642fa1a6c4b4f60df9083689` | Polished HTML/SVG/PNG editorial diagrams (Pyramids, Memory layouts, Delta, Radar) |
| `mermaid-diagrams` | `softaworks/agent-toolkit` → `skills/mermaid-diagrams` | `3027f20f3181758385a1bb8c022d4041dfb4de84` | Default Markdown and Slidev Dark inline diagram-as-code workflow |
| `plantuml-skill` | `DoubleMice/plantuml-skill` → repository root | `1973811bd60981c2c1330fac16073b509b876457` | Rigorous C++ UML authoring and secure local rendering |
| `draw-io` | `softaworks/agent-toolkit` → `skills/draw-io` | `3027f20f3181758385a1bb8c022d4041dfb4de84` | Editable draw.io XML and dark-theme transparent exports |
| `excalidraw` | `softaworks/agent-toolkit` → `skills/excalidraw` | `3027f20f3181758385a1bb8c022d4041dfb4de84` | Whiteboard-style Excalidraw artifacts with context-isolated extraction |
| `ppt-chinese-fonts` | Project-local (`yuleshow/chinese-fonts` reference) | local | Noto Sans CJK SC/TC/HK & monospace code font verification |

Installed on 2026-10-25.

## Lifecycle procedure

### Inspect

Run `python3 scripts/check_diagram_skills.py` from the orchestrator directory. A healthy entry has a directory, a `SKILL.md`, parseable YAML-style frontmatter, and a frontmatter `name` matching the directory ID.

### Update

1. Review upstream changes between the recorded revision and the proposed revision.
2. Check the local skill directory for project-specific modifications before replacing files.
3. Update only the requested skill directory from its recorded upstream path.
4. Run the health check and the skill creator's `quick_validate.py` against the updated directory.
5. Exercise any bundled scripts that changed, using a temporary test artifact rather than project deliverables.
6. Record the new full commit revision here.

### Add or replace

Check that the new directory ID is unique, that `SKILL.md` is directly inside it, and that its instructions do not silently require unavailable tools or remote data transfer. Add its routing rule to the orchestrator only if it serves a distinct use case.

### Remove

Removal is destructive. Resolve the exact skill ID, confirm that no project documentation or automation refers to it, and remove it only when the user explicitly requests removal. Update this registry and the routing table in the same change.

## Dependency notes

- Mermaid source generation needs no local renderer; rendering depends on the project's Markdown/web toolchain.
- `plantuml-skill` does not install Java, Graphviz, PlantUML, or a JAR. It prefers local rendering and blocks unapproved remote rendering.
- `draw-io` export requires a local `drawio` command; its bundled conversion script also assumes project-specific tools that may not be present.
- `diagram-design` export scripts may require optional browser or image libraries; its HTML output remains the canonical artifact.
- `excalidraw` is instruction-only and expects an OpenCode subagent workflow for verbose JSON operations.
