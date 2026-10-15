# 01 · 接入、现场保全与离线重建

[专题首页](README.md) · [下一单元：故障与调度](02-fault-and-scheduler.md)

## 1. 准备一次可重复的调试会话

目标：在不复位、不下载程序的前提下，将一台故障板变成可离线分析的证据包。

### 1.1 开始前填写配置卡

| 项目 | 获取位置 | 示例 / 要求 |
|---|---|---|
| SoC / 核心 / 核号 | 原理图、芯片手册 | Cortex-M4，core 0 |
| TRACE32 版本 / 许可 | Help / About、License | 保存完整版本信息 |
| RTOS / port / ABI | 构建清单 | FreeRTOS 内核版本、编译器、浮点 ABI |
| 固件身份 | CI 产物、设备版本 | git SHA + build ID + ELF SHA-256 |
| SRAM / Flash 范围 | linker map、芯片手册 | 每段起止地址及字节数 |
| 调试口 / 复位 / 看门狗 | BSP、板级连接脚本 | attach 是否复位、暂停后外设行为 |
| Cache / MPU / DMA | BSP 与芯片配置 | 启用状态、DMA buffer 地址 |
| 可用 Trace | 芯片与板卡设计 | ETM / ITM / SWO / 并行口 / 片上 sink |

示例地址只适用于本教程假想开发板：SRAM 为 `0x20000000..0x2003FFFF`，共 `0x40000` 字节。实际操作必须使用自己的 map；不是所有 Cortex-M 都有这一段完整 SRAM。

### 1.2 固件与符号归档

保留原优化等级的 `.elf`、`.map`、源码提交、RTOS 配置、编译器版本和 linker script。首先分析故障固件；需要 `-Og -g` 做对照实验时，另建构建身份，不混用 ELF。DWARF、LTO、内联、尾调用会影响变量和调用栈可见性。

```bash
sha256sum firmware.elf firmware.map
arm-none-eabi-readelf -n firmware.elf
arm-none-eabi-readelf -S firmware.elf
arm-none-eabi-nm -n firmware.elf > firmware-symbols.txt
```

预期：有调试信息，代码与 RAM 地址符合当前版本的 map。没有 build ID note 时使用 CI 构建编号、固件内版本字段与哈希共同标识，不能因此认定 ELF 错误。

## 2. 在线接入：先确认连接脚本做了什么

1. 保留已有会话；新连接前检查 BSP 提供的 `.cmm`。
2. 选择厂商支持的 attach 流程。`SYStem.Up` 常涉及复位；不能把通用初始化脚本用作现场保全脚本。
3. 若 CPU 正在运行，先记录状态；确需停机取证时执行 `Break`，并记录该操作改变了调度与外设时序。
4. 若目标已停机，不执行 `Go`、单步、复位、寄存器写入或清故障位。
5. 在 `Register.view` 保存寄存器，再加载同版本 ELF 的符号。

```text
Register.view
Data.LOAD.Elf "C:/case/build/firmware.elf" /NoCODE
Data.List
Frame.view /Locals /Caller
```

`/NoCODE` 避免把 ELF 代码 / 数据写回目标。`/NoClear` 主要用于保留已加载内容，不能替代 `/NoCODE` 来保证“不写目标内存”。

**预期结果：** 原始 PC 数值不变，符号能定位到合理函数。若源码打不开，先修正构建路径到本机源码的映射；不要因此重新下载固件。若代码反汇编和 ELF 不符，优先确认版本、重定位、安全域与实际代码内容。

## 3. 访问类与 Cache：明确自己读到了什么

| 形式 | 使用目的 | 操作边界 |
|---|---|---|
| `D:` / `P:` | 数据 / 程序视图 | 语义还依赖架构、地址空间与当前配置 |
| `E:` | 受支持的运行期访问 | 先在 CPU 设置中验证 MemAccess 能力 |
| `A:` 等物理访问类 | 需要物理地址视图 | 具体组合与 Cache 行为查架构手册 |
| `VM:` | 调试器主机虚拟内存 | 与目标 RAM、模拟器内存不可混为一谈 |

不要为了看到“更新的值”先做 Cache clean / invalidate：这会改变证据。先记录 CPU 视图、DAP 视图、Cache 配置与各自时间。运行期多个字段分别读取，可能来自不同调度时刻；低频一致快照应由目标端设计版本号或冻结协议。

