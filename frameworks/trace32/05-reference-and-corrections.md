# 05 · 命令速查、附件勘误与参考资料

[上一单元](04-automation-and-labs.md) · [专题首页](README.md)

## 1. 命令速查

以下为操作导航，不能跳过正文的架构与状态前提。数值显式使用 `0x`；PRACTICE 十进制计数使用 `3600.`，`Var.*` 高级语言表达式则遵循 C/C++ 语义。

| 目的 | 命令 / 操作 | 验证 |
|---|---|---|
| 显示当前寄存器 | `Register.view` | 当前核心与虚拟任务视角正确 |
| 保全现场后仅载符号 | `Data.LOAD.Elf "firmware.elf" /NoCODE` | PC 与 RAM 不因加载而改变 |
| 保存固定内存段 | `Data.SAVE.Binary "sram.bin" D:0x20000000--0x2003FFFF` | 文件长度与 map 相符 |
| 读取 32 位数据 | `PRINT Data.Long(D:0xE000ED28)` | 正确核心、地址域与可读状态 |
| 离线叠加 Dump | `Data.LOAD.Binary "sram.bin" D:0x20000000 /NoClear` | 已处于独立模拟器 |
| 离线设寄存器 | `Register.Set PC 0x08001234` | 真实采集值、仅离线会话 |
| FreeRTOS 感知 | `TASK.CONFIG ~~/demo/arm/kernel/freertos/freertos.t32` | ELF 内核布局匹配 |
| FreeRTOS 任务表 | `TASK.TaskList` | 名称、magic 与任务数合理 |
| NuttX 任务表 | `TASK.Task` | 使用 NuttX 专用扩展 |
| 切换观察任务 | `Frame.TASK 0x20002000` | 真实 task magic，不是猜测地址 |
| 返回当前硬件任务 | `Frame.TASK` | 采集硬件寄存器前恢复 |
| 调用栈 / 局部变量 | `Frame.view /Locals /Caller` | 优化与帧缺失情况已注明 |
| 栈填充模式 | `TASK.STacK.PATtern 0xA5` | 与实际初始化一致 |
| 栈使用视图 | `TASK.STacK` | 每任务边界与真实大小一致 |
| 写观察点 | `Break.Set D:0x20002000--0x20002003 /Write /Onchip` | `Break.List` 显示正确覆盖 |
| 条件支持的数据追踪 | `Var.Break.Set g_system_health_magic /Write /TraceData` | IP、许可与数据通道支持 |
| Trace 列表 | `Trace.List` | 代码镜像、同步与丢包状态 |
| 审计插桩堆 | `Data.AllocList /SumCaller` | 目标端已提供兼容审计结构 |
| 调试 PRACTICE | `PEDIT` / `PSTEP` / `PLIST` / `PMACRO.list` | 不与目标 C/C++ 单步混淆 |

访问范围是闭区间；`start++offset` 的长度为 `offset + 1`，例如 `0x20000000++0x3FFFF` 对应 `0x40000` 字节。为减少误差，本专题脚本使用起止地址。

## 2. 对附件的工程校正

附件有少量残留 `[span_...]` 标记、损坏代码行、平台示例与通用结论混杂。这里保留其分析主线，重新编写步骤和模板，不直接复制损坏脚本。

