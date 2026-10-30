---
summary: 从 Echo 正常路径进入超时、取消、背压与关闭实验，区分预期结果和实际执行证据。
---
# Asio 异步契约工作坊

前置：C++ 生命周期、回调、`error_code`、[Session 生命周期](SESSION_LIFECYCLE.md) 和 [Runner](EVENT_LOOP_RUNNER.md)。示例基线为 Standalone Asio 1.30.2、C++20、主机网络；不使用浏览器 Lab。版本差异见 [环境矩阵](../../docs/lab-environments.md)。

## 1. 先取得正常路径证据

在仓库根目录执行：

```bash
cmake -S frameworks/asio/examples -B build/asio
cmake --build build/asio -j2
python3 tools/check-asio-echo.py --bin-dir build/asio
```

无网络下载条件时，先准备固定 tag 的检出，再传 `-DASIO_ROOT=/path/to/asio`。构建会检查 `asio/version.hpp`，不隐式使用其他安装版本。

烟测逐个启动三个 Echo 程序，在 loopback 上发送二进制分片、核对完整回显、断开后重新连接，并在结束时清理进程。通过只证明这些输入的正常路径；测试清理用的进程终止不是优雅关闭证据。

## 2. 超时与完成竞争

在异步 Echo 的会话中加入 `steady_timer`，与读操作在同一 strand／单线程执行上下文推进。不要假定 `cancel_after` 可在基线中使用。

操作步骤：

1. 先写状态表：reading → succeeded／timed_out／cancelled，terminal 只允许进入一次。
2. 读完成时取消 timer；timer 真正到期且仍在 reading 时请求取消 socket 操作。
3. 两个 Handler 都必须处理正常完成和 `operation_aborted`，并在各自返回前保持所借 buffer 存活。
4. 分别测试立即发送、保持连接不发送、截止附近发送。最后一种不能用一次 wall-clock 结果证明唯一顺序；用可控执行顺序的单元层验证“两种顺序都只完成一次”。

答案要点：取消请求不是“回调已消失”；已经排入执行队列的完成处理仍需检查终态。timer 与 socket 都可能产生回调，不能让两条路径重复释放或重复通知用户。

## 3. 写队列与背压

将待写数据保存在会话自有、具有消息数和总字节上限的队列中。只有一条 `async_write` 链负责发送；当前写入使用的存储在对应 Handler 返回前不得移除或失效。

| 输入 | 预期契约 | 观察证据 |
| --- | --- | --- |
| 正常读写 | 内容完整且顺序一致 | 发送／接收字节序列 |
| 连续提交直到容量满 | 明确 busy／rejected，不无界增长 | 队列长度和字节峰值 |
| 对端停止读取 | 只保证应用队列有界；内核缓冲可能暂时吸收数据 | 应用与 socket 层分别记录，不靠一次 sleep 判断 |
| 对端在发送中断开 | 当前写有错误，后续请求按关闭协议处理 | error、bytes_transferred、完成次数 |

不能把 `bytes_transferred > 0` 等同于整条消息成功。协议分帧与传输回调是两个层次。

## 4. 优雅关闭协议

先拒绝新请求；再选择“有界排空”或“明确取消”，不能同时含糊承诺两种结果。关闭 socket／timer 后继续驱动完成处理，等待持有 Session 的任务结束，最后释放 work guard 并 join 工作线程。

检查：关闭空会话、带待写队列关闭、读阻塞时关闭、关闭两次、关闭后提交。每项记录 Handler 次数、队列剩余数和 Session 析构次数。`io_context::stop()` 只停止事件循环推进，不替代上述协议。

## 5. 从主机通道迁移

[Modem 主机实验](../../docs/engineering-learning-path.md) 使用可控时钟和 Fake Transport。迁移时保留容量、deadline、取消与关闭契约；把 Poll 映射为真实异步完成，并重新处理线程与 buffer 生命周期。主机模型通过不代表 Asio 扩展已经实现。

## 验收记录

正常路径烟测由脚本执行；第 2-4 节是待学习者实现与运行的扩展实验，不能因读完本页标为通过。记录 OS、编译器、Asio revision、配置、输入序列、实际日志和未覆盖竞争顺序。使用 [五项评审](../../guidelines/review-rubric.md) 检查是否存在重复完成、悬挂访问或无界等待。
