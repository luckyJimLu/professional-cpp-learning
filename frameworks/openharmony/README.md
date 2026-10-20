---
summary: 从系统定位到 LiteOS-M 内核接口、启动移植与服务通信，建立轻量系统的源码阅读路线。
---
# OpenHarmony · Mini／轻量系统文档模块

本模块用于持续整理 OpenHarmony 面向资源受限设备的轻量系统资料，重点关注
LiteOS-M 内核、启动与移植、驱动、任务与中断、内存和 C/C++ 工程实践。
作为 Embedded / Systems Engineering 扩展专题维护，不占用每日课程 Day 编号。

## 范围与术语

这里用 **Mini／轻量系统／Lite System／L0** 作为资料检索入口。不同历史版本、
厂商资料中的称呼和分级可能存在差异，具体系统类型、内核与组件范围以选定
OpenHarmony release 的官方文档和产品配置为准。后续文章须写明版本、板卡和内核，
避免把不同系统形态的接口、构建步骤或资源指标混用。

OpenHarmony 项目及其轻量系统相关源码可从官方开源仓库获取。本模块整理学习笔记、
源码阅读和实验记录；上游源码、发布说明及各仓库许可证以对应版本为准。

## 文档入口

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| [01 · 系统定位与源码地图](01-system-overview.md) | 系统分层、核心能力、配置与源码阅读路线 | 已整理／静态核对 |
| [02 · 内核接口与契约](02-kernel-interfaces.md) | LOS、CMSIS-RTOS2、ISR、timeout 和生命周期 | 已整理／静态核对 |
| [03 · 系统组件接口](03-system-components.md) | 启动、SAMGR、外设、日志与存储 | 已整理／静态核对 |
| [04 · 工程核对指南](04-engineering-guide.md) | 版本锁定、接口选择、资源边界和回归要求 | 已整理／待板端验证 |
| [05 · 官方资料索引](05-sources.md) | 官方文档、源码位置和固定提交 | 80 个文件／9 个仓库 |
| [06 · samgr_lite 服务与通信机制](06-samgr-lite-service-communication.md) | Service/Feature/IUnknown、TaskPool、异步消息、Pub/Sub 与死锁边界 | PDF 内容整理／待固定版本源码复核 |
| [逐符号接口索引](API-INDEX.md) | 声明、宏与函数表成员的源码定位 | 311 项／所选头文件 |
| [来源清单](sources.json) / [接口清单](api-index.json) | SHA-256、固定链接与机器可读元数据 | 已入模块 |
| [内容规划与学习路线](ROADMAP.md) | 后续教程和板端实验路线 | 持续维护 |
| [文档模板与收录约定](DOCUMENT-TEMPLATE.md) | 适用版本、证据和复现步骤 | 可直接复制 |

本轮以 `OpenHarmony-v5.0.0-Release` 固定版本收集 30 篇官方文档，并核对核心头文件和关键实现。
资料采集日期为 2026-10-17；此版本是研究基线，不表示当前最新发行版。
现有正文为资料整理和源码静态核对，未完成目标板或仿真构建运行；头文件声明不等于产品已启用全部能力。

## 官方资料入口

| 入口 | 用途 |
| --- | --- |
| [OpenHarmony 官网](https://www.openharmony.cn/) | 项目与社区入口 |
| [官方文档仓库](https://gitee.com/openharmony/docs) | 查找选定版本的轻量系统开发文档、发布说明 |
| [LiteOS-M 内核仓库](https://gitee.com/openharmony/kernel_liteos_m) | 内核源码、目录说明与许可证 |
| [源码 manifest 仓库](https://gitee.com/openharmony/manifest) | 核对 release 对应的多仓库版本集合 |

上述链接是项目入口，不代表本模块已验证最新发行版或某块开发板的支持状态。
开始实验时先选定 release，并保存 manifest 与工具链版本，再依据该版本官方文档获取源码和构建。

## 与现有专题的关系

- [Professional C++ 主线](../../README.md)：把 ownership、RAII、接口契约与固定容量设计用于嵌入式场景。
- [TRACE32 · RTOS 稳定性分析](../trace32/README.md)：复用现场保全与证据分析方法；具体 RTOS 结构、命令和脚本需针对 LiteOS-M 单独验证。
- [Embedded C++ 编码规范](../../guidelines/embedded-cpp-guideline-notes.md)：审查堆分配、阻塞、ISR 上下文与资源上界。

## 后续添加方式

1. 从 [路线](ROADMAP.md) 选择主题，复制 [模板](DOCUMENT-TEMPLATE.md) 为本目录下的 `NN-topic.md`。
2. 写明 release/tag/commit、目标板与工具链；区分官方依据、源码推导和实际验证结果。
3. 把文章链接及真实状态加入本页；有依赖时补充前置阅读。
4. 示例随文章说明构建与运行方式。依赖开发板或交叉工具链的程序放在本模块后续的
   `examples/` 中，并标明目标环境，不能当作宿主机 standalone Lab 使用。

本目录 Markdown 会被现有 Learning Console 的专题与搜索机制自动收录。
