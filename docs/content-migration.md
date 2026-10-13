# C++ 内容迁移

来源：本地 `~/Project/system-design-notes`，迁移日期：2026-10-13。

目标：`references/system-design-notes/`。保留原始目录名和文件内容；来源项目保留原件，不进行删除。现有 `books/` 文件未改动。

## 范围

- 33–34：C++ 系统架构、Boost.Asio 深入解读，中英文、PlantUML 源码、SVG 和可执行示例。
- 35–40：Boost.Asio 六章，中英文。
- 41–55：C++ Concurrency in Action 十一章与四个附录，中英文。
- 29：嵌入式工程，包括 RTOS、Modem C++ 架构及相关网络设计。整体保留，以维持 C++ 文档上下文和相对资源链接。
- 31：开发工具，包含 C/C++ 工具链的混合语言文档，整体保留。
- 两本相关 PDF，以及 C++ 示例检查脚本。

共 265 个文件，其中 70 篇 Markdown。`migration-manifest.json` 记录每个源路径、目标路径和 SHA-256；运行 `npm run check:migration` 校验。

## 使用

在“专题”中按主题阅读；双语文档可切换语言。PDF 位于专题导航的“参考书籍”中。图片和示例链接由 Vite 打包，部署后不依赖原仓库。代码搜索覆盖源码文件及 Markdown 内 C/C++ 代码块，支持字面匹配、路径搜索、类型筛选、行号预览和返回原文。

原始内容保留来源信息与外部参考链接。源项目非 C++ 主题的应用路由保留外部跳转；源文档中本已缺失的文档不会凭空补写。

独立示例校验：`npm run check:reference-cpp`，要求 g++、Python 3、timeout 和 Boost 1.83.0。示例内容未改动，版本要求保留。
