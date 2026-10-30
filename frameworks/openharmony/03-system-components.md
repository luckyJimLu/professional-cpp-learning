# 03 · 启动、服务、外设与基础组件接口

返回 [模块首页](README.md) · 配套 [接口索引](API-INDEX.md)。

基线为 `OpenHarmony-v5.0.0-Release`；下述接口通过头文件或实现静态核对。
仓库归属和源码链接见 [资料索引](05-sources.md)。未验证具体板卡实现与运行行为。

## 启动与初始化

| 接口 | 所属位置 | 作用与契约 |
| --- | --- | --- |
| `OHOS_SystemInit` | bootstrap `services/source/system_init.c` | 遍历模块与服务初始化阶段，再启动 SAMGR；具体调用点由板级启动代码决定 |
| `SYS_SERVICE_INIT`、`SYS_FEATURE_INIT` | utils `include/ohos_init.h` | 注册核心系统服务/功能初始化函数 |
| `APP_SERVICE_INIT`、`APP_FEATURE_INIT` | 同上 | 注册应用层服务/功能初始化函数 |
| `SYS_RUN` | 同上 | 注册 run 阶段初始化入口；其执行顺序以固定版本实现为准 |
| `SAMGR_Bootstrap` | SAMGR `interfaces/kits/samgr/samgr_lite.h` | 服务框架引导，由系统启动流程调用 |

初始化宏把函数注册到相应初始化段，需要匹配链接脚本和段保留规则。仅将源文件放入目录，
并不保证目标已经编译、链接并执行初始化函数。

本次 bootstrap 实现中 `OHOS_SystemInit` 按 `bsp → device → core → service → feature → run`
阶段调用相关宏，再调用 `SAMGR_Bootstrap` 与后续参数服务入口；应用阶段的服务启动还涉及 SAMGR
流程，不能把这个局部顺序当作所有业务回调的全局执行顺序或硬件依赖保证。
初始化函数应快速返回，把持续处理放入任务；不得在某个初始化入口中永久循环而阻断后续阶段。

## SAMGR Lite 服务管理与消息

| 接口 / 数据结构 | 作用 | 使用边界 |
| --- | --- | --- |
| `SAMGR_GetInstance` / `SamgrLite` | 获取管理器函数表 | 多个操作是函数表成员，不能写成不存在的全局同名函数 |
| `RegisterService` / `Service` | 注册服务及其初始化、消息处理等回调 | 服务对象与名称等借用数据需满足框架生命周期 |
| `RegisterFeature` / `Feature` | 在服务下注册功能 | 服务/功能名称与依赖关系要明确 |
| `RegisterDefaultFeatureApi`、`RegisterFeatureApi` | 发布服务/功能接口 | 对外 API 使用 `IUnknown` 等接口约定 |
| `GetDefaultFeatureApi`、`GetFeatureApi` | 查找服务/功能接口 | 查找可失败；遵守引用计数、QueryInterface 与 Release 协议 |
| `Identity`、`Request`、`Response` | 描述路由、请求和响应 | 明确载荷大小、数据寿命与响应匹配 |
| `SAMGR_SendRequest`、`SAMGR_SendResponse` | 请求发送、响应返回 | 检查发送状态，区分入队成功与业务处理成功 |

不能将 LiteOS-M 队列的按值复制规则直接当作 SAMGR 的整个消息所有权规则。
尤其 `Request.data`、异步 handler 捕获和共享请求需要单独核对 SAMGR 的实现及调用协议。
不应因为名字含“服务”就假设它运行在独立 Linux 进程或具备地址空间隔离。

## IoT 外设接口

本次头文件实际位于 `iothardware_peripheral/interfaces/inner_api/`。
这些是该版本源码接口入口，标为 inner_api 的接口不应被宣传为跨版本稳定 SDK。
驱动是否支持、引脚复用、电气限制、调用上下文与阻塞时间必须依据目标 BSP 确认。

| 外设 | 头文件 | 常用接口 | 重点检查 |
| --- | --- | --- | --- |
| GPIO | `iot_gpio.h` | `IoTGpioInit`、`IoTGpioSetDir`、`IoTGpioSetOutputVal`、`IoTGpioGetInputVal`、`IoTGpioRegisterIsrFunc`、`IoTGpioUnregisterIsrFunc` | pin ID 与引脚复用；中断回调取消后是否仍可能在途 |
| UART | `iot_uart.h` | `IoTUartInit`、`IoTUartRead`、`IoTUartWrite`、`IoTUartSetFlowCtrl`、`IoTUartDeinit` | Read/Write 返回 `int`；处理负值及短读写；此接口本身没有显式 timeout 参数 |
| I2C | `iot_i2c.h` | `IoTI2cInit`、`IoTI2cRead`、`IoTI2cWrite`、`IoTI2cSetBaudrate` | 地址编码、总线速度、缓冲区有效范围与故障恢复依赖板级实现 |
| PWM | `iot_pwm.h` | `IoTPwmInit`、`IoTPwmStart`、`IoTPwmStop`、`IoTPwmDeinit` | duty/freq 的范围和单位按驱动核对，不假设 duty 是 0 到 100 |
| Flash | `iot_flash.h` | `IoTFlashInit`、`IoTFlashRead`、`IoTFlashWrite`、`IoTFlashErase` | 分区边界、擦除对齐、写前擦除策略、寿命、掉电一致性 |
| 看门狗 | `iot_watchdog.h` | `IoTWatchDogEnable`、`IoTWatchDogKick`、`IoTWatchDogDisable` | 不以“仍能喂狗”代替全系统健康；调用时序与硬件配置相关 |
| 低功耗 | `lowpower.h` | `LpcInit`、`LpcSetType` | 唤醒源、外设上下文和计时源连续性需按平台验证 |
| 重启 | `reset.h` | `RebootDevice` | 重启原因编码及持久化现场由平台定义 |

错误处理不能套用统一规则：GPIO 等多数接口使用 `unsigned int` 状态并参考 `iot_errno.h`；
UART 读写用 `int`，看门狗操作为 `void`。调用封装应逐接口定义成功、失败和进度的含义。

## 日志与存储

| 组件 | 接口 / 位置 | 核对结论与边界 |
| --- | --- | --- |
| HiLog Lite | `HILOG_DEBUG/INFO/WARN/ERROR/FATAL`，`hilog_lite/hiview_log.h` | 通过对应模块的日志宏输出；开关、等级、缓冲与后端受配置影响；格式化与串口输出有时延成本 |
| 轻量文件接口 | `UtilsFileOpen/Close/Read/Write/Seek/Delete/Stat`，utils `include/utils_file.h` | 不是完整 POSIX 文件系统承诺；需适配后端，处理部分读写、句柄与失败返回 |
| KV 接口声明 | `UtilsGetValue`、`UtilsSetValue`、`UtilsDeleteValue`，utils `include/kv_store.h` | 仅确认声明存在；README 对 LiteOS-M 与 LiteOS-A 能力有区别，不能据此断言某个 Mini 产品启用 KV 后端 |

## 需要产品级继续确认的组件

官方 LiteOS-M 源码包含文件系统、网络、Shell、C++、Trace、CPUP、低功耗等可选组件。
完整系统还可按产品选择连接、安全、升级与图形能力。本次未审计这些领域的逐 API 行为，
也未验证 Wi-Fi、SoftBus、HUKS、OTA 在某块开发板上的可用性。

后续扩展须先确认：组件归属与适用系统 → release/commit → 产品配置 → 依赖与 BSP →
头文件和实现 → 编译链接证据 → 运行与故障路径。不能仅从全仓文档里出现某组件就归入 Mini 默认功能。
