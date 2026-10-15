# 07 · TRACE32 官方用户手册与离线阅读索引

[专题首页](README.md) · [PowerView 操作](06-powerview-operations.md)

已为本次学习下载官方英文 PDF，并整理为单独的 `TRACE32_Official_Manuals_2026-10-16.zip` 阅读包。包内保留原始 PDF、官方来源链接、页数、文件大小与 SHA-256。原始附件未改动。下表官方链接用于检查后续版本，离线包是本次下载快照。

| 优先级 | 官方手册 | 用途 | 官方 PDF |
|---|---|---|---|
| 1 | PowerView User's Guide | 界面、窗口、命令行、帮助系统 | [ide_user.pdf](https://www2.lauterbach.com/pdf/ide_user.pdf) |
| 1 | Debugger Tutorial | 从连接到源码、断点、变量、内存的入门操作 | [debugger_tutorial.pdf](https://www2.lauterbach.com/pdf/debugger_tutorial.pdf) |
| 2 | Training Basic Debugging | 进一步理解调试操作和断点 | [training_debugger.pdf](https://www2.lauterbach.com/pdf/training_debugger.pdf) |
| 2 | OS Awareness Manual FreeRTOS | FreeRTOS 配置、任务、栈与对象 | [rtos_freertos.pdf](https://www2.lauterbach.com/pdf/rtos_freertos.pdf) |
| 2 | OS Awareness Manual NuttX | NuttX 任务与内核感知 | [rtos_nuttx.pdf](https://www2.lauterbach.com/pdf/rtos_nuttx.pdf) |
| 3 | Training Script Language PRACTICE | `.cmm` 参数、宏、循环、脚本调试 | [training_practice.pdf](https://www2.lauterbach.com/pdf/training_practice.pdf) |
| 3 | General Commands Reference B | Break 系列与断点语义 | [general_ref_b.pdf](https://www2.lauterbach.com/pdf/general_ref_b.pdf) |
| 3 | General Commands Reference D | Data 读写、加载、保存与内存分析 | [general_ref_d.pdf](https://www2.lauterbach.com/pdf/general_ref_d.pdf) |
| 4 | Cortex-M Trace Training | ETM / ITM、Trace 通路与实验 | [training_cortexm_etm.pdf](https://www2.lauterbach.com/pdf/training_cortexm_etm.pdf) |

## 建议阅读方法

第一次上手先读 Tutorial 的界面与基本调试部分，再回到 [窗口操作清单](06-powerview-operations.md) 做练习。调 RTOS 时按实际内核选择 FreeRTOS 或 NuttX 手册；写自动采集脚本时查 PRACTICE，参数不确定时查 B / D 命令参考。

芯片相关的 MemAccess、Cache、reset、Trace 路由和寄存器以 **当前安装版 Help > Processor Architecture Manual** 与厂商 TRM 为准。这里没有设备型号，不能替你选择唯一正确的板级连接脚本。

## 离线资料的边界

手册版权归 Lauterbach。下载包用于个人学习与项目排障查阅；仓库保留官方链接和学习索引。PDF 原件单独保存，没有作为新编教程重新署名。下载日期不等于文档发布日期，具体版本以各 PDF 扉页 / History 为准。
