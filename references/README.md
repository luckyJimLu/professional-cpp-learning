# 参考资料与系统设计笔记 (References)

面向 C++ 系统编程、底层机制与架构设计的参考资料、书籍阅读路径与系统设计笔记。

## 目录结构

```text
references/
├── reading-paths/          # 经典 C++ 书籍封面、阶段阅读路线与机制拓扑图
└── system-design-notes/    # 系统设计笔记、参考电子书与配套验证脚本
    ├── content/            # Boost.Asio 与 C++ 并发编程笔记正文 (27 个章节子目录)
    ├── pdfs/               # 参考电子书 (Boost.Asio Cookbook & Concurrency in Action)
    └── scripts/            # 独立示例代码构建与验证脚本
```

## 模块说明

### 1. 阶段阅读路径 (reading-paths/)

包含经典 C++ 著作的阅读规划、底图与编译/ABI/STL 机制导图：

- **机制与架构笔记**：
  - [Itanium C++ ABI 规范笔记](reading-paths/cpp-compiler-abi.md)：对象布局、虚表结构、名字修饰 (Name Mangling) 与调用约定。
  - [C++ 软件设计笔记](reading-paths/cpp-software-design.md)：设计模式、解耦与现代 C++ 软件架构。
- **机制与架构拓扑图**：
  - [C++ 高级编译流程图](reading-paths/advanced-cpp-compiling.jpeg)
  - [C++ 反汇编与逆向分析](reading-paths/cpp-disassembly-reverse.jpeg)
  - [ELF 链接机制全景图](reading-paths/elf-linking-overview.jpeg)
  - [GCC STL 源码架构全景图](reading-paths/stl-source-gcc-overview.jpeg)
- **书籍封面与阅读导航图**：
  - [Effective Modern C++](<reading-paths/Effective Modern C++.png>)
  - [C++ Templates: The Complete Guide](<reading-paths/C++ Templates: The Complete Guide.jpeg>)
  - [Programming with C++20](<reading-paths/Programming with C++20.jpeg>)
  - [Itanium C++ ABI 官方规范图](<reading-paths/Itanium C++ ABI 官方规范.jpeg>)
  - [编译器设计](reading-paths/编译器设计.jpeg)

> **图表格式迁移说明**：核心架构机制图（编译、反汇编、ELF 链接、STL 源码）已由原矢量 SVG 格式更新为高清晰度 JPEG 格式（`advanced-cpp-compiling.jpeg`、`cpp-disassembly-reverse.jpeg`、`elf-linking-overview.jpeg`、`stl-source-gcc-overview.jpeg`），提升不同终端的预览兼容性。

### 2. 系统设计笔记 (system-design-notes/)

围绕 **Boost.Asio 异步网络库** 与 **C++ Concurrency in Action 并发编程** 的深度解构笔记：

- **content/**：按主题划分为 27 个子目录（包含 `29. embedded-systems`、`31. Development Tools`、`33. Cpp System Architecture`、`34`–`40` Boost.Asio 章节及 `41`–`55` C++ Concurrency 章节）。
- **pdfs/**：参考参考书 PDF 文件（包含 *Boost.Asio C++ Network Programming Cookbook* 与 *C++ Concurrency in Action*）。
- **scripts/**：提供 `check-cpp-examples.sh` 校验脚本。

## 自动化验证与 CI 校验

系统设计笔记中的 C++ 示例可通过以下命令在本地执行自动化编译校验：

```bash
npm run check:reference-cpp
```

该命令调用 [references/system-design-notes/scripts/check-cpp-examples.sh](system-design-notes/scripts/check-cpp-examples.sh)，在临时目录中利用 `g++` (C++20) 与 Boost 1.83.0 验证笔记内示例代码的编译正确性。在 `.github/workflows/web-build.yml` CI 工作流中，环境会自动安装 `libboost1.83-dev` 并运行此检查。
