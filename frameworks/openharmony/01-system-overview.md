# 01 · 轻量系统定位、核心功能与源码地图

返回 [模块首页](README.md) · 下一篇 [内核接口](02-kernel-interfaces.md)。

## 基线与结论

本文基于官方 `OpenHarmony-v5.0.0-Release` 标签对应资料整理，采集日期为 2026-10-17。
这是固定研究基线，不表示当前最新版本。实际提交、来源链接及 SHA-256 见
[资料索引](05-sources.md) 和 [机器可读清单](sources.json)。验证程度为**官方资料阅读与源码静态核对**，尚无板端或仿真运行验证。

官方该版本《内核概述》使用 mini / small / standard 分类，轻量系统对应 LiteOS-M。
本专题保留 Mini／Lite／L0 作为检索关键词；不能把非官方资料的 L0 分级直接等同于所有版本的正式产品定义。
官方的 128 KiB 等数字是该版本设备分级参考，不能作为包含网络、应用和调试功能的固件实际 RAM 预算。

**系统由内核、内核适配层、可选系统组件、板级驱动和产品应用共同组成。**
只有 LiteOS-M 内核源码并不等于完整产品源码；完整构建还需要 manifest 中关联的工具链、组件和板级仓库。

## 能力分层

| 层次 | 核心能力 | 主要位置 / 接口 | 工程边界 |
| --- | --- | --- | --- |
| 应用与服务 | 应用初始化、服务/Feature 注册和消息处理 | `ohos_init.h`、SAMGR Lite | 可裁剪；生命周期由服务与调用者协议共同约束 |
| 设备与基础组件 | GPIO、UART、I2C、PWM、Flash、看门狗、日志、文件 | `iothardware_peripheral`、`hilog_lite`、`utils_lite` | 头文件存在不等于目标芯片已实现 |
| 内核抽象层 KAL | CMSIS-RTOS2、POSIX 适配 | `kal/cmsis/`、`kal/posix/` | 适配覆盖和语义必须核对具体实现 |
| 内核最小功能集 | 任务调度、同步、队列、事件、时间、内存 | `kernel/include/los_*.h`、`kernel/src/` | 受 Kconfig 和产品配置约束 |
| 可选内核组件 | 文件系统、网络、C++、Shell、CPUP、Trace、低功耗、内存诊断 | `components/` | 启用条件、依赖、空间开销逐项核对 |
| 架构与板级 | 中断、上下文切换、Tick、启动、外设时钟和引脚 | `arch/`、`device/`、`vendor/` | 架构、SoC 和产品分工不能混淆 |

## 内核功能摘要

| 能力 | 作用与主要行为 | 需要记录的配置/资源 |
| --- | --- | --- |
| 任务 | 抢占式优先级调度；同优先级时间片轮转；任务可等待、延时、挂起和退出 | 任务上限、栈大小、时间片、优先级分配 |
| 互斥锁 | 保护共享资源；内核实现支持优先级继承 | 锁数量、锁顺序、递归计数、最长持有时间 |
| 信号量 | 计数与二值资源同步；不提供互斥锁的 owner 语义 | 初始值、上限、等待超时、ISR 使用约束 |
| 消息队列 | 在生产者与消费者间传递固定容量消息 | 深度、消息大小、满/空处理、复制或指针语义 |
| 事件 | 按位表示条件，支持 AND / OR 等待以及读后清除 | 位分配、保留错误位、是否需要次数累计 |
| 内存 | 动态内存池与固定块内存池 | 对齐、碎片、失败策略、配对释放、池寿命 |
| 时间 | Tick 计时、延时、软定时器 | Tick 频率、取整、溢出、回调时长 |
| 中断 | 中断注册/控制、关中断和恢复 | 中断优先级、嵌套、关中断时长、架构差异 |

原生 LOS 优先级数值越小优先级越高，文档描述范围为 0–31；可用范围还要扣除系统保留与配置限制。
CMSIS 优先级有适配转换，不能直接填入 LOS 数值。[接口与限制](02-kernel-interfaces.md) 给出具体入口。

## 源码阅读路线

1. 阅读 `manifest/default.xml` 和 `ohos/ohos.xml`，确认 `ohos:mini` 分组、仓库路径和标签。
2. 从 LiteOS-M `README_zh.md`、`Kconfig`、`kernel/include/los_config.h` 建立配置地图。
3. 沿 `LOS_KernelInit`、`LOS_Start` 阅读初始化和调度入口，再读 `kernel/src/los_task.c` 等实现。
4. 对照 `kal/cmsis/cmsis_liteos2.c` 阅读应用侧 `os*` 接口怎样转为 `LOS_*`。
5. 阅读 bootstrap 的 `OHOS_SystemInit`、utils 的 `ohos_init.h` 和 SAMGR 服务接口。
6. 最后结合具体产品选择 `device/`、`vendor/` 的启动、驱动和构建文件。

`manifest/tag/` 下另有按时间命名的快照 XML；它不是本次默认 manifest，不能将其中 revision
与各仓库 release 标签混拼为一个“已验证固件”。本次没有执行完整 `repo sync` 或构建。

## 不应套用的能力假设

- 不以标准系统 ArkTS / UIAbility / N-API 文档作为 Mini 原生应用接口说明。
- 不假设存在 Linux 进程地址空间、`fork`、完整 POSIX 或 Android Binder 运行环境。
- 不把 LiteOS-A 的虚拟内存、小型系统进程管理或 Linux SELinux 配置直接移植到本专题。
- 网络、图形、安全、升级与分布式组件按产品裁剪确认；本次未做这些组件的逐 API 审计。

依据：官方《内核概述》《LiteOS-M 内核概述》、LiteOS-M README、manifest 分组，均已列入 [资料索引](05-sources.md)。