| 附件位置（PDF 页序） | 容易造成的误解 | 本专题处理 |
|---|---|---|
| 第 1-2 页：后台访问与物理访问 | DAP / E: / AD: 自动意味着一致、零影响 | 分开说明地址空间、访问通道、Cache 与时刻 |
| 第 3 页：离线现场 | 有 Dump 即可 100% 恢复 | 列出缺失寄存器、代码、页表、外设与时间边界 |
| 第 3 页：`/NOCLEAR` | 能阻止 ELF 写入在线现场 | 在线仅加载符号用 `/NoCODE`；离线先代码后 Dump |
| 第 3-4 页：FreeRTOS 栈大小 | 只能找 `usStackDepth`，或全用最小栈即可 | 支持 `pxEndOfStack` 的配置；逐任务确认边界 |
| 第 7 页起：异常帧 | 任何当前 SP 都能按 8 个字读 PC | 区分入口 EXC_RETURN、MSP/PSP、FP、对齐与嵌套 |
| 第 7-8 页：BFAR | PRECISERR 时可以无条件使用 BFAR | 必须检查 BFARVALID；先保存原始位 |
| 第 7 页：关闭写缓冲 | 所有 Cortex-M 通用解决方案 | 限定实现、引用核心手册、仅作对照实验 |
| 第 11-13 页：堆保护字节 | HEAD / TAIL 足以锁定责任人 | 只作为损坏位置线索，仍追首次非法写入 |
| 第 13-16 页：观察点与 Trace | 单核 DWT 能抓所有 DMA / 跨核访问 | 列出可见性边界和替代证据 |
| 第 14-15 页：Trace 端口脚本 | pinmux / 电压 / 频率可跨板照抄 | 移除固定外设写入，改用官方 SoC 示例 |
| 第 18-19 页：无人值守脚本 | 读取普通 C 变量就是后台一致快照；超时即通过 | 仅观察 run state，采集停机快照，不自动宣告通过 |
| 第 20 页：固件构建与异常接管 | Linux 配置宏普适 RTOS；故障一律关闭看门狗 | 按 RTOS / port 与产品恢复策略配置 |

页码为附件阅读器页序，个别主题跨页；具体操作应以本专题的适用范围与安装版帮助为准。

## 3. 参考资料与使用顺序

本专题为原创工程化整理；附件是需求输入，不作为每条硬件结论的唯一依据。外部命令于 2026-10-16 编写时核对，安装版、port 与 SoC 仍需现场确认。

1. [Lauterbach · OS Awareness Manual FreeRTOS](https://www2.lauterbach.com/pdf/rtos_freertos.pdf)：Configuration、Hooks & Internals、Task Stack Coverage、Task Context Display。用于核对符号依赖、栈配置与任务视图。
2. [Lauterbach · FreeRTOS 栈覆盖不完整排查](https://support.lauterbach.com/kb/articles/freertos-task-stack-does-not-show-a-complete-stack-coverage)：栈大小自动识别与配置问题。
3. [Lauterbach · OS Awareness Manual NuttX](https://www2.lauterbach.com/pdf/rtos_nuttx.pdf)：Supported Versions、Configuration 与 NuttX Commands。先核对实际支持的内核版本。
4. [Lauterbach · General Commands Reference Guide B](https://www2.lauterbach.com/pdf/general_ref_b.pdf)：Break.Set、片上断点、数据访问断点与侵入性。
5. [Lauterbach · General Commands Reference Guide D](https://www2.lauterbach.com/pdf/general_ref_d.pdf)：Data.LOAD、Data.SAVE、数据读取与分配审计；不能以选项名称猜测行为。
6. [Lauterbach · ELF 加载行为说明](https://support.lauterbach.com/community/view/what-happens-behind-the-scene-when-running-d-load-to-load-an-elf-file)：代码 / 数据、符号与寄存器的加载区别。
7. [Lauterbach · HARDERROR / FIFOFULL / FLOWERROR](https://support.lauterbach.com/kb/articles/harderrors-fifofulls-and-flowerrors-in-the-trace)：链路、带宽与代码解码错误的区分。
8. [Arm · AN209：Using Cortex-M3/M4/M7 Fault Exceptions](https://documentation-service.arm.com/static/61084e4a3d73a34b640e31eb)：异常状态、堆栈与不同核心能力；配合具体核心 TRM 使用。
9. [Arm · Cortex-M4 Devices Generic User Guide](https://documentation-service.arm.com/static/5f2ac4ab60a93e65927bbdbf)：EXC_RETURN、异常栈帧、CFSR 与地址有效位。

## 4. 板级适配清单

- [ ] CPU 型号、大小端、FPU、TrustZone、安全域和多核拓扑明确。
- [ ] attach 不复位，停止时的看门狗 / DMA / 外设行为已验证。
- [ ] ELF 与运行镜像相同，内核结构与源码可定位。
- [ ] `.cmm` 每个命令在安装版 Help 确认，寄存器命名正确。
- [ ] 已验证 SRAM 范围、输出目录、文件大小与失败分支。
- [ ] 异常入口和 EXC_RETURN 保存方式已核实。
- [ ] 写观察点范围、初始化时机与硬件比较器资源已核实。
- [ ] Trace 源、sink、带宽与停止联动已验证；关键区间无丢失。

返回：[专题首页](README.md)。
