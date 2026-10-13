# Embedded Networking

嵌入式网络协议栈、lwIP、TCP/IP、Ethernet、PPP/PPPoS 与 Modem 网络集成。

## 文档

- [lwIP TCP/IP 协议栈：架构、内存、netif、API 与 RTOS 移植](lwip-tcpip-deepwiki.md)

## 学习顺序

1. 先区分 `NO_SYS=1` 裸机与 `NO_SYS=0` RTOS 线程模型。
2. 再阅读 `tcpip_thread`、`tcpip_mbox`、`pbuf/mem/memp` 和 `netif`。
3. 最后结合具体芯片的 Ethernet DMA、`sys_arch.c`、`lwipopts.h` 和抓包验证。