DAP 不暂停核心并不代表零总线负载；部分 Cortex-A/R 等平台 DAP 通常不保持 Cache 一致。详细依据见 [官方 FreeRTOS 手册 Configuration](https://www2.lauterbach.com/pdf/rtos_freertos.pdf)。

## 4. 保存证据包

推荐每次创建独立目录，例如 `cases/board07-20261016T090000/`，输出前缀不得复用。

```text
Data.SAVE.Binary "C:/case/board07-20261016T090000/sram.bin" D:0x20000000--0x2003FFFF
```

预期文件大小：`end - start + 1 = 262144` 字节。闭区间写法避免 `++` 的 offset 与字节数混淆。若读取失败，按 map 拆成可读分段，并记录空洞；不能用零填充后宣称它是设备原始数据。

最小证据包包含：

| 文件 | 内容 |
|---|---|
| `manifest.md` | 版本、板卡、触发步骤、核心、安全域、采集时间、操作记录 |
| `registers.txt` | 原始全部通用寄存器及 MSP / PSP / CONTROL / xPSR；异常入口 EXC_RETURN 如可获取 |
| `fault.txt` | 原始 CFSR / HFSR / MMFAR / BFAR、有效位解释、复位原因 |
| `sram-*.bin` | 每段 base / end / size / SHA-256 / 访问类 |
| `firmware.elf` 等 | 同版本构建产物，或其可获取的不可变归档位置 |
| `trace.*` | 如有，保存原始 Trace 与配置；文本导出仅作补充 |

Cortex-M3/M4 的基础寄存器读取：

```text
Data.dump D:0xE000ED28--0xE000ED3F
```

这里覆盖 CFSR、HFSR、DFSR、MMFAR、BFAR 和 AFSR。Cortex-M0/M0+ 不能照搬；复位原因寄存器按芯片手册读取，注意 read-to-clear 副作用。

## 5. 离线恢复：单独会话，保持原始文件只读

### 5.1 必须满足的输入条件

CPU 型号、字节序、内存映射、同版本代码镜像、Dump 基址与原始寄存器明确。缺失 Flash / 外部 RAM / TCB / 页表时，标明分析范围。Dump 不会自动提供未采集的硬件状态。

### 5.2 顺序与命令

在**独立 Simulator 会话**按其芯片示例完成 CPU 与内存配置。不要把这一步的 `SYStem.RESet` 等初始化命令发给在线故障板。

```text
; 仅在已配置的离线模拟器中执行
Data.LOAD.Elf "C:/case/build/firmware.elf"
Data.LOAD.Binary "C:/case/sram.bin" D:0x20000000 /NoClear
; PC / SP / LR 必须替换成真实采集值，不是下面的演示数值
Register.Set PC 0x08001234
Register.Set SP 0x20001000
Register.Set LR 0x08005679
Data.List
Frame.view /Locals /Caller
```

这里先加载代码镜像，再用 Dump 覆盖 RAM；后续补充 ELF 符号时使用 `/NoCODE /NoClear`。若 ELF 不含实际代码，需另加载对应 Flash 镜像。恢复完整寄存器时还包括 R0-R12、MSP、PSP、xPSR、CONTROL 等，名称与可写性按模拟器版本确认。

**当前 handler 上下文**和**故障前任务上下文**分开保存。切换到异常栈帧分析时，使用其 stacked PC / LR / R0-R3 / R12 / xPSR，并计算正确的故障前 SP；不能把 handler 的 MSP 直接当任务 PSP。具体见下一单元。

离线会话用于查看证据，不执行 `Go` 试图重演真实外设。恢复不了调用栈时，先检查代码、栈范围、优化、异常帧与缺失寄存器，不能用“栈坏了”概括全部失败。

## 6. 接入 RTOS Awareness

### 6.1 FreeRTOS

加载内核符号后：

```text
TASK.CONFIG ~~/demo/arm/kernel/freertos/freertos.t32
MENU.ReProgram ~~/demo/arm/kernel/freertos/freertos.men
TASK.TaskList
TASK.STacK
```

`~~` 是 TRACE32 安装路径。目录布局、SMP 支持与具体 port 以当前安装包示例为准。任务列表应能对应固件里的任务名、优先级与当前 TCB。

选中任务后，使用其 **magic / TCB 地址**查看上下文：

```text
; 演示地址，先用任务表确认真实 magic
Frame.TASK 0x20002000
Frame.view /Locals /Caller
Frame.TASK
```

最后一行返回真实当前任务视图。切换只是调试器观察视角，不调度任务；继续执行将回到硬件真实上下文。

### 6.2 NuttX

使用安装版 `demo/arm/kernel/nuttx` 对应示例，不能将 FreeRTOS 的 TCB 布局、配置宏与命令直接迁移。

```text
TASK.CONFIG ~~/demo/arm/kernel/nuttx/nuttx.t32
TASK.Task
```

核对 NuttX 版本、SMP、protected / flat / kernel build、内核与用户 ELF 是否齐全；只采一段内核 RAM 不一定能还原用户任务。官方扩展依赖内核符号与结构定义；老版本手册所列 `g_readytorun` 不能当所有新版本的固定接口。

## 7. 失败分支与验收

| 现象 | 优先排查 | 下一步 |
|---|---|---|
| 连接后故障消失 | 脚本复位、下载、看门狗冻结 | 重做 attach-only 流程 |
| 任务列表为空 / 乱码 | 版本、内核符号、启动阶段、TCB 损坏 | 核对真实结构，不盲配偏移 |
| 在线与 Dump 值不同 | Cache、时刻、地址域、采集原子性 | 明确每份证据的视角 |
| 离线找不到调用者 | 缺代码 / 栈、优化或帧被破坏 | 转反汇编与有限栈扫描，标注不确定性 |

- [ ] 未复位 / 重新下载故障板。
- [ ] Dump 字节数与 map 一致且已计算哈希。
- [ ] 能在独立会话识别相同 PC、代码与至少一段有效栈。
- [ ] 缺失内容和调试器引入的变化已记录。
