---
summary: 用可控时钟和 Fake Transport 运行 Modem 通道，验证快照、容量、超时、取消、失败与关闭，再映射到异步和 RTOS。
---
# Modem 数据通道：贯穿实验与参考解

前置：Day 8–10 的借用、Day 20 的接口契约、Day 28–35 的对象生命周期，以及 [Chapter 6 评审](chapter-06-review.md)。本实验是伴随项目，不增加 Day 编号，也不提前发布 Chapter 7 课程。

## 1. 本轮交付与边界

完整源码：[starter](../examples/modem-channel-exercise.cpp) · [参考解](../examples/modem-channel-solution.cpp)。两者各有 `main()`，都可独立运行；现有 `tools/check-examples.py` 自动覆盖顶层 `.cpp`。

执行环境为 C++23 主机或兼容的浏览器 Lab；不依赖网络、设备、线程、异常、真实 sleep。通道本体使用固定数组；stdout／标准库运行时的全局分配不在“通道无堆存储”的保证内。Fake Transport 由调用者拥有，必须比 Channel 活得更久，同一 Transport 不得同时交给多个活动 Channel。

## 2. 契约表

| 项目 | 约定 |
| --- | --- |
| 存储 | 最多 2 个占用槽；每条 payload 1–8 字节，自有快照，无 NUL 要求 |
| 排序 | 有效请求按接受 ID FIFO；任一时刻最多一个活动传输 |
| 时间 | 调用者传入非负、单调的 milliseconds；不是实际设备时钟 |
| deadline | timeout 从 Submit 的接受时刻计起，包括排队时间；恰好到截止时优先 timeout |
| Poll | 每次至多返回一个终态；pending 不是成功；过期排队请求不应开始传输 |
| Cancel | 对排队／活动请求都是终态；活动请求先 Abort，再释放槽；重复取消返回 not found |
| Close | 幂等，Abort 当前传输、释放所有槽；后续 Submit／Poll／Cancel 返回 closed |
| ID | 接受请求才分配 ID；不回绕复用；耗尽时显式拒绝 |
| 错误 | invalid argument、invalid time、full、timeout、cancelled、transport error、closed 等保留区分 |

本模型的 Fake Transport Abort 立即完成；真实异步 I/O 的取消通知通常还要回调／排空。移植时不能把立即 Abort 的假设带到 Asio 或驱动层。

## 3. 编译与预期结果

在仓库根目录执行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror -fno-exceptions \
  examples/modem-channel-exercise.cpp -o /tmp/modem-exercise
/tmp/modem-exercise
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror -fno-exceptions \
  examples/modem-channel-solution.cpp -o /tmp/modem-solution
/tmp/modem-solution
```

未修改 starter 的退出码为 0，输出：

```text
Common contract checks passed
Cancellation capacity recovered=0
EXPECTED GAP: cancelled slots still consume capacity
```

参考解的退出码为 0，输出：

```text
Common contract checks passed
Cancellation capacity recovered=1
All channel contract checks passed
```

starter 安全展示逻辑容量泄漏，未执行越界、悬挂解引用或真实设备操作。普通编译运行通过不等于取消契约已满足；必须同时检查恢复容量的输出。不要使用 `-DNDEBUG`。

## 4. 修改任务与判断依据

先不要看参考解：填写 queued／active／terminal／closed 的事件表。运行后观察：Cancel 虽返回 cancelled，但槽仍 marked used，第三条命令被 full 拒绝。

修改目标是使 Cancel 释放对应槽并保持所有正常／错误检查。不得删除断言、忽略 Full、放大容量或让每次提交先清空其他请求。修复后 starter 应输出 `Cancellation capacity recovered=1`，且不再输出 EXPECTED GAP。

答案要点：取消活动请求先停止 Fake 操作并清除活动 ID；排队请求没有活动操作，但同样要释放槽。终态之后不应再由 Poll 返回该 ID。复用空槽不应破坏 FIFO，所以参考解按单调 ID 选择下一个有效请求。

## 5. 行为矩阵与证据

两份源码调用相同的检查函数；参考解额外断言取消容量恢复必须为真。starter 保留打印缺口以让 CI 可以运行其安全基线。

| 检查 | 测试如何触发 | 必须观察 |
| --- | --- | --- |
| 快照 | 提交 AT 后立即将原数组改为 XT | Transport 首次开始时仍看到 AT |
| 容量与长度 | 2 条占满；空输入、9 字节、8 字节 | full／invalid argument 与恰好最大长度分别正确 |
| 时钟 | 先用 0ms，再传 -1ms | invalid time，不产生伪完成 |
| 设备失败 | FailNext 后推进到 ready | transport error，槽释放 |
| 排队 deadline | A 活动 2ms，B 总 timeout 1ms | B 未发出即 timeout，Begin 次数不增加 |
| 截止竞争 | latency 与 timeout 均 2ms | 本模型按约定返回 timeout，且只一次 |
| 取消回收 | 分别取消 queued、active，再提交 C | 两种情况下容量都恢复；活动 Abort 只一次 |
| 关闭与 RAII | 活动时 Close 两次；另建通道后离开作用域 | 每个活动操作仅 Abort 一次，Size 清零 |
| 关闭后访问 | 关闭后再调用三个入口 | closed，不重新开始传输 |

## 6. 跨模块迁移路线

| 阶段 | 对应学习内容 | 迁移时必须重新确认 | 本轮状态 |
| --- | --- | --- | --- |
| 语言与类设计 | 快照、引用借用、RAII、结果类型 | 长度、时间单位和析构责任 | 两份主机程序已交付，结果见验收记录 |
| 模式选型 | [工程工作坊](../patterns/engineering-workshop.md) | 是否真有运行时替换需求，不为 Fake 强行加 Factory | 设计任务与答案已交付 |
| Asio | [异步契约](../frameworks/asio/ASYNC_WORKSHOP.md) | buffer 至 Handler 返回前存活、取消异步完成、线程上下文 | 扩展步骤已交付；未实现同名生产通道 |
| RTOS 模型 | [队列与 ISR 场景](rtos-simulator/LEARNING-GUIDE.md) | 优先级、队列超时、通知与关闭顺序 | 复用现有场景；无一份源码直接跨模型编译的承诺 |
| OpenHarmony | [首次构建](../frameworks/openharmony/07-first-build-lab.md) | 固定内核 API、单位、ISR 合法调用及内存预算 | 尚待选择并验证板卡 |
| 调试交付 | [TRACE32 证据包](../frameworks/trace32/08-case-study.md)、[同步清单](../utils/windows-remote-script-runner/OPERATIONS.md) | 固件／符号 hash、实际故障与主机模型的区别 | 主机解码与操作清单；硬件未验证 |

## 7. 完成条件

保存编译器／commit、两个程序原始输出、修复 diff、行为矩阵及一个新增反例。按 [五项标准](../guidelines/review-rubric.md) 评审；说明真实异步取消与 Fake Abort 的差别。sanitizer 通过可补充存储证据，但不能证明真实并发安全或实时性。
