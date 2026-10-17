# 05 · 官方资料索引与复核记录

返回 [模块首页](README.md)。

## 采集范围与证据

- 采集日期：2026-10-17。
- 研究基线：官方 GitHub 镜像 `OpenHarmony-v5.0.0-Release` 标签解析后的固定 commit；官方 Gitee 入口见首页。
- 已实际下载 30 篇官方开发文档，并读取下列所选仓库的头文件、README 与关键实现。
- 来源优先级：固定版本源码声明/实现与同版本官方文档共同核对；发现差异在正文注明。
- 校验值针对下载/检出的原始文件字节；汇总见 [sources.json](sources.json)。
- 原始文档图片、完整交叉引用和依赖仓库没有整体归档；本模块提供摘要、接口索引和固定源链接。
- 不宣称已验证最新版本、完整 repo 构建或硬件运行；后续板端实验应单独记录 manifest、BSP 与工具链。

## 关键资料怎么读

| 目的 | 入口 |
| --- | --- |
| 确认系统分类 | docs 的 `kernel-overview.md` |
| 认识轻量内核 | docs 的 `kernel-mini-overview.md` 与内核 `README_zh.md` |
| 理解任务与同步 | `kernel-mini-basic-task.md`、`kernel-mini-basic-ipc-*.md` |
| 核对实时约束 | `kernel-mini-basic-time.md`、`kernel-mini-basic-soft.md`、中断文档 |
| 处理资源问题 | 内存、内存调试、LMS、Trace 与异常记录文档 |
| 核对 CMSIS 行为 | CMSIS 标准头文件 + `cmsis_liteos2.c`，不能只读 API 文档 |
| 接入系统服务 | bootstrap 文档、`system_init.c`、`ohos_init.h`、SAMGR 头文件 |
| 设备与日志接口 | IoT 外设头文件、HiLog Lite 头文件与对应官方文档 |

## 固定版本来源清单

### openharmony/commonlibrary_utils_lite

