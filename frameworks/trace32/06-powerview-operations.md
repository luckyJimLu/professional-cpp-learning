# 06 · PowerView 界面操作与常用命令

[专题首页](README.md) · [命令速查与参考资料](05-reference-and-corrections.md) · [官方手册目录](07-official-manuals.md)

## 1. 先认识界面，不急着点运行

打开 PowerView 后先确认底部 **State Line** 的核心状态，再看 **Message Line** 是否报告错误。底部 **Command Line** 可以直接输入下面命令，输入过程中 Softkeys 会列出可用参数。

菜单名称随版本、架构和加载的 `.men` 改变。以下保留可确认的常见菜单路径；不同界面找不到同名项时，使用右列命令打开窗口，再通过本机 Help 核对，不根据图标位置猜测。

| 目标 | 界面入口 / 动作 | 等价命令或窗口 |
|---|---|---|
| 查看连接与 CPU 配置 | `CPU > System Settings`，查看 CPU、Mode、Option | `SYStem` 窗口 |
| 停止运行 | 工具栏 Break 或 `Run > Break` | `Break` |
| 继续运行 | 工具栏 Go | `Go` |
| 源码 / 汇编 | `View > List Source` | `Data.List` |
| 调用栈 | `Var > Show Stack` | `Frame.view /Locals /Caller` |
| 内存 | `View > Dump`，输入地址或符号 | `Data.dump D:0x20000000` |
| 寄存器 | 命令行打开后查看 PC、LR、SP 与状态 | `Register.view` |
| 变量观察 | `Var > Watch` 或 `Var > View` | `Var.Watch` / `Var.View` |
| 查看全部断点 | `Break > List` | `Break.List` |
| 脚本运行 | `File > Run Script` | `DO "C:/work/script.cmm"` |
| 查找板级示例 | `File > Search for Script` | 在安装目录 demo 中选匹配平台 |
| 本机架构手册 | `Help > Processor Architecture Manual` | 当前 CPU 的本机帮助 |

Go、Step 与 Break 都会改变现场 / 时间进程；先完成采集，再按实验方案操作。连接窗口中 **Up 通常复位，Attach 用于连接已运行核心**，还需检查板级脚本是否额外初始化。

## 2. 一次 HardFault 的窗口操作顺序

### 2.1 连接与查看

1. 检查 System Settings 中 CPU 型号与目标核心；使用已经验证的 attach 配置。
2. 看到 stopped 后，先打开 `Register.view`，把当前 PC / LR / MSP / PSP / xPSR 存入记录。
3. 命令行输入 `Data.LOAD.Elf "C:/case/firmware.elf" /NoCODE`。不要在现场直接用默认 Load File 重新写程序。
4. 打开 `Data.List` 与 `Frame.view /Locals /Caller`。记录当前帧；此时可能仅看到 handler。
5. 用 `Data.dump` 查看故障状态与原始栈内存，再按 [异常帧操作步骤](02-fault-and-scheduler.md) 找 stacked PC。
6. 输入 `Data.List <真实stacked_PC>`，以混合源码 / 汇编视角核对访问指令。

### 2.2 窗口里重点看什么

| 窗口 | 重点 | 不要误读 |
|---|---|---|
| Register | 核心、PC、SP、LR、模式与状态 | 当前 LR 不一定仍是入口 EXC_RETURN |
| List | 地址、指令、源代码、PC 标记 | 一行 C++ 可能对应多条指令 |
| Frame | 调用者、局部变量、能否展开 | 优化可能让局部变量 unavailable |
| Dump | 左侧地址、字节序、显示宽度、原始值 | Long 数值与 ASCII 的字节顺序可能不同 |
| Var | 类型、指针地址、长度、成员 | 指针非空不等于对象仍存活 |

数据窗口中双击值可能进入写入编辑；取证时不要提交编辑。查看字段使用展开 / 选择操作，变更数值仅在独立实验中进行。

## 3. 常用命令：按任务复制

### 3.1 源码、符号、变量

```text
Data.List HardFault_Handler
Var.View g_system_health_magic
Var.Watch g_system_health_magic
PRINT Data.Long(D:0x20001018)
```

