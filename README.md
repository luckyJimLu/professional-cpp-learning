# Professional C++ Learning

基于 **Marc Gregoire · Professional C++, Sixth Edition（C++23）** 的每日工程化学习仓库。

面向已有 **C / Embedded** 基础的学习者：

> C 思维 → Modern C++ → Professional C++ → Embedded / Systems Engineering

## 在线学习平台

- [Learning Console](https://luckyJimLu.github.io/professional-cpp-learning/)：课程、专题、Lab、代码搜索与学习复盘。
- [RTOS 并发模拟器](https://luckyJimLu.github.io/professional-cpp-learning/rtos.html)：独立的调度与同步机制教学工作台。

| 能力 | 支持内容 |
| --- | --- |
| 课程学习 | 从 Markdown 自动加载课程，沿 Compile Rail 八阶段阅读、练习和复盘 |
| 专题知识库 | 按领域浏览专题，展开完整文章目录；支持中英文文档切换和相对链接跳转 |
| 专题阅读 | 桌面侧边固定文章／章节目录，手机折叠为单列；章节定位、前后篇导航、阅读位置恢复 |
| 浏览器 Lab | Clang/WebAssembly C++23 编辑、编译与运行；支持语法高亮和编译输出 |
| 内存可视化 | 栈、堆与指针关系，轨迹逐步回放；区分预置轨迹、Clang 事件与明确标注的近似模式 |
| RTOS 并发可视化 | 任务调度、同步对象、时间轴、状态机、等待关系与任务栈；支持轨迹回放和 JSON 导出 |
| 内容搜索 | 搜索代码与 Markdown 代码片段，按类型筛选、查看源文件行号；支持 Ctrl/Cmd+K |
| 图表与移动阅读 | Mermaid、PlantUML、代码复制；手机导航抽屉、宽表格局部滚动 |

专题阅读位置保存在当前浏览器，查看文章不会自动计为完成课程。线上功能以已部署版本为准。

## 当前进度

- **已发布：Day 1–55**
- **下一课：Day 56 · Chapter 7 · Memory Management**
- 当前主线：**Chapter 6 已收束；下一课进入 Chapter 7 · Memory Management**
- 更新方式：**GitHub Markdown only**

## 快速入口

- [16 周学习路线](docs/learning-plan.md)
- [Runnable Exercise Audit & Contract](docs/runnable-exercise-audit.md)
- [完整学习进度](progress.md)
- [C++ Design Patterns · 工程化专题](patterns/)
- [设计模式书籍案例 · 23 种经典模式与 C++17 可运行代码](patterns/book-examples.md)
- [Ownership & Smart Pointers](patterns/ownership-and-smart-pointers.md)
- [Asio 框架解构](frameworks/asio/)
- [OpenHarmony · Mini／轻量系统](frameworks/openharmony/README.md)
- [Mini 系统启动流程](frameworks/openharmony/06-mini-system-boot-flow.md)
- [SAMGR Lite 服务、通信与 Feature 协同](frameworks/openharmony/06-samgr-lite-service-communication.md)
- [HarmonyOS Mini / LiteOS-M · C++11 兼容性与异步架构](docs/harmonyos-mini-cpp11-compatibility.md)
- [Zephyr C++20 / ZPP · 嵌入式现代 C++](docs/zephyr-cpp20-zpp.md)
- [RTOS 模拟器机制与实施方案](docs/rtos-simulator/DESIGN.md)
- [TRACE32 · RTOS 稳定性分析](frameworks/trace32/README.md)
- [Utils · 工程实用工具](utils/)
- [Windows Remote Script Runner · Remote-SSH + SCP Hook](utils/windows-remote-script-runner/README.md)
- [Embedded C++ 编码规范索引](guidelines/embedded-cpp-guideline-notes.md)
- [每日课程](daily/)
- [周复盘](weekly/)
- [Mermaid 图表指南](docs/mermaid.md)

## 学习原则

设计模式专题不占用每日 Day 编号；每日课程仍严格按《Professional C++》章节顺序推进。设计模式只用于解释真实变化轴和稳定边界。

核心原则：**先识别变化，再建立稳定边界；先设计 lifetime，再选择 pointer。**

优先 value semantics / composition / 小接口；需要 runtime replacement 时才引入 virtual interface。Embedded 场景持续审计 heap、锁、blocking、callback、registration、flash/RAM 与 WCET 上界。

## 最近课程

- [Day 55 · Chapter 6 Summary and Engineering Exercises](daily/day-055-chapter6-review-exercises.md)
- [Day 54 · The SOLID Principles](daily/day-054-solid-principles.md)
- [Day 53 · Designing a Successful Abstraction](daily/day-053-designing-successful-abstraction.md)
- [Day 52 · Reconciling Generality and Ease of Use](daily/day-052-reconciling-generality-ease-of-use.md)
- [Day 51 · Design General-Purpose Interfaces](daily/day-051-general-purpose-interfaces.md)

## 每日课程结构

每节约 60 分钟：

1. 今日章节与建议阅读范围
2. 昨日复习 3 问
3. 核心概念讲解
4. C 写法 vs Modern C++
5. 设计模式映射：变化轴、稳定边界、Pattern 是否值得使用
6. Embedded / System Design 场景
7. 今日编码规范
8. 可编译 Lab / Runnable Exercise
9. 3 个常见坑与 Pattern 滥用
10. 2 道检查题 + 1 道设计题

代码型“修复 / 重构 / 实现 / 调试”练习必须落成独立 `exercise-XX.cpp`，可以直接编译运行；纯知识问答和纯设计题不强制生成 source。CI 会编译并运行 `examples/day-*/*.cpp` 下的全部 standalone C++ 文件。

每 7 天安排工程化周复盘，并增加 Design Review：变化轴、稳定边界、Pattern 选择、ownership/lifetime 与 overengineering 检查。

## 专题与模拟器

**OpenHarmony Mini／轻量系统**：涵盖 LiteOS-M 功能分层、LOS／CMSIS 接口、启动流程、SAMGR Lite 服务通信和外设组件；提供固定版本来源、校验值与逐符号索引。

**嵌入式 C++ 扩展**：Mini C++11 运行时与异步架构、Zephyr C++20／ZPP、Asio 异步生命周期、TRACE32 稳定性分析，与主线中的 ownership、RAII、接口契约和资源预算对照阅读。

**RTOS 并发模拟器**：使用受限 C++ 子集进行确定性解释执行，观察时间片与抢占、线程生命周期、消息队列、互斥与优先级继承、信号量、条件变量与虚假唤醒、事件组／任务通知、软定时器和 ISR。

## 仓库结构

```text
.
├── README.md
├── progress.md
├── DESIGN.md / UX-CONTRACT.md
├── daily/                       # 已发布课程 Day 1–55
├── weekly/
├── patterns/
├── frameworks/
├── docs/
├── examples/
│   ├── day-XXX/                 # main.cpp 与独立 exercise-XX.cpp
│   └── rtos/
├── include/
├── src/
├── index.html / rtos.html
├── references/system-design-notes/
├── guidelines/
├── utils/
├── tools/
└── tests/
```

## 编码规范基线

- 类型/函数：`PascalCase`
- 变量/参数：`snake_case`；成员：`snake_case_`；常量：`kPascalCase`
- `enum class`、RAII、value semantics、小接口
- required borrow 优先引用；optional borrow 明确 `nullptr`
- 单一 owner 优先；`unique_ptr` 表达 ownership transfer；谨慎 `shared_ptr`
- 实时路径避免无界动态分配；阻塞 API 显式 timeout
- 硬件单位明确、避免 magic number、覆盖边界测试
- `-Wall -Wextra -Wconversion -Wpedantic` + clang-format/clang-tidy/静态分析/单测/CI

## 本地启动与验证

建议使用 **Node.js 24**（与 CI 一致）、npm 和 Python 3。原生示例检查还需要支持 C++23 的 GCC／Clang。

```bash
npm install
npm run dev
npm run lint
npm run check:course
npm run check:migration
npm run check:examples
npm run format:cpp:check
npm run build
```

独立示例检查会把 warnings 视为错误，并设置编译／运行超时；不包含 `examples/rtos/` 的模拟器专用场景。可用 `CXX` 选择编译器，支持的环境中可额外启用内存检查：

```bash
python3 tools/check-examples.py --sanitize
```

浏览器测试：

```bash
npx playwright install chromium
npm run test:e2e
```

课程与专题正文仍以仓库 Markdown 为内容源，Web UI 负责导航、阅读、实验及复盘。设计与交互约定见 [DESIGN.md](DESIGN.md)、[UX-CONTRACT.md](UX-CONTRACT.md) 与 [Learning UX](docs/learning-ux.md)。
