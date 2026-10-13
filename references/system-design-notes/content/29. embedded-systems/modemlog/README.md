# Modem / Networking 设计资料

> 返回：[Embedded Systems 总目录](../README.md)

本目录聚合 MCU ↔ Modem 诊断、网络、抓包与存储相关设计。文档沿用仓库既有章节风格按推荐阅读顺序编号：**01–03 为当前实施主线，04–07 为历史方案与演进记录**。

## 当前实施主线

### 01. 统一设计基线

- [01. STM32 ModemLog、CHR 与本地抓包统一设计](./01-diagnostics-unified-design.md)
  - 当前有效基线：双 Socket Reactor、MCU 本地 Capture Tap、Storage Owner、静态有界缓冲与持久化 ACK 语义。

### 02. C++ 整体架构

- [02. C++ 整体架构与交互契约](./02-cpp-architecture-and-interactions.md)
  - 将统一设计落成接口、对象生命周期、线程边界、缓冲区所有权与安全停机协议。

### 03. 完整流程图

- [03. Modem 完整 PlantUML 架构与流程图](./03-modem-complete-mermaid-flows.md)
  - 与 01、02 保持一致的端到端数据流、异常流、状态机和时序图。

## 历史方案与演进记录

以下资料保留用于方案演进、设计取舍复盘和代码审查，不作为当前实施基线。

- [04. STM32 + lwIP Modem 日志接收与本地存储方案](./04-stm32-lwip-modem-log-storage-design.md)
- [05. Modem + MCU 双网络域 / 双 netif 路由设计](./05-modem-mcu-dual-netif-routing-design.md)
- [06. 多通道弹性 Worker Pool 设计](./06-multi-channel-elastic-worker-pool-design.md)
- [07. 多通道弹性 Worker Pool 设计审查](./07-multi-channel-elastic-worker-pool-design-review.md)

## 推荐阅读路径

`01 统一设计基线 → 02 C++ 架构 → 03 流程图 → 04–07 历史方案与审查`

## 相关主题

- [RTOS：资源受限嵌入式系统架构设计与核心机制](../rtos/resource-constrained-embedded-rtos-architecture.md)
