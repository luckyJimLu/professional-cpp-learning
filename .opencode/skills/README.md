# OpenCode Skills 目录索引（以 `slidev-ppt` 为核心中枢的演示文稿工程体系）

本目录构建了一套**以 [`slidev-ppt`](./slidev-ppt) 为核心枢纽（Core Hub）、其余 7 个专业技能为辅助支撑（Auxiliary Spokes）**的演示文稿（PPT）与架构可视化生成体系。核心目标是将课程大纲转化为**零幻觉、100% 忠于原文、逻辑严密、形状即语义、全链路视觉高度统一**的工程蓝图级交互式 Slidev 课件。

---

## 核心中枢与辅助子技能一览表（Hub-and-Spoke 架构）

| 层级 | 技能名称 (Directory) | 主要定位与职责 | 支持格式 / 产物 | 在 PPT 生成中的协同角色 |
| :--- | :--- | :--- | :--- | :--- |
| **核心中枢**<br>(Core Hub) | [**`slidev-ppt`**](./slidev-ppt) | **交互式 PPT 生成与总控中枢**<br>解析课程大纲、执行三栏严格映射契约、生成 Slidev 课件并运行防幻觉校验 | `slides/lesson-0X.md`<br>`check_slides.py` 报告 | **主入口**：统管页面拆分、工程蓝图网格主题、组件排版、演讲者备注与子技能调度 |
| **图表路由**<br>(Router) | [**`diagram-orchestrator`**](./diagram-orchestrator) | **图表总调度器**<br>根据大纲 `呈现方式` 的视觉结构特征，智能路由至最佳绘图子技能 | 路由决策 / 技能健康检查 | 确保「形状即语义」（如金字塔用几何梯形、内存用连续/分离槽位、复杂类图用 UML） |
| **出版级蓝图**<br>(Tier 3) | [**`diagram-design`**](./diagram-design) | **出版级 SVG 蓝图设计系统**<br>支持 45 种专业图型（几何金字塔、内存块布局、架构演进 Delta、罗盘图） | 内联 `.pc-svg-hero` `<svg>`<br>或独立 HTML/SVG | 内置 `professional-cpp-dark` 蓝图预设，绘制高表现力几何模型、带引线标注框与跃迁弧线 |
| **轻量流图**<br>(Tier 2) | [**`mermaid-diagrams`**](./mermaid-diagrams) | **Markdown 原生流图与时序图**<br>轻量级控制流、`#include` 传染树、`weak_ptr` 破环图、知识链路图 | Mermaid 代码块<br>(`slidev-cpp-presets.md`) | 内置 Slidev Dark 主题头与 C++ 模板 `<T>` 转义规范，直接内嵌于 `slides.md` |
| **严谨 UML**<br>(Tier 4) | [**`plantuml-skill`**](./plantuml-skill) | **工业级 C++ UML 建模**<br>精确表达 GoF 类继承、双重分发、编译防火墙（Pimpl）、DIP 所有权反转 | `.puml` 源码 + 本地渲染 `.svg`/`.png` | 内置 Slidev Dark Blueprint `skinparam`，生成放到 `slides/public/diagrams/` 的精确 UML |
| **矢量拓扑**<br>(Tier 5) | [**`draw-io`**](./draw-io) | **可拖拽编辑矢量图**<br>支持精确坐标微调与系统架构图标 | `.drawio` (XML) + 透明底 `.svg`/`.png` | 提供思源黑体 + JetBrains Mono 及 `--pc-*` 暗色样式模板，支持人工后续微调 |
| **白板草图**<br>(Tier 5) | [**`excalidraw`**](./excalidraw) | **手绘白板推演与上下文隔离**<br>处理高 Token 消耗的 `.excalidraw` JSON | `.excalidraw` + CLI 摘要提取 | 通过子代理隔离或 `excalidraw_extract.py` 提取拓扑，可转为 `diagram-design` 蓝图 |
| **字体保障**<br>(Typography) | [**`ppt-chinese-fonts`**](./ppt-chinese-fonts) | **中文字体与代码等宽字体规范**<br>建立思源黑体 + JetBrains Mono 标准字体栈 | `check_ppt_fonts.py --check-mono` | 保障中文标点、字重层级与 C++ 代码中文注释对齐，杜绝跨平台缺字与远程字体依赖 |

---

## 核心协同工作流与路由拓扑