符号不存在时，先核对 ELF、静态局部作用域、C++ 命名空间与优化情况。`Data.Long()` 返回原始 32 位值，不会替你证明地址属于有效对象。

List 窗口的 Mode 用于切换 HLL / MIX；单步时粒度会随显示模式改变。仅在已保存现场的复现实验里尝试 Step、Step Over、Go Up 等工具栏动作，并观察哪一条机器指令真正访问内存。

### 3.2 断点与写观察点

- 在 List 的代码左侧空白处双击可切换程序断点；设置后到 `Break.List` 核对 Method。
- 对变量右键的 `Breakpoints > Write` 可建立写监控；整个数组可能消耗多个比较器，优先监控最小可疑字段。
- 在 Break.List 查看地址范围、Program / Write、ONCHIP / SOFT、enabled 与命中情况。

```text
Break.Set HardFault_Handler /Program /Onchip
Var.Break.Set g_system_health_magic /Write /Onchip
Break.List
```

在断点列表中编辑 / 禁用自己本次添加的项，保留其他团队断点。不要为了“重新配置”直接执行 `Break.RESet`；程序断点也不要无意退化成修改代码的 SOFT 实现。

### 3.3 保存内存与恢复窗口布局

```text
Data.SAVE.Binary "C:/cases/run03/sram.bin" D:0x20000000--0x2003FFFF
STOre "C:/cases/layout.cmm" Win NoDate
```

先建立输出目录。布局脚本只解决窗口排列，不能代替固件、寄存器与 Dump 归档。重新打开布局前检查文件内容，避免混入初始化目标的命令。

## 4. RTOS 任务表的操作

1. 用 `TASK.CONFIG` 加载匹配扩展，FreeRTOS 可再加载对应 `.men` 菜单。
2. 执行 `TASK.TaskList`（FreeRTOS）或 `TASK.Task`（NuttX），以名称定位任务，记录 magic、状态与优先级。
3. 选择任务后使用表格支持的上下文菜单查看资源；菜单不同则直接输入 `Frame.TASK <magic>`。
4. 在 Frame 窗口检查它在等哪个内核服务，返回 List 找业务调用点。
5. 执行 `Frame.TASK` 返回硬件当前上下文后，再做寄存器采集。
6. `TASK.STacK` 中先验证栈边界与总大小，再解释最大占用；缺项按 [栈大小排查](03-memory-and-trace.md) 处理。

**练习：** 选一个正常等待消息的任务，记录“任务 → 等待对象 → timeout → 谁会发送消息”；再对业务无响应任务填同一张表，比较差异。

## 5. Trace 窗口的操作

先用芯片对应官方示例完成源与 sink 配置，再打开 `Trace.List`。需要设置接收端时，通过当前安装版 Trace 配置窗口检查 IP、采集方法、触发与缓冲；本教程不提供跨 SoC 通用 pinmux。

1. 先录已知循环，确认地址、符号和时间方向。
2. 找异常触发附近记录，向前检查控制流与支持的数据访问事件。
3. 用窗口的查找功能检索 HARDERROR、FIFOFULL、FLOWERROR；发现缺口先标记不可信区间。
4. 若有相关 PC / 数据列，核对它来自实际采集，不能把源码推断值当硬件记录。
5. 保存原始记录及配置，再导出便于交流的视图。不要只留下最后一屏截图。

## 6. 30 分钟操作练习

| 时间 | 动作 | 完成证据 |
|---|---|---|
| 0-5 分钟 | 定位状态行、消息行、命令行，核对 CPU | 配置卡 |
| 5-10 分钟 | 打开 Register / List / Frame / Dump | 能说明四个窗口各自回答什么 |
| 10-15 分钟 | 观察一个全局变量，添加并核对写观察点 | Break.List 的类型、Method 与范围 |
| 15-20 分钟 | 查看一个非运行任务并返回当前上下文 | magic、阻塞点与当前视图 |
| 20-25 分钟 | 保存 map 确认的内存段 | 正确字节数与 SHA-256 |
| 25-30 分钟 | 保存布局，按原始条件复验 | 操作记录，无意外复位 / 下载 |

相关官方界面图示和完整菜单说明见 [PowerView User's Guide 与 Debugger Tutorial](07-official-manuals.md)。
