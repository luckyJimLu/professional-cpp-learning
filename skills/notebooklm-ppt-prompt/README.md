# notebooklm-ppt-prompt —— 安装与使用

把 C++ 课程演讲大纲逐页转换为 NotebookLM Slide Deck 提示词，保证全系列风格一致、页间衔接连贯。

```
notebooklm-ppt-prompt/
├── SKILL.md                      # 技能入口（名称、触发描述、工作流程、自检清单）
├── references/
│   ├── style-guide.md            # 全系列风格锚点（改风格只改这里）
│   └── prompt-template.md        # 单页提示词 8 区块模板
└── examples/
    └── lesson-01-example.md      # 第 1 课 PPT1/PPT2 标准输出
```

## 方式 A：Gemini CLI（Agent Skills，推荐）

前置：Node.js ≥ 20，安装 Gemini CLI 并登录。

```bash
npm install -g @google/gemini-cli
gemini            # 首次运行按提示用 Google 账号登录
```

> 部分版本 Skills 仍属实验特性：在 `~/.gemini/settings.json` 中加入
> `{"experimental": {"skills": true}}`，或在 CLI 内执行 `/settings` 搜索 "skills" 打开。

任选一种安装方式：

```bash
# 1) 用户级（所有项目可用）
mkdir -p ~/.gemini/skills
cp -r skills/notebooklm-ppt-prompt ~/.gemini/skills/

# 2) 项目级（仅当前仓库可用，可随仓库提交共享）
mkdir -p .gemini/skills
cp -r skills/notebooklm-ppt-prompt .gemini/skills/

# 3) 用 CLI 命令安装 / 软链接（修改源文件即时生效）
gemini skills link ./skills/notebooklm-ppt-prompt
# 或从 Git 仓库安装：
# gemini skills install https://github.com/<you>/<repo>.git --path skills/notebooklm-ppt-prompt
```

验证：

```bash
gemini skills list          # 终端中查看
# 或在交互会话中： /skills list   （修改后可用 /skills reload 重新加载）
```

使用：在 Gemini CLI 会话中直接粘贴大纲并说明意图，模型会根据 description 自动激活技能（首次激活会请求确认）：

```
把下面第 2 课的大纲转成 NotebookLM PPT 提示词。上一课连续性摘要：……
PPT 1: ……
```

## 方式 B：Gemini 网页 / App（Gem）

网页版 Gemini 不支持加载技能目录，可用 Gem 作为等价方案：

1. 打开 gemini.google.com → 左侧「Gem 管理器」→「新建 Gem」。
2. 名称：`C++ 课程 NotebookLM PPT 提示词生成器`。
3. 「说明（Instructions）」：粘贴 `SKILL.md` 正文（去掉顶部 `---` 元数据）。
4. 「知识（Knowledge）」：上传 `references/style-guide.md`、`references/prompt-template.md`、`examples/lesson-01-example.md`。
5. 保存后，每次新课程直接粘贴大纲即可。

## 维护建议

- 修改系列风格（配色、页眉等）：只改 `references/style-guide.md` 的「风格锚点块」。
- 每课生成后，把输出中的「本课连续性摘要」保存下来，生成下一课时一并提供，保证跨课衔接。
- 新增优秀样例可放入 `examples/`，帮助模型对齐粒度。