Commit：`c409c66164c31992111b7b5ac5397d28b19fab62`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [README_zh.md](https://github.com/openharmony/commonlibrary_utils_lite/blob/c409c66164c31992111b7b5ac5397d28b19fab62/README_zh.md) | 6704 |
| [include/kv_store.h](https://github.com/openharmony/commonlibrary_utils_lite/blob/c409c66164c31992111b7b5ac5397d28b19fab62/include/kv_store.h) | 4047 |
| [include/ohos_init.h](https://github.com/openharmony/commonlibrary_utils_lite/blob/c409c66164c31992111b7b5ac5397d28b19fab62/include/ohos_init.h) | 12004 |
| [include/utils_file.h](https://github.com/openharmony/commonlibrary_utils_lite/blob/c409c66164c31992111b7b5ac5397d28b19fab62/include/utils_file.h) | 9039 |

### openharmony/docs

Commit：`ea349c8d56c574ce99e089eccfd6198d4d24f8c2`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [zh-cn/device-dev/get-code/sourcecode-acquire.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/get-code/sourcecode-acquire.md) | 12791 |
| [zh-cn/device-dev/kernel/kernel-mini-appx-code.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-appx-code.md) | 10460 |
| [zh-cn/device-dev/kernel/kernel-mini-appx-lib.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-appx-lib.md) | 36712 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-interrupt.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-interrupt.md) | 6119 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-ipc-event.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-ipc-event.md) | 7680 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-ipc-mutex.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-ipc-mutex.md) | 7949 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-ipc-queue.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-ipc-queue.md) | 10984 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-ipc-sem.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-ipc-sem.md) | 8007 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-list.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-list.md) | 4502 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-memory.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-memory.md) | 17346 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-soft.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-soft.md) | 9646 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-task.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-task.md) | 13842 |
| [zh-cn/device-dev/kernel/kernel-mini-basic-time.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-basic-time.md) | 4656 |
| [zh-cn/device-dev/kernel/kernel-mini-debug-shell.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-debug-shell.md) | 5871 |
| [zh-cn/device-dev/kernel/kernel-mini-extend-cpup.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-extend-cpup.md) | 6424 |
| [zh-cn/device-dev/kernel/kernel-mini-extend-dynamic-loading.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-extend-dynamic-loading.md) | 4556 |
| [zh-cn/device-dev/kernel/kernel-mini-extend-file.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-extend-file.md) | 19519 |
| [zh-cn/device-dev/kernel/kernel-mini-extend-support.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-extend-support.md) | 1485 |
| [zh-cn/device-dev/kernel/kernel-mini-memory-debug.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-memory-debug.md) | 14609 |
| [zh-cn/device-dev/kernel/kernel-mini-memory-exception.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-memory-exception.md) | 11554 |
| [zh-cn/device-dev/kernel/kernel-mini-memory-lms.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-memory-lms.md) | 14347 |
| [zh-cn/device-dev/kernel/kernel-mini-memory-trace.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-memory-trace.md) | 12498 |
| [zh-cn/device-dev/kernel/kernel-mini-overview.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-mini-overview.md) | 7744 |
| [zh-cn/device-dev/kernel/kernel-overview.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/kernel/kernel-overview.md) | 10366 |
| [zh-cn/device-dev/porting/porting-minichip-subsys-driver.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/porting/porting-minichip-subsys-driver.md) | 3060 |
| [zh-cn/device-dev/porting/porting-minichip-subsys-startup.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/porting/porting-minichip-subsys-startup.md) | 5834 |
| [zh-cn/device-dev/reference/kernel/cmsis/_c_m_s_i_s-_r_t_o_s.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/reference/kernel/cmsis/_c_m_s_i_s-_r_t_o_s.md) | 62952 |
| [zh-cn/device-dev/subsystems/subsys-boot-bootstrap.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/subsystems/subsys-boot-bootstrap.md) | 1948 |
| [zh-cn/device-dev/subsystems/subsys-dfx-hilog-lite.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/subsystems/subsys-dfx-hilog-lite.md) | 2203 |
| [zh-cn/device-dev/subsystems/subsys-utils-guide.md](https://github.com/openharmony/docs/blob/ea349c8d56c574ce99e089eccfd6198d4d24f8c2/zh-cn/device-dev/subsystems/subsys-utils-guide.md) | 1520 |

### openharmony/hiviewdfx_hilog_lite

Commit：`ac0f764d9348f8f521df2f9b241cb0df0b6a9cf5`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [README_zh.md](https://github.com/openharmony/hiviewdfx_hilog_lite/blob/ac0f764d9348f8f521df2f9b241cb0df0b6a9cf5/README_zh.md) | 17284 |
| [interfaces/native/kits/hilog_lite/hiview_log.h](https://github.com/openharmony/hiviewdfx_hilog_lite/blob/ac0f764d9348f8f521df2f9b241cb0df0b6a9cf5/interfaces/native/kits/hilog_lite/hiview_log.h) | 16908 |
| [interfaces/native/kits/hilog_lite/log.h](https://github.com/openharmony/hiviewdfx_hilog_lite/blob/ac0f764d9348f8f521df2f9b241cb0df0b6a9cf5/interfaces/native/kits/hilog_lite/log.h) | 742 |

### openharmony/iothardware_peripheral

Commit：`8377f3d107e1d247b48be5e494253a6a5d0ed26d`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [README_zh.md](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/README_zh.md) | 755 |
| [interfaces/inner_api/iot_errno.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_errno.h) | 1294 |
| [interfaces/inner_api/iot_flash.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_flash.h) | 3797 |
| [interfaces/inner_api/iot_gpio.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_gpio.h) | 7636 |
| [interfaces/inner_api/iot_i2c.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_i2c.h) | 3770 |
| [interfaces/inner_api/iot_pwm.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_pwm.h) | 2947 |
| [interfaces/inner_api/iot_uart.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_uart.h) | 5803 |
| [interfaces/inner_api/iot_watchdog.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/iot_watchdog.h) | 1453 |
| [interfaces/inner_api/lowpower.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/lowpower.h) | 2001 |
| [interfaces/inner_api/reset.h](https://github.com/openharmony/iothardware_peripheral/blob/8377f3d107e1d247b48be5e494253a6a5d0ed26d/interfaces/inner_api/reset.h) | 1228 |

### openharmony/kernel_liteos_m

Commit：`6c29f5cee9c28554440640897009097d5066b1b5`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [Kconfig](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/Kconfig) | 15004 |
| [README_zh.md](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/README_zh.md) | 6575 |
| [arch/include/los_interrupt.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/arch/include/los_interrupt.h) | 8037 |
| [kal/cmsis/cmsis_liteos2.c](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kal/cmsis/cmsis_liteos2.c) | 44913 |
| [kal/cmsis/cmsis_os2.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kal/cmsis/cmsis_os2.h) | 1748 |
| [kernel/include/los_config.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_config.h) | 21248 |
| [kernel/include/los_event.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_event.h) | 12999 |
| [kernel/include/los_membox.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_membox.h) | 8098 |
| [kernel/include/los_memory.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_memory.h) | 20554 |
| [kernel/include/los_mux.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_mux.h) | 12490 |
| [kernel/include/los_queue.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_queue.h) | 56046 |
| [kernel/include/los_sched.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_sched.h) | 4568 |
| [kernel/include/los_sem.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_sem.h) | 13216 |
| [kernel/include/los_sortlink.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_sortlink.h) | 4522 |
| [kernel/include/los_swtmr.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_swtmr.h) | 18547 |
| [kernel/include/los_task.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_task.h) | 56830 |
| [kernel/include/los_tick.h](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/include/los_tick.h) | 17732 |
| [kernel/src/los_event.c](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/src/los_event.c) | 7673 |
| [kernel/src/los_mux.c](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/src/los_mux.c) | 10773 |
| [kernel/src/los_task.c](https://github.com/openharmony/kernel_liteos_m/blob/6c29f5cee9c28554440640897009097d5066b1b5/kernel/src/los_task.c) | 50447 |

### openharmony/manifest

Commit：`a01bf6c105189fed7c13724d6c55bb4b863a0a3a`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [default.xml](https://github.com/openharmony/manifest/blob/a01bf6c105189fed7c13724d6c55bb4b863a0a3a/default.xml) | 313 |
| [ohos/ohos.xml](https://github.com/openharmony/manifest/blob/a01bf6c105189fed7c13724d6c55bb4b863a0a3a/ohos/ohos.xml) | 57547 |

### openharmony/startup_bootstrap_lite

Commit：`6df6756cbce94ad0ddf4be684fd49ae217120f2f`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [README_zh.md](https://github.com/openharmony/startup_bootstrap_lite/blob/6df6756cbce94ad0ddf4be684fd49ae217120f2f/README_zh.md) | 1130 |
| [services/source/bootstrap_service.c](https://github.com/openharmony/startup_bootstrap_lite/blob/6df6756cbce94ad0ddf4be684fd49ae217120f2f/services/source/bootstrap_service.c) | 2865 |
| [services/source/system_init.c](https://github.com/openharmony/startup_bootstrap_lite/blob/6df6756cbce94ad0ddf4be684fd49ae217120f2f/services/source/system_init.c) | 924 |

### openharmony/systemabilitymgr_samgr_lite

Commit：`e78ae061f8c47ffd6f709f80eb7933596d15d0cf`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [README_zh.md](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/README_zh.md) | 23611 |
| [interfaces/kits/samgr/common.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/common.h) | 8481 |
| [interfaces/kits/samgr/feature.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/feature.h) | 4498 |
| [interfaces/kits/samgr/iunknown.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/iunknown.h) | 8705 |
| [interfaces/kits/samgr/message.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/message.h) | 9908 |
| [interfaces/kits/samgr/samgr_lite.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/samgr_lite.h) | 11974 |
| [interfaces/kits/samgr/service.h](https://github.com/openharmony/systemabilitymgr_samgr_lite/blob/e78ae061f8c47ffd6f709f80eb7933596d15d0cf/interfaces/kits/samgr/service.h) | 6765 |

### openharmony/third_party_cmsis

Commit：`fd250efb9a2826a20926161343ee46091b8c52db`。

| 已采集文件 | 原始字节数 |
| --- | --- |
| [CMSIS/RTOS2/Include/cmsis_os2.h](https://github.com/openharmony/third_party_cmsis/blob/fd250efb9a2826a20926161343ee46091b8c52db/CMSIS/RTOS2/Include/cmsis_os2.h) | 42623 |

## 已知局限与后续核验

本次仅以固定 release 逐仓库标签读取资料，没有把 `manifest/tag/` 目录内的历史快照混入基线。
网络、分布式、安全、升级和图形接口未作逐项实现审计；完整产品组件可用性须结合板卡配置确认。
个别官方文档含旧版路径或浮动链接，正文使用本次实际核对的仓库路径，进一步引用应以清单固定 commit 为准。
没有复制外部文档全文或第三方图片；重新分发上游文件时应单独保留其版权和许可证。
