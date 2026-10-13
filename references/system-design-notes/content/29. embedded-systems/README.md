# Embedded Systems

面向资源受限 MCU、RTOS、通信模组、网络栈与固件架构的专题资料。

> 图表说明：本章流程图统一使用 `plantuml` 代码围栏。Obsidian 默认不渲染 PlantUML，请安装社区插件 [PlantUML](https://github.com/joethei/obsidian-plantuml)；中文图建议在插件中使用 SVG 渲染。

## 目录

### RTOS

- [资源受限嵌入式系统架构设计与 RTOS 核心机制研究报告](rtos/resource-constrained-embedded-rtos-architecture.md)
  - 静态内存与链接期资源收敛
  - 少任务 + 事件驱动 + Active Object / HSM
  - ISR、临界区、MSP/PSP 与栈防御
  - SPSC 无锁 Ring Buffer 与 Task Notification
  - Watchdog Supervisor 与 Tickless Idle
  - FreeRTOS / RT-Thread Nano / Zephyr 裁剪与选型

### Modem / Networking

- [Modem 诊断与 MCU 网络架构](modemlog/README.md)
  - ModemLog / CHR 双 Socket
  - lwIP / TCP/IP 双网络接口
  - C++ 固件架构与交互契约
  - MCU 本地抓包、存储与诊断

### Embedded Networking

- [Embedded Networking 总目录](networking/README.md)
- [lwIP TCP/IP 协议栈：架构、内存、netif、API 与 RTOS 移植](networking/lwip-tcpip-deepwiki.md)
  - NO_SYS=1 裸机与 NO_SYS=0 RTOS 模型
  - tcpip_thread、pbuf/mem/memp、netif 与 RX/TX 调用链
  - Raw / Netconn / Socket、TLS、PPPoS 与 RTOS 移植
  - 调试、抓包、统计与故障排查

## 后续建议目录

```text
embedded-systems/
├── rtos/          # RTOS、调度、内存、IPC、实时性
├── modemlog/      # Modem、蜂窝通信、诊断与网络
├── networking/    # lwIP、TCP/IP、协议栈
├── drivers/       # UART/SPI/I2C/DMA 等驱动设计
└── bootloader/    # 启动、升级、恢复与安全启动
```