```mermaid
flowchart TD
    OUTLINE["课程大纲 (PPT/设计模式大纲.md)<br/>重点内容 · 呈现方式 · 演讲要点"] --> HUB["核心中枢: slidev-ppt<br/>(三栏严格隔离 · 工程蓝图网格主题)"]

    HUB -->|1. 字体栈核验 (--check-mono)| FONT["ppt-chinese-fonts<br/>Noto Sans CJK SC + JetBrains Mono"]
    HUB -->|2. 视觉呈现路由| ORCH["diagram-orchestrator<br/>(五级图表路由矩阵)"]

    ORCH -->|Tier 1: 矩阵表 / Benchmark 条形图| NATIVE["Slidev 原生组件<br/>table · pc-bars · pc-card"]
    ORCH -->|Tier 2: 轻量依赖流 / 破环图 / 导图| MERMAID["mermaid-diagrams<br/>(Slidev Dark Preset + &lt;T&gt; 转义)"]
    ORCH -->|Tier 3: 几何金字塔 / 内存块 / 罗盘 / Delta| DESIGN["diagram-design<br/>(pc-svg-hero 几何蓝图 + 引线标注)"]
    ORCH -->|Tier 4: 复杂 C++ 类图 / DIP / Visitor| PLANT["plantuml-skill<br/>(Slidev Dark skinparam -> SVG)"]
    ORCH -->|Tier 5: 手调矢量 / 白板草图| VEC["draw-io / excalidraw"]

    NATIVE & MERMAID & DESIGN & PLANT & VEC --> DECK["生成课件: slides/lesson-0X.md"]
    DECK -->|3. 自动化结构与防幻觉检验| CHECK["slidev-ppt/scripts/check_slides.py<br/>(零越界 · 零改写 · 点击同步 · 0 Errors)"]
```

---

## 三大工程质量支柱

### 1. 防幻觉与大纲三栏严格映射契约（Zero Hallucination & Strict Grounding）
针对大模型生成 PPT 时常见的“把口头故事升格成独立页面”、“同义词擅自改写（如把‘晚上 CI’改成‘夜间 CI’）”、“给自定义类型乱加 `std::`（如 `std::Widget*`）”等问题，`slidev-ppt` 强制执行：
- **`重点内容` + `呈现方式` → 幻灯片画面（Slide Canvas）**：100% 兑现大纲指定的图表、表格、对比代码、Benchmark 数值与金句，零遗漏、零篡改。
- **`演讲要点` → 仅限页底演讲者备注（`<!-- ... -->`）**：开场痛点故事、口头比喻（如“电钻和锯子 vs 建筑蓝图”）、面试追问 **100% 放入备注**，严禁越界升格为独立幻灯片或画面卡片。
- **自动化拦截（`check_slides.py`）**：自动比对 `slides/lesson-0X.md` 与 `PPT/设计模式大纲.md`，一旦发现 `演讲要点` 词句泄漏到画面、出现大纲外改写词、伪造 `std::` 前缀或点击数失步，立即报错阻断。

### 2. 形状即语义与工程蓝图视觉升级（Shape Encodes Meaning）
对比 NotebookLM 等高质量视觉演示，本体系摒弃“用三个等宽 `<div>` 矩形冒充金字塔”的平庸做法：
- **工程蓝图网格底纹**：在 `style.css` 中内置 `24px / 96px` 双层工程蓝图坐标网格底纹。
- **真实几何模型（`.pc-svg-hero`）**：金字塔使用真实 `<polygon>` 三角形与梯形（配合主战场层级高亮、左侧跃迁弧形箭头、右侧带指向引线的标注框与跨层虚线括号）；内存布局绘制真实的分离堆块 vs 单块连续内存槽位与指针箭头；性能对比使用按真实比例缩放的 `.pc-bars` 横向条形图。

### 3. 全链路跨工具视觉 Token 统一（Unified Visual Tokens）
所有子技能共享同一套 `--pc-*` 暗色工程蓝图色板（背景 `#0F172A`、卡片 `#1E293B`、边框 `#334155`、主文 `#E2E8F0`、青蓝强调 `#38BDF8`、翠绿正向 `#22C55E`、珊瑚红警告 `#EF4444`、琥珀金句 `#F59E0B`、紫罗兰横切 `#A78BFA`）与思源黑体字体栈。

---

## 常用校验与维护命令

```bash
# 1. 检查所有 8 个 skills 的目录与元数据健康度
python3 .opencode/skills/diagram-orchestrator/scripts/check_diagram_skills.py

# 2. 检查本机思源黑体与 C++ 代码等宽字体
python3 .opencode/skills/ppt-chinese-fonts/scripts/check_ppt_fonts.py --check-mono

# 3. 校验生成的 Slidev 幻灯片（结构 + 大纲防幻觉溯源；CLI 冻结）
python3 .opencode/skills/slidev-ppt/scripts/check_slides.py slides/lesson-01.md \
  --outline PPT/设计模式大纲.md --lesson 1

# 4. 技能回归测试（守护基准课件 + 泄漏/std/点击/课号 用例）
python3 -m unittest discover -s .opencode/skills/slidev-ppt/scripts -p 'test_*.py'
```
