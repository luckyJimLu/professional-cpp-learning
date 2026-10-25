# slidev-ppt —— 核心中枢技能（Core Hub Skill）安装与使用

将 C++ 课程演讲大纲转换为 **零幻觉、工程蓝图风格的 Slidev 交互式幻灯片**（`slides/lesson-0X.md`）。本技能是 `.opencode/skills/` 的中心枢纽，协同调度 `diagram-orchestrator`（及 `diagram-design`、`plantuml-skill`、`mermaid-diagrams`、`draw-io`、`excalidraw`）与 `ppt-chinese-fonts`。

```text
slidev-ppt/
├── SKILL.md                     # 核心入口（三栏严格映射契约、子技能调度协议、工作流）
├── agents/openai.yaml           # Agent 元数据配置
├── scripts/
│   └── check_slides.py          # 自动化结构与大纲防幻觉/防越界校验器
├── references/
│   ├── style-guide.md           # 视觉 / 语言 / 交互 / 防幻觉规范
│   ├── components.md            # 允许使用的组件、pc-* 类名、几何 SVG 蓝图与 9 种页面版式
│   └── diagram-and-fonts.md     # 5 级图表路由矩阵、跨工具 Token 映射表与思源黑体规范
├── assets/theme/                # 复制到 slides/ 根目录即可生效
│   ├── style.css                # 设计 token、工程蓝图网格底纹、表格与 Benchmark 条形图样式
│   ├── global-top.vue           # 自动页眉「第 X 课 · 短标题」+ 页脚「PPT N · 页码」
│   └── components/{Quote,Callout}.vue
└── examples/
    └── lesson-01.md             # 第 1 课 PPT 1 标准输出（含 SVG 几何三层金字塔与严格三栏分离）
```

## 快速运行与校验

仓库中的 [`slides/`](../../slides) 已是配置好的 deck，可直接运行：

```bash
# 1. 同步最新主题到 slides/
cp -r .opencode/skills/slidev-ppt/assets/theme/. slides/

# 2. 运行幻灯片结构与大纲防幻觉校验（检查栏目越界、点击同步、伪造 std:: 等）
python3 .opencode/skills/slidev-ppt/scripts/check_slides.py slides/lesson-01.md \
  --outline PPT/设计模式大纲.md --lesson 1

# 3. 检查本机思源黑体与代码等宽字体
python3 .opencode/skills/ppt-chinese-fonts/scripts/check_ppt_fonts.py --check-mono

# 4. 启动交互演示 / 构建 / 导出
cd slides
npm run dev        # http://localhost:3030，→ 逐步点击，P 打开演讲者视图
npm run build      # 构建静态站点到 slides/dist/lesson-01
npm run export     # 导出 PDF
```

## 维护与防幻觉建议

- **严守大纲三栏边界**：`重点内容` 与 `呈现方式` 决定幻灯片画面；`演讲要点`（痛点故事、口头比喻、面试追问）100% 仅写入 `<!-- ... -->` 演讲者备注，严禁升格为独立幻灯片或画面卡片。
- **形状即语义**：金字塔、内存块布局、vptr 跳转、罗盘图必须使用 `.pc-svg-hero` 真实几何 `<svg>` 或 `diagram-design` / `plantuml-skill` 生成的 SVG，禁止退化为三个等宽矩形 `<div>`。
- **每次修改必跑校验**：修改完 `slides/lesson-0X.md` 后务必执行 `check_slides.py`，确保 0 errors。
