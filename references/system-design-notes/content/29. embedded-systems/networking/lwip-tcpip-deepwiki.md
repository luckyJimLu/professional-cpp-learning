---
title: lwIP TCP/IP 协议栈：架构、内存、netif、API 与 RTOS 移植
titleEn: lwIP TCP/IP Stack Architecture, Memory, netif, API & RTOS Porting Guide
order: 37
category: networking
tags: [lwIP, TCP/IP, RTOS, Ethernet, PPPoS, Modem]
source: Library/lwIP_TCPIP_DeepWiki_技术整理_2026-08-21.docx
---

# lwIP TCP/IP 协议栈

本文是对资料库《lwIP_TCPIP_DeepWiki_技术整理_2026-08-21.docx》的嵌入式模块化整理，覆盖 lwIP 的运行模型、关键数据结构、收发调用链、API 选择、RTOS 移植和产品调试方法。资料源为 DeepWiki 对 `lwip-tcpip/lwip` 的索引快照；实际产品应以工程锁定的 lwIP 版本、`lwipopts.h` 和平台 port 为准。

## 1. 一页速览

lwIP（Lightweight IP）面向 MCU、RTOS、裸机和资源受限设备，提供可裁剪的 IPv4/IPv6、TCP、UDP、RAW、ARP、DHCP、DNS、PPP 等能力。它通过 `struct netif` 与 `pbuf` 将协议栈和 Ethernet、Wi‑Fi、PPP 等链路驱动解耦。

| 维度 | 核心内容 | 工程意义 |
|---|---|---|
| 运行环境 | 裸机或 RTOS | 由 `NO_SYS` 决定线程模型 |
| 协议 | IPv4/IPv6、TCP、UDP、RAW | 可按产品功能裁剪 |
| 接口 | Raw、Netconn、BSD Socket | 在性能、内存和易用性间取舍 |
| 驱动边界 | `netif` + `pbuf` | 适配 Ethernet/Wi‑Fi/PPP |
| 配置 | `lwipopts.h` | 编译期控制功能和内存预算 |

## 2. 两种线程模型

### NO_SYS=1：裸机/Mainloop

![NOSYS=1：裸机/Mainloop](images/zfqyce.svg)

主循环负责轮询网卡、将数据送入协议栈并持续执行定时器。Raw API 是主要接口。中断服务函数应只完成快速收包、置位或投递，不能在 ISR 中运行复杂协议处理。

### NO_SYS=0：RTOS/Threaded

![NOSYS=0：RTOS/Threaded](images/rnarci.svg)

`tcpip_thread` 是协议栈核心串行化上下文。Raw API 也必须在 core context 中使用；其他线程应通过 `tcpip_callback()`、消息机制或正确配置的 core locking 进入协议栈。

## 3. 初始化与配置

### 裸机初始化

```c
platform_init();
lwip_init();
netif_add(...);
netif_set_default(&netif);
netif_set_up(&netif);

for (;;) {
    ethernetif_poll();
    sys_check_timeouts();
}
```

### RTOS 初始化

```c
os_network_driver_init();
tcpip_init(callback, arg);
netif_add(...);             /* 或 netifapi_netif_add */
netif_set_default(&netif);
netif_set_up(&netif);
dhcp_start(&netif);         /* 或使用静态地址 */
```

配置顺序应是：先决定 `NO_SYS`，再决定是否启用 `LWIP_NETCONN`/`LWIP_SOCKET`，最后根据并发连接数、带宽和峰值报文调整 `PBUF_POOL_SIZE`、`MEMP_NUM_TCP_PCB`、`MEMP_NUM_TCP_SEG`、`TCP_WND` 和 `TCP_SND_BUF`。

`MEM_SIZE` 只代表 lwIP heap 的一个来源，不等于整个协议栈的总内存。`memp` pool 或 `pbuf` pool 耗尽时，即使 heap 仍有空间，也可能出现 `ERR_MEM`。

## 4. tcpip_thread、邮箱与定时器

| 对象/函数 | 作用 |
|---|---|
| `tcpip_thread` | 协议栈核心消息循环 |
| `tcpip_mbox` | 承载 API 请求、RX pbuf 和 callback |
| `tcpip_input()` | 将接收包投递到核心线程 |
| `tcpip_callback()` | 安全地在 core context 执行函数 |
| `sys_check_timeouts()` | 执行 TCP、ARP、DHCP、DNS 等定时任务 |

