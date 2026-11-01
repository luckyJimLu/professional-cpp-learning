# Tools 自动化工具与校验脚本目录

`tools` 目录存放用于代码格式化、课程健康检查、小册子校验、示例编译以及 Slidev 课件生成的 Python 与 TypeScript 工具脚本。

## 目录用途

- 提供 CI 自动化构建与本地开发过程中的静态检查与验证工具。
- 自动化校验 `daily/` 课程文档的完整性与运行契约。
- 校验并编译 `examples/` 示例、`booklets/` 速查小册子与 `slides/` 演示课件。

## 内容结构与 npm 脚本映射

```text
tools/
├── annotate-cpp-standards.py # 自动标注与检查 C++ 标准版本信息
├── check-asio-echo.py       # Standalone Asio 示例回环冒烟测试
├── check-booklets.py        # 校验小册子结构与编译内联自测例子
├── check-course.py          # 课程内容完整性与代码契约检查
├── check-examples.py        # 编译并运行全部独立 C++23 示例
├── check-migration.py       # 校验迁移文件的 SHA-256 哈希完整性
├── check-rtos-examples.ts   # 校验 RTOS 场景示例解析与模拟快照
├── check-slides.py          # 校验 Slidev PPT 课件结构与大纲匹配度
└── format-markdown-cpp.py   # 提取并格式化 Markdown 内嵌 C++ 代码块
```

### 工具脚本与 npm 命令映射表

1. `check-course.py` -> `npm run check:course`
2. `check-examples.py` -> `npm run check:examples`
3. `check-booklets.py` -> `npm run check:booklets`
4. `check-migration.py` -> `npm run check:migration`
5. `check-slides.py` -> `npm run ppt:check` (严格模式: `npm run ppt:check:strict`)
6. `format-markdown-cpp.py` -> `npm run format:cpp` (仅检查: `npm run format:cpp:check`)

## 使用方式（相关命令）

在仓库根目录下可以通过 npm 命令直接发起调用：

```bash
# 检查课程文档结构与 Lab 代码落地点
npm run check:course

# 严格编译运行所有 examples 中的 C++ 代码
npm run check:examples

# 校验 C 与 C++ 小册子结构并编译运行自测程序
npm run check:booklets

# 校验文件迁移 SHA-256 哈希
npm run check:migration

# 格式化所有 Markdown 中的 C++ 代码块
npm run format:cpp

# 校验 Slidev 课件与大纲一致性
npm run ppt:check
```

直接运行单独脚本的示例：

```bash
# 开启 Sanitizer 内存检查模式运行示例校验
python3 tools/check-examples.py --sanitize

# 验证 RTOS 场景 C++ 代码解析与模拟器输出
npx tsx tools/check-rtos-examples.ts

# 运行 Asio 例子冒烟测试
python3 tools/check-asio-echo.py
```

## 维护约定

1. **零外部依赖**：Python 脚本必须依赖标准库，无需安装额外第三方 pip 包。
2. **退出码规范**：检查成功时返回 0，发现任何异常或失败时返回非 0 退出码，方便 CI 捕获。
3. **跨平台兼容**：脚本中使用 `Path(__file__).resolve().parent.parent` 确定相对路径，确保在 Windows 与 Linux 环境下均能正确执行。
4. **忽略临时文件**：`__pycache__` 自动生成的缓存文件不得提交至版本库。
