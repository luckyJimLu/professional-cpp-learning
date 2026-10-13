# RTOS / Real-Time Embedded Systems

本目录用于整理资源受限 MCU 上的实时操作系统、调度、内存、IPC、低功耗和可靠性设计。

## 文档

- [资源受限嵌入式系统架构设计与 RTOS 核心机制研究报告](resource-constrained-embedded-rtos-architecture.md)

## 关注主题

- WCET 与实时确定性
- 静态内存与栈预算
- 优先级调度与优先级反转
- ISR / 临界区 / MSP / PSP
- Task Notification / Queue / Semaphore
- SPSC 无锁 Ring Buffer
- Watchdog Supervisor
- Tickless Idle 与低功耗竞态
- FreeRTOS / RT-Thread Nano / Zephyr 裁剪
- `.map` / `.su` / Fault Injection 工程验证