定时器被饿死会导致“连接能建立但重传、DHCP 或 DNS 异常”。RTOS 中应保证 `tcpip_thread` 有足够优先级和栈空间，避免业务线程长期阻塞或抢占核心线程。

## 5. 内存系统：pbuf、mem、memp

| 子系统 | 管理对象 | 典型风险 |
|---|---|---|
| `pbuf` | 网络数据和协议头 | 引用计数、链表、DMA/cache、一致性 |
| `memp` | 固定尺寸控制块 | TCP PCB/SEG pool 单独耗尽 |
| `mem` | 可变尺寸 heap | 碎片、大小不足、并发保护 |

`PBUF_RAM` 适合需要可写的发送缓冲；`PBUF_POOL` 常用于网卡 RX；`PBUF_ROM`/`PBUF_REF` 可减少复制，但必须保证外部数据生命周期。零拷贝场景要明确 pbuf 所有权、DMA 完成时机、Cache clean/invalidate 和释放责任。

## 6. netif 驱动边界

`struct netif` 保存 IP 地址、MAC、MTU、flags、输入/输出回调和平台私有状态，是协议栈与硬件链路的边界。

- `netif->input`：将 L2/L3 接收包交给上层；RTOS 常使用 `tcpip_input`。
- `netif->output`：IPv4 输出，Ethernet 常连接到 `etharp_output`。
- `netif->linkoutput`：最底层链路发送，负责把 pbuf 链交给 MAC/DMA/PPP 驱动。
- `netif_set_up()`：软件行政状态。
- `netif_set_link_up()`：PHY/链路物理状态。

不要把软件 Up 和物理 Link Up 混为一谈。DHCP、IPv6 ND 和业务连接通常依赖正确的 link 状态变化。

## 7. RX/TX 数据路径

### Ethernet RX

![Ethernet RX](images/1m8h57w.svg)

### Ethernet TX

![Ethernet TX](images/1f7x2wf.svg)

抓包排障时，应按“驱动/PHY/DMA → `tcpip_input` → Ethernet/IP → TCP/UDP → 应用回调”的顺序定位。RX 没有报文先查硬件、DMA、CRC 和 ring；报文已到但协议栈无响应，再查 netif flags、checksum、ARP/ND、core context 和内存池。

## 8. 网络层与地址配置

Ethernet 按 EtherType 分发 IPv4、IPv6 和 ARP。ARP 负责 IPv4 地址到 MAC 的解析；IPv6 依赖 ND；ICMP/ICMPv6 负责错误报告、Echo 和邻居发现。

DHCP、AutoIP、ACD 和 DNS 都依赖 netif 生命周期与定时器。典型启动顺序是：`link up → netif up → dhcp_start() → 地址变更 callback → DNS/业务连接`。

## 9. TCP、UDP 与 RAW

TCP 围绕 PCB 管理连接状态、序列号、窗口、拥塞控制、重传计时器和 `unsent/unacked` 队列。`tcp_write()` 主要把数据放入发送队列，`tcp_output()` 才触发发送。

Raw TCP 回调在 core context 中执行，不能长时间阻塞。收到 pbuf 后，应用处理完必须 `pbuf_free()`；消费数据后调用 `tcp_recved()` 更新窗口。`MEMP_NUM_TCP_SEG` 不足时，即使 heap 有剩余，`tcp_write()` 仍可能返回 `ERR_MEM`。

UDP 无连接，延迟和内存开销较低，但可靠性、顺序和重传需要应用自行设计。lwIP RAW PCB 是直接面向 IP protocol number 的接口，不等同于 BSD raw socket。

## 10. API 选择

| API | 线程模型 | 开销 | 适用场景 |
|---|---|---|---|
| Raw | callback/event-driven，要求 core context | 最低 | 裸机、高性能、极小内存 |
| Netconn | 阻塞式，线程安全封装 | 中等 | RTOS 内部服务 |
| Socket | BSD/POSIX 风格 | 最高 | 已有标准网络应用代码 |

Socket 通常建立在 Netconn 之上，增加文件描述符、邮箱、信号量和包装层内存。API 选择本质上是执行上下文、实时性和内存预算的选择。

## 11. altcp、TLS 与 PPPoS

