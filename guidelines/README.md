# Guidelines 编码与评审规范

本目录包含仓库的 C++ 编码规范、嵌入式工程实践与代码评审标准。所有规范均围绕真实变化轴、资源生命周期与硬实时边界展开。

关于仓库的通用编码约定，请参阅根目录 [编码规范基线](../README.md#编码规范基线)。

## 规范文件与使用场景

### 1. 日常编码与风格约定

[google-cpp-style-guide.md](google-cpp-style-guide.md)

- **涵盖内容**：以 Google C++ Style Guide 为主要参考，结合 C++ Core Guidelines，涵盖文件组织、命名规范、接口设计、RAII 资源管理、错误模型与现代 C++ 特性取舍。
- **使用场景**：编写日常课程代码、设计新模块公开接口、配置 clang-format/clang-tidy 静态检查以及提交前的自我审查。

### 2. 嵌入式与系统工程规范

[embedded-cpp-guideline-notes.md](embedded-cpp-guideline-notes.md)

- **涵盖内容**：面向嵌入式与系统级 C++ 的工程规范索引，涵盖值语义、小接口设计、SOLID 原则在嵌入式中的应用、无界分配与阻塞调用限制、ISR 边界及硬实时红线。
- **使用场景**：受限资源环境（如 RTOS / Bare-Metal / Modem）的系统设计、硬件接口封装以及嵌入式架构评审。

### 3. 代码评审与质量打分

[review-rubric.md](review-rubric.md)

- **涵盖内容**：提供正确性、契约、生命周期、资源上界与验证证据五项人工评审标准（各 0 到 2 分），并列出常见错误写法与推荐解法对照表。
- **使用场景**：每日课程练习复盘、设计模式工作坊、章末评审以及工程案例重构时的质量把关。

## 使用建议

编写代码时先以 [Google 风格导读](google-cpp-style-guide.md) 保证可读性与接口安全；涉及资源受限或实时场景时，对照 [嵌入式规范索引](embedded-cpp-guideline-notes.md) 检查所有权与上界；完成代码后，使用 [五项评审标准](review-rubric.md) 进行打分和验证。
