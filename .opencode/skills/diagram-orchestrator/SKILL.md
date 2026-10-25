---
name: diagram-orchestrator
description: Route, create, review, convert, and maintain diagrams by selecting the appropriate installed Mermaid, PlantUML, draw.io, Excalidraw, or editorial diagram-design skill. Serves as the primary diagram routing engine for slidev-ppt presentations, enforcing shape-matches-meaning geometry, outline source grounding, and Slidev Dark Blueprint visual consistency.
license: MIT
metadata:
  scope: project
  workflow: diagram-routing
---

# Diagram Orchestrator

Use this skill as the single entry point for diagram work in this project, especially when called by **`slidev-ppt`** to fulfill visual requirements in presentation outlines. Select a format deliberately, then load only the specialist skill needed for the task.

## Route the request

An explicit user format always wins. Otherwise preserve the repository's established format.

| Need | Load this skill | Default deliverable |
|---|---|---|
| Slidev 几何金字塔、内存连续/分离块布局、vptr/vtable 跳转、缓存行、架构前后演进（Delta）、罗盘/雷达/桑基图、45 种出版级高阶图表 | `diagram-design` | Slidev 内联 `<div class="pc-svg-hero"><svg>...</svg></div>` 或导出至 `slides/public/diagrams/*.svg` |
| Version-controlled Markdown diagrams, ordinary flows, sequences, `#include` dependency trees, ADL flows, or knowledge maps (≤ 8 nodes) | `mermaid-diagrams` | Mermaid fenced block（在 Slidev 中必须带 Slidev Dark 配置头） |
| Precise C++ UML, GoF class hierarchies, Visitor double-dispatch, Bridge/Pimpl compilation firewall, DIP ownership inversion, or `.puml` | `plantuml-skill` | `.puml` plus locally rendered `.svg`/`.png` in `slides/public/diagrams/` |
| Manually editable vector diagrams, existing `.drawio`, presentation handoff, or AWS icon work | `draw-io` | `.drawio` plus transparent dark-theme `.svg`/`.png` |
| Whiteboard or hand-drawn collaboration and existing `.excalidraw` files | `excalidraw` | `.excalidraw` JSON; obey that skill's subagent delegation & CLI extraction rules |

Use one primary specialist. Load a second only when conversion, import, export, or cross-format review genuinely requires it.

## Slidev PPT Presentation Mode (Serving `slidev-ppt`)

When generating diagrams for `slidev-ppt` (`slides/lesson-0X.md`), enforce these four presentation contracts:

1. **Shape Encodes Meaning（形状即语义，严禁退化为等宽矩形）**:
   - **金字塔 / 漏斗模型**（如三层开发金字塔）：必须使用 `<polygon>` 绘制真实上窄下宽的几何三角形与梯形，并用高饱和主色（`#38BDF8`）高亮核心目标层（如中层「软件设计」），左侧配跃迁弧形箭头，右侧配引线标注框与跨层括号（见 `diagram-design/references/type-pyramid.md`）。
   - **物理内存与指针布局**（如 `shared_ptr(new T)` vs `make_shared<T>()`、CPU 缓存行、`std::variant` 栈内联合体 vs 虚函数指针追逐）：必须绘制精确的内存槽位框与实线/虚线指针箭头。
   - **架构依赖与反转**（如 DIP 接口所有权、Visitor 循环依赖）：必须用有向箭头与编译边界虚线框清晰标出 `#include` 方向。
2. **100% Outline Grounding（100% 锚定大纲，零脑补节点）**:
   - 图中的所有节点名称、C++ 类型名、函数签名、Benchmark 数值，必须严格取自大纲的 `重点内容` 与 `呈现方式`。
   - 严禁将仅属于 `演讲要点` 的口头故事（如“2 个故事点”、“晚上/夜间 CI”）画进图表节点，也严禁给用户自定义类伪造 `std::` 前缀。
3. **Unified Slidev Dark Blueprint Palette（统一暗色工程蓝图视觉 Token）**:
   - Canvas / Background: `transparent` or `#0F172A` (`--pc-bg`)
   - Node Surface: `#1E293B` (`--pc-surface`), Border: `#334155` (`--pc-border`)
   - Text: `#E2E8F0` (`--pc-text`), Muted / Default Connector: `#94A3B8` (`--pc-muted`)
   - Focal / Core Mechanism: `#38BDF8` (`--pc-accent`, fill `rgba(56, 189, 248, 0.20)`)
   - Positive / Recommended / Fast: `#22C55E` (`--pc-good`, fill `rgba(34, 197, 94, 0.14)`)
   - Negative / Anti-pattern / Bottleneck: `#EF4444` (`--pc-bad`, fill `rgba(239, 68, 68, 0.14)`)
   - Cross-cutting / Idioms / Templates: `#A78BFA` (`--pc-violet`), Quote / Callout Note: `#F59E0B` (`--pc-quote`)
   - Fonts: `'Noto Sans CJK SC'` for labels, `'JetBrains Mono', 'Noto Sans Mono CJK SC'` for C++ types/code.
4. **Canvas Budget (16:9 Projection)**:
   - Max 8 nodes per slide diagram; full-bleed SVG `viewBox="0 0 900 335"`, half-column SVG `viewBox="0 0 440 300"`. Minimum text size `11px`.

## Working contract

1. Inspect the target document, nearby diagrams, build pipeline, and requested output before selecting a format.
2. Load the selected specialist skill and follow its format-specific instructions and referenced playbooks.
3. Keep an editable canonical source. Generated PNG/SVG files are previews or distribution artifacts, not the only source.
4. Ground architecture and code diagrams in inspected evidence or the explicit course outline.
5. Validate syntax or structure with the available local renderer or checker (`check_slides.py`, `self_check.py`, `render_plantuml.py`).
6. Never upload diagram source, repository structure, or code to a public renderer without explicit user approval.

## Manage the installed set

For inventory, health checks, updates, additions, replacements, or removals, read [`references/skill-registry.md`](references/skill-registry.md).

Run the read-only health check across all skills in `.opencode/skills`:

```bash
python3 .opencode/skills/diagram-orchestrator/scripts/check_diagram_skills.py
```
