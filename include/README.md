# Include C++ 教学 API 与辅助头文件目录

`include` 目录存放仓库内置教学工具（RTOS 并发模拟器与 C++ 内存可视化工具）所依赖的 C++ 头文件。

## 目录用途

- 为 IDE 与编辑器提供类型声明、宏定义及函数签名，支持语法高亮与代码补全。
- 规范前端解释器（[src/rtos-sim](../src/rtos-sim)）解析 C++ 代码时的语法契约。
- 提供运行期打点（[VIS] JSON 协议），为 C++ 模拟器提供堆栈与对象生命周期的追踪机制。

## 内容结构

```text
include/
├── rtos_sim.h   # RTOS 并发可视化模拟器教学 API 声明
└── visualizer.h # 内存与生命周期追踪分析器宏与辅助类声明
```

### 1. rtos_sim.h

声明 `namespace rtos` 命名空间下的并发原语：
- **任务与调度**：`rtos::thread`、`rtos::this_task`、`rtos::config`。
- **同步与通信**：`rtos::mutex`、`rtos::message_queue`、`rtos::event_group`。
- **定时与中断**：`rtos::timer`、`rtos::isr`。

注意：该头文件仅作声明使用，具体代码由 RTOS 模拟器（`src/rtos-sim/`）在 Web 界面中确定性解释执行，不直接链接目标文件。消费者为 `examples/rtos/*.cpp` 以及 RTOS 模拟器的在线编辑器。

### 2. visualizer.h

提供打点控制与对象生命周期追踪机制：
- **作用域与步骤打点**：`VIS_SCOPE`、`VIS_STEP`、`VIS_STEP_L`。
- **变量与堆内存追踪**：`VIS_VAR`、`VIS_PTR`、`VIS_FIELD`、`VIS_TRACK`。
- **内存拦截与智能指针**：重载全局 `operator new / delete` 并提供 `vis::unique_ptr` 智能指针包装。

通过输出 `[VIS]{"op": ...}` 标准 JSON 行协议，与前端可视化组件通信。

## 使用方式（相关命令）

在源码中包含头文件：

```cpp
// 引入 RTOS 模拟器 API
#include <rtos_sim.h>

// 引入内存可视化打点工具
#include <visualizer.h>
```

校验头文件相关示例与模拟器逻辑：

```bash
# 验证 RTOS 场景与 examples/rtos 下的代码解析
bun test tests/rtos-parser.test.ts

# 运行 RTOS 示例与解析器检查脚本
npx tsx tools/check-rtos-examples.ts
```

## 维护约定

1. **头文件自包含**：每个头文件首部须包含 `#pragma once`，且只依赖 C++ 标准库头文件（如 `<cstddef>`、`<chrono>`、`<iostream>`）。
2. **只保留接口定义**：`rtos_sim.h` 仅包含接口声明，不包含复杂逻辑实现，保持简洁易读。
3. **协议稳定性**：修改 `visualizer.h` 中的 `[VIS]` JSON 输出结构时，须同步更新前端解析器及测试套件（[tests/visualizer-reducer.test.ts](../tests/visualizer-reducer.test.ts)）。
