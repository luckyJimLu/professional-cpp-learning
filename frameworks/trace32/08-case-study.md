---
summary: 使用合成 CFSR 快照演练证据、假设、反证和回归，板端命令与故障根因保持待验证状态。
---
# 08 · 故障案例包：从合成快照到修复证据

前置：[现场保全](01-setup-and-coredump.md)、[异常与调度](02-fault-and-scheduler.md)。本案例只运行主机解码器；未连接 TRACE32、未访问寄存器，也不声称复现了真实设备故障。

## 1. 案例输入与观察

合成快照：CFSR=`0x8200`，BFAR=`0x60000010`，MMFAR=`0`。运行仓库中的解码器：

```bash
g++ -std=c++20 -Wall -Wextra -Wconversion -Wpedantic -Werror \
  frameworks/trace32/fault-decode.cpp -o /tmp/fault-decode
/tmp/fault-decode
```

预期输出：

```text
precise: valid BFAR=0x60000010
imprecise: BFAR unavailable
all decoder checks passed
```

代码同时断言：无有效位时不报告地址；有精确／非精确标志时分别保留；栈入／出栈及 lazy FP 保存错误使帧不可靠。它不会根据任意整数地址直接解引用异常帧。

## 2. 证据—结论—限制

| 证据 | 可以得出的结论 | 不能得出的结论／反证需求 |
| --- | --- | --- |
| 0x8200 含 PRECISERR 与 BFARVALID | 此输入报告精确总线错误与有效 BFAR | 不足以证明 use-after-free、DMA 或某源码行为 |
| 0x400 仅含 IMPRECISERR | 非精确错误；解码器不提供有效总线地址 | 不能拿任意 BFAR 值作为出错地址 |
| 帧相关错误位出现 | 异常帧存在不可靠风险 | 不应直接把读出的 PC／LR 当可信回溯 |
| 镜像与 ELF hash 匹配 | 符号解释有明确构建依据 | 仍不能证明异常帧本身未损坏 |

标志也可能由多次事件累积；板端需记录读取／清除时机。CFSR 解码只是定位链的一环。

## 3. 三个竞争假设

1. **非法 MMIO／外设访问。** 对照所选芯片地址映射、访问宽度和时钟／权限状态。
2. **已失效对象或缓冲区。** 对照分配释放账本、回调与 owner 的时间线；要证明生命周期关系，不能只看一个异常地址。
3. **较早的内存破坏。** 受害地址可能不是首次破坏位置；结合写观察点、受控日志和复现输入缩小首次错误操作。

主机合成输入不能区分这三种根因。真实案例应给每个假设列出支持与反对证据；若没有证据，保留“未确定”。

## 4. 修复与回归怎样闭环

若证据指向“取消后回调使用已销毁对象”，修复应声明 owner、取消和排空协议；不能仅把某个裸指针置空。若指向 MMIO，应修正访问条件和地址，而不是引入 shared_ptr。

主机对照可先做 [Modem 贯穿实验](../../docs/engineering-learning-path.md)：它验证取消、清理和重复关闭的逻辑，不模拟 HardFault。板端回归仍需原复现输入、边界输入、压力／故障注入和无故障对照，观察是否出现新的资源泄漏或丢消息。

## 5. 可复制的案例目录

```text
case-id/
  context.md        # 硬件、工具、构建和复现输入
  manifest.json     # ELF／固件／配置 hash；不是伪造的真实记录
  raw/              # 原始日志、寄存器、dump，只读保留
  analysis.md       # 观察、假设、反证及结论置信范围
  fix.md            # 修复 commit、变更的契约、影响面
  regression.md     # 原输入、边界／失败用例和实际结果
```

本轮只提供结构和合成数据，没有附假想的设备 dump 或硬件“通过”截图。完成实际案例后记录目标适用性，再使用 [评审标准](../../guidelines/review-rubric.md) 复核。
