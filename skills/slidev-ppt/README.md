# slidev-ppt —— 安装与使用

把 C++ 课程演讲大纲转换为 **Slidev 交互式幻灯片**（`lesson-0X.md`），全系列共享同一套主题，保证风格一致、简洁、清晰。

```
slidev-ppt/
├── SKILL.md                     # 技能入口（触发描述、工作流程、输出格式、自检清单）
├── references/
│   ├── style-guide.md           # 视觉 / 语言 / 交互规范
│   └── components.md            # 允许使用的组件、pc-* 类名、7 种页面版式片段
├── assets/theme/                # 复制到 deck 根目录即可生效
│   ├── style.css                # 设计 token（改风格只改这里）
│   ├── global-top.vue           # 自动页眉「第 X 课 · 短标题」+ 页脚「PPT N · 页码」
│   └── components/{Quote,Callout}.vue
└── examples/
    └── lesson-01.md             # 第 1 课 PPT 1 标准输出（5 页，含 v-click 与演讲者备注）
```

仓库中的 [`slides/`](../../slides) 已是配置好的 deck，可直接运行：

```bash
cd slides
npm install
npm run dev        # http://localhost:3030，→ 逐步点击，P 打开演讲者视图
npm run build      # 构建静态站点到 slides/dist/lesson-01
npm run export     # 导出 PDF
```

## 方式 A：Gemini CLI（Agent Skills）

```bash
mkdir -p ~/.gemini/skills && cp -r skills/slidev-ppt ~/.gemini/skills/   # 用户级
# 或项目级：mkdir -p .gemini/skills && cp -r skills/slidev-ppt .gemini/skills/
# 或软链接：gemini skills link ./skills/slidev-ppt
gemini skills list
```

在会话中粘贴大纲：「把下面第 2 课的大纲生成 Slidev 幻灯片……PPT 1: ……」，把输出的 md 保存为 `slides/lesson-02.md`，运行 `npx slidev lesson-02.md`。

## 方式 B：Gemini 网页 / App（Gem）

1. 新建 Gem，名称：`C++ 课程 Slidev 幻灯片生成器`。
2. 说明（Instructions）：粘贴 `SKILL.md` 正文（去掉顶部 `---` 元数据）。
3. 知识（Knowledge）：上传 `gemini-upload/slidev-ppt/` 下的扁平文件（`style-guide.md`、`components.md`、`lesson-01.md`、`style.css`、`global-top.vue`、`Quote.vue`、`Callout.vue`）。

## 维护建议

- 改配色 / 字号：只改 `assets/theme/style.css`，并同步到 `slides/`。
- 新增可复用视觉元素：先在 `style.css` 加 `pc-*` 类并写进 `components.md`，再在大纲中使用——不要让模型临场发明样式。
- 生成后可用 `npx slidev export lesson-0X.md --format png` 截图逐页检查。
