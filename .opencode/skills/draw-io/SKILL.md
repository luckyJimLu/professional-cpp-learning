---
name: draw-io
description: draw.io diagram creation, editing, and review for Slidev presentations and technical docs. Use for .drawio XML editing, SVG/PNG conversion, layout adjustment, Slidev Dark Blueprint styling, and AWS/system icon usage.
---

# draw.io Diagram Skill (Slidev C++ Presentation Ready)

## 1. Basic Rules

- Edit only `.drawio` source files; keep `.drawio` alongside exported `.svg` or `.drawio.png` in `slides/public/diagrams/`.
- Do not directly edit exported `.drawio.png` or `.svg` files.
- **100% Outline Fidelity**: When used for `slidev-ppt`, include only components, types, and relationships from the outline's `重点内容` and `呈现方式`; never leak `演讲要点` oral anecdotes into diagram boxes.

## 2. Font & Slidev Dark Blueprint Theme Settings

For diagrams embedded in Slidev (`slides/lesson-0X.md`), specify `defaultFontFamily="Noto Sans CJK SC"` and transparent background (`background="none"`) in the `mxGraphModel` tag:

```xml
<mxGraphModel defaultFontFamily="Noto Sans CJK SC" background="none" page="0" ...>
```

Also explicitly specify `fontFamily` and **Slidev Dark Blueprint colors** (`--pc-*`) in each element's `style` attribute:

| Semantic Role | draw.io `style` snippet |
|---|---|
| Standard Box (`--pc-surface` + `--pc-border`) | `rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#334155;fontColor=#e2e8f0;fontFamily=Noto Sans CJK SC;fontSize=16;` |
| Focal / Core Box (`--pc-accent`) | `rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontFamily=Noto Sans CJK SC;fontSize=16;` |
| Positive / Recommended (`--pc-good`) | `rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#22c55e;strokeWidth=2;fontColor=#e2e8f0;fontFamily=Noto Sans CJK SC;fontSize=16;` |
| Anti-pattern / Bottleneck (`--pc-bad`) | `rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#ef4444;strokeWidth=2;fontColor=#e2e8f0;fontFamily=Noto Sans CJK SC;fontSize=16;` |
| C++ Code / Identifier Label | `text;html=1;fontSize=14;fontFamily=JetBrains Mono;fontColor=#38bdf8;` |
| Connector Arrow | `edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#94a3b8;strokeWidth=2;fontColor=#e2e8f0;fontFamily=Noto Sans CJK SC;` |

## 3. Conversion Commands

See conversion script at [scripts/convert-drawio-to-png.sh](scripts/convert-drawio-to-png.sh).

```sh
# Run script directly from project root
bash .opencode/skills/draw-io/scripts/convert-drawio-to-png.sh slides/public/diagrams/diagram1.drawio

# Or export SVG directly with drawio CLI
drawio -x -f svg -t -o slides/public/diagrams/diagram1.svg slides/public/diagrams/diagram1.drawio
```

Internal command used:

```sh
drawio -x -f png -s 2 -t -o output.drawio.png input.drawio
```

| Option | Description |
|--------|-------------|
| `-x` | Export mode |
| `-f png` | PNG format output |
| `-s 2` | 2x scale (high resolution) |
| `-t` | Transparent background |
| `-o` | Output file path |

## 4. Layout Adjustment

### 4.1. Coordinate Adjustment Steps

1. Open `.drawio` file in text editor (plain XML format)
2. Find `mxCell` for element to adjust (search by `value` attribute for text)
3. Adjust coordinates in `mxGeometry` tag
   - `x`: Position from left
   - `y`: Position from top
   - `width`: Width
   - `height`: Height
4. Run conversion and verify

### 4.2. Coordinate Calculation

- Element center coordinate = `y + (height / 2)`
- To align multiple elements, calculate and match center coordinates

## 5. Design Principles

### 5.1. Basic Principles

- Clarity: Create simple, visually clean diagrams
- Consistency: Unify colors, fonts, icon sizes, line thickness
- Accuracy: Do not sacrifice accuracy for simplification

### 5.2. Element Rules

- Label all elements
- Use arrows to indicate direction
  (prefer 2 unidirectional arrows over bidirectional)
- Use latest official icons
- Add legend to explain custom symbols

### 5.3. Accessibility

- Ensure sufficient color contrast
- Use patterns in addition to colors

### 5.4. Progressive Disclosure

Separate complex systems into staged diagrams:

| Diagram Type | Purpose |
|--------------|---------|
| Context Diagram | System overview from external perspective |
| System Diagram | Main components and relationships |
| Component Diagram | Technical details and integration points |
| Deployment Diagram | Infrastructure configuration |
| Data Flow Diagram | Data flow and transformation |
| Sequence Diagram | Time-series interactions |

### 5.5. Metadata

Include title, description, last updated, author, and version in diagrams.

## 6. Best Practices

### 6.1. Background Color

- Remove `background="#ffffff"`
- Transparent background adapts to various themes

### 6.2. Font Size

- Use 1.5x standard font size (around 18px) for PDF readability