altcp 通过可叠加的连接层抽象 TCP，可在 Raw 风格 callback 上插入 TLS 或代理层。启用 TLS 时必须单独评估 mbedTLS heap、证书、随机数、时间源和握手峰值 RAM。

PPPoS 适合蜂窝 Modem 数据面：AT 命令负责拨号和进入数据模式，UART 字节流交给 PPP 状态机，完成 IPCP/IPv6CP 后形成 lwIP netif。

![11. altcp、TLS 与 PPPoS](images/199caz4.svg)

AT 控制流和 PPP 数据流必须有明确的命令模式/数据模式状态机，不能并行交给同一个解析器。

## 12. RTOS 移植检查点

`NO_SYS=0` 的移植重点是 `sys_arch` 和 netif driver：

- `sys_thread_new`：线程栈、优先级和命名。
- `sys_mbox_*`：阻塞与超时语义。
- `sys_sem_*`：超时单位和返回值。
- `sys_mutex_*`：core lock 与 Socket 内部同步。
- `sys_now`：单调毫秒时基和 tick wrap。
- `SYS_ARCH_PROTECT`：轻量临界区，不能长时间关闭中断。

常见错误包括超时返回值不符合约定、`tcpip_thread` 优先级过低、RX 线程绕过核心线程调用 Raw API、DMA 与 D-Cache 不一致，以及 RX/TX descriptor 或 pbuf pool 数量不足。

## 13. 调试与测试

产品调试应同时对齐四类证据：协议日志、lwIP 内存统计、Wireshark/tcpdump 抓包、驱动计数器。

| 手段 | 可回答的问题 |
|---|---|
| `LWIP_DEBUG` | 协议代码走到哪里、为何丢包 |
| `LWIP_STATS` | heap、pool、drop/error 是否耗尽 |
| PCAP | 线上真实报文和时序 |
| DMA/MAC 计数器 | CRC、overrun、ring 和硬件错误 |
| `test/unit` | 核心模块回归 |
| `test/fuzz` | 畸形输入健壮性 |

## 14. 常见排障清单

| 现象 | 优先检查 |
|---|---|
| 有 IP 但 ping 不通 | link flag、ARP/ND、网关、checksum、RX/TX DMA |
| ping 正常但 TCP 超时 | SYN/SYN-ACK、路由、`tcpip_thread`、PCB/SEG pool |
| 偶发 `ERR_MEM` | `MEMP_NUM_TCP_SEG`、`PBUF_POOL`、发送队列，不要只增加 `MEM_SIZE` |
| 高流量掉包 | RX descriptor、pbuf pool、线程调度、Cache/DMA、回调阻塞 |
| Socket 偶发卡死 | mailbox/semaphore 超时、线程栈、core 调度 |
| DHCP 失败 | link 时序、timer、UDP/ARP、广播和 checksum |
| PPP 连上但无网 | IPCP、DNS、默认路由、UART 丢字节、MTU/MRU、模式切换 |
| 裸机运行后失效 | `sys_check_timeouts()`、ISR 进 core、pbuf 泄漏 |

## 15. 源码阅读路线

1. `src/core/init.c`、`src/include/lwip/opt.h` 和项目 `lwipopts.h`：确认配置边界。
2. `src/api/tcpip.c`、`src/core/timeouts.c`、`src/include/lwip/sys.h`：理解核心线程和定时器。
3. `pbuf.c`、`mem.c`、`memp.c`：理解包所有权和内存池。
4. `netif.c`、`netif.h` 和平台 `ethernetif.c`：理解网卡边界。
5. `ethernet.c`、`etharp.c`、`ip4.c`、`ip6.c`：理解 L2/L3 分发。
6. `tcp.c`、`tcp_in.c`、`tcp_out.c`、`udp.c`：理解状态机、窗口和重传。
7. `api_lib.c`、`api_msg.c`、`sockets.c`：理解 Raw 到阻塞式 API 的包装。
8. `sys_arch.c`、`arch/cc.h` 和 DMA 驱动：确认 RTOS 与硬件适配边界。

## 资料来源

- 资料库：《lwIP_TCPIP_DeepWiki_技术整理_2026-08-21.docx》
- [lwip-tcpip/lwip](https://github.com/lwip-tcpip/lwip)
- [DeepWiki lwIP](https://deepwiki.com/lwip-tcpip/lwip)
