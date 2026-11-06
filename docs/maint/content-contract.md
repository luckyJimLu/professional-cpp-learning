# 内容契约（Content Contract）

> 本文是内容区与代码、资源之间的唯一隔离规范。执行者每次新增内容或资源都按本章校验；`scripts/build-content.py`（内容管道）以本文为机器可读契约的实现蓝本。
>
> 维护位置：本文只此一份；其他文档只能引用，不复制规则。

## 1. 目录分区

| 分区 | 路径 | 允许文件 | 说明 |
| --- | --- | --- | --- |
| 区① 课程内容 | `daily/`、`weekly/`、`patterns/`、`examples/` | `.md`（daily/patterns）、C++ 源码仅限 `examples/` 与 `patterns/examples/` | 课程正文与配套源码，源码目录是例外区（源码不算"资源"） |
| 区① 速查与规范 | `booklets/`、`guidelines/` | `.md` + `booklets/examples/` 内 `.c/.cpp` | 速查与编码规范 |
| 区① 平台资料 | `frameworks/`、`topics/`、`references/reading-paths/`、`docs/*.md`（区①平铺层） | `.md`（frameworks 含矩阵认可的示例源码） | 网站专题页加载 |
| 资源镜像树 | `assets/<原内容路径>/…` | `.jpeg/.png/.svg/.webp/.gif/.pdf` 等非文本资源 | **正文目录禁止出现资源文件**；md 用相对路径引用 assets |
| 冻结基线 | `references/system-design-notes/**`（含其 `pdfs/`） | 原样保留，例外区 | 免资源分离；SHA-256 迁移契约锁定，不重排 |
| 设计规范 | `docs/design/` + 根 `PRODUCT.md` | `.md` + `.impeccable/` 配置 | PRODUCT.md 置根目录由 impeccable 技能约定决定 |
| 维护者文档 | `docs/maint/`（含 `archive/`） | `.md` + `.json` | 不加载进网站；**改动不触发站点构建** |

**分区隔离：** 区① 的文档面向读者，只写知识、操作与验证结论；规划、覆盖统计、评审记录、设计决策和历史修订一律放 `docs/design/` 或 `docs/maint/`。区① 不得链接这两个目录，需要引用时复述结论，或把可公开的部分写成区① 正文。

## 2. 文本契约（课程内容与元数据分离）

`daily/*.md` 只承载正文，一律以 `# Day NN · 标题` 开头，**禁止写 frontmatter（YAML 头部块）**。课程元数据统一存放于 `daily/lessons.meta.json`，每个 `daily/day-*.md` 必须有且仅有一条按 `path` 对应的条目：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `path` | 是 | `daily/day-XXX-<slug>.md`，与实际文件一一对应 |
| `week` / `part` / `chapter` / `chapter_title` / `title` | 是 | 周次、卷、章节号、章节名、课程标题 |
| `duration` / `status` | 是 | 分钟数字段；`status` 为 `draft \| published` |
| `topics` / `guidelines` | 是 | 各 1~6 个 kebab-case 标签 |
| `lab` | 是 | `examples/day-XXX/main.cpp` 等可编译路径；RTOS 模拟课程填 `rtos-sim` 并附 `rtos_scenario` |
| `previous` / `next` | 是 | 前一天编号（首课为 `-1`）；`next` 允许指向尚未发布的后一天 |
| `date` / `patterns` | 否 | 发布日期、关联设计模式标签 |

**提交者与 AI 执行者指引：** 新增每日课程时拆成两步——先只写正文 md（不动其他文件），再到 `daily/lessons.meta.json` 追加对应条目并维护 `previous/next`；后续若只改正文（改写、补导读），无需触碰元数据。不要把元数据写回正文，也不要再引入 frontmatter 或新的侧车文件。机器校验由 `scripts/build-content.py --check` 与 `tools/check-course.py` 实现，两者都按本节读取 `lessons.meta.json`；正文渲染时元数据通过 manifest 注入站点。

区① 专题文档（daily 以外的 weekly/patterns/docs/booklets/frameworks 等）仍保留 frontmatter，至少含 `summary` 字段（站点列表摘要使用）。

`topics/` 采用 `topics/<领域>/<主题>/README.md`，实验放同目录 `lab/`；领域名由内容管道映射为展示分类。目录与标题不写序号、版本或日期，一个目录只放一个主题。

## 3. 资源引用规则

1. 正文 md 引用资源一律写**相对路径**，指向 `assets/` 镜像树（例：`references/reading-paths/` 下的 md 写 `../../assets/references/reading-paths/x.jpeg`）。
2. 网站解析器（`src/lib/contentAssets.ts`）按双轨解析：优先 `assets/<内容路径>`，未命中回退原路径——后者仅服务冻结基线。
3. 新增资源必须落 `assets/` 对应镜像目录，禁止与 md 同目录存放。
4. `.deb`、安装包、与内容无引用关系的文件不得进入内容目录。

## 4. 冻结基线例外区

`references/system-design-notes/` 保持迁移原状（94 svg + 94 puml 与 70 md 混排），`assets/` 镜像树不覆盖该目录。`npm run check:migration` 的 SHA-256 证据继续有效；纠错写在导读文章里，不直接改基线文件。

## 5. 部署语义

- `docs/maint/**`、`docs/design/**`、根 `README.md` 的改动**不触发**站点 build/deploy（workflow paths-ignore）。
- 其余内容改动走 `dist/content/**` 内容管道（build-content.py），不重新打包应用代码；应用产物哈希对内容变更保持不变。