### 6.3. Chinese (CJK) Text Width

- Allow 24–32px per Chinese character at 16–18px font size
- Insufficient width causes unintended line breaks

```xml
<!-- For 10-character Chinese text, allow 280-320px -->
<mxGeometry x="140" y="60" width="320" height="40" />
```

### 6.4. Arrow Placement

- Always place arrows at back (position in XML right after Title)
- Position arrows to avoid overlapping with labels
- Keep arrow start/end at least 20px from label bottom edge

```xml
<!-- Title -->
<mxCell id="title" value="..." .../>

<!-- Arrows (back layer) -->
<mxCell id="arrow1" style="edgeStyle=..." .../>

<!-- Other elements (front layer) -->
<mxCell id="box1" .../>
```

### 6.5. Arrow Connection to Text Labels

For text elements, exitX/exitY don't work, so use explicit coordinates:

```xml
<!-- Good: Explicit coordinates with sourcePoint/targetPoint -->
<mxCell id="arrow" style="..." edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="1279" y="500" as="sourcePoint"/>
    <mxPoint x="119" y="500" as="targetPoint"/>
    <Array as="points">
      <mxPoint x="1279" y="560"/>
      <mxPoint x="119" y="560"/>
    </Array>
  </mxGeometry>
</mxCell>
```

### 6.6. edgeLabel Offset Adjustment

Adjust offset attribute to distance arrow labels from arrows:

```xml
<!-- Place above arrow (negative value to distance) -->
<mxPoint x="0" y="-40" as="offset"/>

<!-- Place below arrow (positive value to distance) -->
<mxPoint x="0" y="40" as="offset"/>
```

### 6.7. Remove Unnecessary Elements

- Remove decorative icons irrelevant to context
- Example: If ECR exists, separate Docker icon is unnecessary

### 6.8. Labels and Headings

- Service name only: 1 line
- Service name + supplementary info: 2 lines with line break
- Redundant notation (e.g., ECR Container Registry): shorten to 1 line
- Use `&lt;br&gt;` tag for line breaks

### 6.9. Background Frame and Internal Element Placement

When placing elements inside background frames (grouping boxes),
ensure sufficient margin.

- YOU MUST: Internal elements must have at least 30px margin from frame boundary
- YOU MUST: Account for rounded corners (`rounded=1`) and stroke width
- YOU MUST: Always visually verify PNG output for overflow

Coordinate calculation verification:

```text
Background frame: y=20, height=400 -> range is y=20-420
Internal element top: frame y + 30 or more (e.g., y=50)
Internal element bottom: frame y + height - 30 or less (e.g., up to y=390)
```

Bad example (may overflow):

```xml
<!-- Background frame -->
<mxCell id="bg" style="rounded=1;strokeWidth=3;...">
  <mxGeometry x="500" y="20" width="560" height="400" />
</mxCell>
<!-- Text: y=30 is too close to frame top (y=20) -->
<mxCell id="label" value="Title" style="text;...">
  <mxGeometry x="510" y="30" width="540" height="35" />
</mxCell>
```

Good example (sufficient margin):

```xml
<!-- Background frame -->
<mxCell id="bg" style="rounded=1;strokeWidth=3;...">
  <mxGeometry x="500" y="20" width="560" height="430" />
</mxCell>
<!-- Text: y=50 is 30px from frame top (y=20) -->
<mxCell id="label" value="Title" style="text;...">
  <mxGeometry x="510" y="50" width="540" height="35" />
</mxCell>
```

## 7. Reference

- [Layout Guidelines](references/layout-guidelines.md)
- [AWS Icons](references/aws-icons.md)
- [AWS Icon Search Script](scripts/find_aws_icon.py)

AWS icon search examples:

```sh
python3 .opencode/skills/draw-io/scripts/find_aws_icon.py ec2
python3 .opencode/skills/draw-io/scripts/find_aws_icon.py lambda
```

## 8. Checklist

- [ ] No background color set (`background="none"`, `page="0"`)
- [ ] Font family set to `Noto Sans CJK SC` (prose) and `JetBrains Mono` (C++ code)
- [ ] Colors match Slidev Dark Blueprint tokens (`#1e293b`, `#38bdf8`, `#22c55e`, `#ef4444`, `#e2e8f0`)
- [ ] Arrows placed at back layer
- [ ] Arrows not overlapping labels (verify in exported SVG/PNG)
- [ ] Arrow start/end sufficiently distant from labels (at least 20px)
- [ ] Arrows not penetrating boxes or icons
- [ ] Internal elements not overflowing background frame (30px+ margin)
- [ ] 100% grounded in course outline `重点内容` and `呈现方式` (no invented nodes)

## 9. Embedding in Slidev (`slides/lesson-0X.md`)

Wrap the exported `.svg` or `.drawio.png` inside Slidev's `.pc-diagram` container so it scales cleanly within the 16:9 canvas:

```html
<div class="pc-diagram">
  <img src="/diagrams/lesson-0X-pptN-arch.svg" alt="架构示意图" />
  <div class="pc-diagram-caption">图示说明</div>
</div>
```
