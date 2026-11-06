# 经典工业级框架与系统工程专题 (Frameworks Index)

面向 C++ 进阶、嵌入式系统与底层工程实践的工业级框架解构与实战专题索引。

## 专题索引

```text
frameworks/
├── asio/           # Standalone Asio 异步网络框架解构与 C++20 协程实战
├── openharmony/    # OpenHarmony Mini/轻量系统 LiteOS-M 内核与系统服务解构
└── trace32/        # TRACE32 嵌入式 RTOS 稳定性分析与 HardFault 现场重建
```

---

### 1. [Asio 异步网络框架专题](asio/README.md)

[Asio 专题入口](asio/README.md) 深入拆解了 C++ 网络编程事实标准 Standalone Asio 的核心架构与执行模型。内容覆盖 Proactor 与 Reactor 模式对比、`io_context` 事件循环与线程池调度、基于 `shared_from_this` 的异步会话生命周期管理，以及 C++20 协程集成。

- **文档映射**：[总体架构 (ARCHITECTURE.md)](asio/ARCHITECTURE.md) | [生命周期实践 (SESSION_LIFECYCLE.md)](asio/SESSION_LIFECYCLE.md) | [事件循环与调度 (EVENT_LOOP_RUNNER.md)](asio/EVENT_LOOP_RUNNER.md) | [异步契约工作坊 (ASYNC_WORKSHOP.md)](asio/ASYNC_WORKSHOP.md)
- **代码示例**：[asio/examples/](asio/examples/)（包含同步/异步/协程 TCP Echo 服务器及 CMake 构建配置）

---

### 2. [OpenHarmony 轻量系统专题](openharmony/README.md)

[OpenHarmony 专题入口](openharmony/README.md) 专注于资源受限设备（L0 / Mini 系统）的源码阅读与架构分析。基于 `OpenHarmony-v5.0.0-Release` 基线，详细剖析 LiteOS-M 内核契约（任务、中断、内存与 IPC）、系统组件与 SAMGR 轻量级服务框架 IPC/PubSub 机制。

- **文档映射**：[01·系统定位与源码地图](openharmony/01-system-overview.md) | [02·内核接口](openharmony/02-kernel-interfaces.md) | [03·组件接口](openharmony/03-system-components.md) | [04·工程指南](openharmony/04-engineering-guide.md) | [05·官方资料](openharmony/05-sources.md) | [06·SAMGR 通信机制](openharmony/06-samgr-lite-service-communication.md) | [06·系统启动链](openharmony/06-mini-system-boot-flow.md) | [07·构建实验](openharmony/07-first-build-lab.md) | [接口索引](openharmony/API-INDEX.md)

---

### 3. [TRACE32 RTOS 稳定性分析专题](trace32/README.md)

[TRACE32 专题入口](trace32/README.md) 围绕 Cortex-M + FreeRTOS 现场保全与故障排查，建立了一套严谨的嵌入式 RTOS 现场重建与诊断流程。核心关注 HardFault 解码、栈溢出与踩内存排查、硬件 Trace 抓取以及将诊断结论映射至现代 C++ 生命周期与 RAII 修复方案。

- **文档映射**：[01·现场保全与离线重建](trace32/01-setup-and-coredump.md) | [02·Fault 与死机定位](trace32/02-fault-and-scheduler.md) | [03·内存与硬件 Trace](trace32/03-memory-and-trace.md) | [04·自动化与 C++ 修复](trace32/04-automation-and-labs.md) | [05·命令速查](trace32/05-reference-and-corrections.md) | [06·PowerView 操作](trace32/06-powerview-operations.md) | [07·官方手册索引](trace32/07-official-manuals.md) | [08·故障解码案例包](trace32/08-case-study.md)
- **辅助脚本与代码**：`scripts/` (CMM 抓取脚本) 与 `fault-decode.cpp`

---

## 示例验证与 CI 接入

各子框架示例代码在本地与 CI 环境中通过不同的工具链进行自动化校验：

- **Asio 独立示例**：通过 CMake 构建并在 CI 中调用脚本校验运行：
  ```bash
  cmake -S frameworks/asio/examples -B build/asio -DCMAKE_CXX_FLAGS="-Wall -Wextra -Wconversion -Wpedantic -Werror"
  cmake --build build/asio -j2
  python3 tools/check-asio-echo.py --bin-dir build/asio
  ```
  该逻辑已集成于 `.github/workflows/web-build.yml` 工作流。
- **TRACE32 & OpenHarmony 示例**：主要作为离线诊断与目标板工程参考，配套脚本与 C++ 文件参与代码格式与静态分析审计。
