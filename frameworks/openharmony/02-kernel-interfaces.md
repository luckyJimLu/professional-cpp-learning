# 02 · LiteOS-M 核心接口与使用契约

返回 [模块首页](README.md) · 配套 [逐符号接口索引](API-INDEX.md)。

基线为 `OpenHarmony-v5.0.0-Release`；源码静态核对，未做目标板编译与运行。
下表是常用接口导读，完整参数以索引链接的固定版本头文件与实现为准。

## 原生 LOS 接口

| 功能 / 头文件 | 常用接口 | 输入、输出和资源契约 |
| --- | --- | --- |
| 启动 / `los_task.h` | `LOS_KernelInit`、`LOS_Start` | 由系统启动流程调用，不在普通业务任务中重复初始化内核 |
| 创建任务 / `los_task.h` | `LOS_TaskCreate`、`LOS_TaskCreateOnly` | 输出 task ID；初始化参数为 `TSK_INIT_PARAM_S`；CreateOnly 与立即进入就绪队列的 Create 有区别 |
| 任务控制 / `los_task.h` | `LOS_TaskDelay`、`LOS_TaskYield`、`LOS_TaskSuspend`、`LOS_TaskResume`、`LOS_TaskDelete` | Delay 参数为 tick；删除任务不等价于 C++ 栈展开或业务资源清理 |
| 任务观察 / `los_task.h` | `LOS_CurTaskIDGet`、`LOS_TaskInfoGet`、`LOS_TaskPriSet` | 检查 ID 与状态有效性；优先级数值方向不能与 CMSIS 混用 |
| 调度锁 / `los_task.h` | `LOS_TaskLock`、`LOS_TaskUnlock` | 成对恢复调度；不等价于关中断，也不能替代保护 ISR 共享数据的协议 |
| 互斥 / `los_mux.h` | `LOS_MuxCreate`、`LOS_MuxPend`、`LOS_MuxPost`、`LOS_MuxDelete` | 有 owner；检查等待结果，成功取得后才能释放；不能在 ISR 中等待互斥锁 |
| 信号量 / `los_sem.h` | `LOS_SemCreate`、`LOS_BinarySemCreate`、`LOS_SemPend`、`LOS_SemPost`、`LOS_SemDelete` | 表达通知或资源计数；ISR 不得以非零 timeout 阻塞等待 |
| 队列 / `los_queue.h` | `LOS_QueueCreate`、`LOS_QueueWriteCopy`、`LOS_QueueReadCopy`、`LOS_QueueDelete` | 创建时固定深度与节点容量；ReadCopy 的大小参数是输入/输出；处理满、空和超时 |
| 事件 / `los_event.h` | `LOS_EventInit`、`LOS_EventRead`、`LOS_EventWrite`、`LOS_EventClear`、`LOS_EventDestroy` | Read 返回事件位或错误；事件控制块由调用者提供并保持有效；bit 25 保留用于错误判别 |
| 动态内存 / `los_memory.h` | `LOS_MemInit`、`LOS_MemAlloc`、`LOS_MemAllocAlign`、`LOS_MemRealloc`、`LOS_MemFree` | 申请失败返回空指针；必须用相同池的配套接口释放，不能混用 `delete` / `free` |
| 固定块池 / `los_membox.h` | `LOS_MemboxInit`、`LOS_MemboxAlloc`、`LOS_MemboxFree` | 调用者提供池存储；块数有上限，耗尽可预期；池不能先于借用块销毁 |
| 时间 / `los_tick.h` | `LOS_TickCountGet`、`LOS_MS2Tick`、`LOS_Tick2MS` | 单位、频率与取整需显式处理；不能将 tick 直接当毫秒 |
| 软定时器 / `los_swtmr.h` | `LOS_SwtmrCreate`、`LOS_SwtmrStart`、`LOS_SwtmrStop`、`LOS_SwtmrDelete` | 回调短小、不阻塞；创建原型受配置影响；一次性模式需区分自动删除与保留 ID |
| 中断 / `arch/include/los_interrupt.h` | `LOS_HwiCreate`、`LOS_HwiEnable`、`LOS_HwiDisable`、`LOS_IntLock`、`LOS_IntRestore` | 这些入口映射至架构接口；保存并恢复原中断状态，避免无条件开中断 |

原生接口多数状态结果以 `LOS_OK` 表示成功，但内存分配、事件读取、查询类返回值不同，
不能统一写成“非零即失败”。所有句柄删除前都要处理正在等待或访问该对象的任务。

## CMSIS-RTOS2 应用接口

声明来自独立仓库 `third_party_cmsis/CMSIS/RTOS2/Include/cmsis_os2.h`；
LiteOS-M 中 `kal/cmsis/cmsis_os2.h` 只是转发头。实现核对位置为 `kal/cmsis/cmsis_liteos2.c`。

| 功能 | 常用接口 | 重点核对 |
| --- | --- | --- |
| 内核 | `osKernelInitialize`、`osKernelStart`、`osKernelGetTickFreq`、`osKernelGetTickCount` | 系统可能已由启动代码完成初始化，应用不应重复调用 |
| 线程 | `osThreadNew`、`osThreadGetId`、`osThreadSetPriority`、`osThreadTerminate` | 返回线程句柄；入口参数借用对象必须存活；强制终止不负责应用层析构 |
| 等待 | `osDelay`、`osDelayUntil` | 参数为 tick；`osDelayUntil` 是绝对 tick 目标 |
| 互斥 | `osMutexNew`、`osMutexAcquire`、`osMutexRelease`、`osMutexDelete` | 状态返回 `osStatus_t`；本版本 New 忽略 attr，不能承诺属性全部生效 |
| 信号量 | `osSemaphoreNew`、`osSemaphoreAcquire`、`osSemaphoreRelease`、`osSemaphoreDelete` | 检查初始/最大计数；ISR 使用时逐函数确认，禁止阻塞 |
| 队列 | `osMessageQueueNew`、`osMessageQueuePut`、`osMessageQueueGet`、`osMessageQueueDelete` | 固定消息尺寸；本版本 `msg_prio` 被忽略，不提供由该参数控制的优先消息排序 |
| 事件标志 | `osEventFlagsNew`、`osEventFlagsSet`、`osEventFlagsWait`、`osEventFlagsDelete` | 返回标志值或 flags 错误；不能按普通 `osStatus_t` 比较所有返回值 |
| 定时器 | `osTimerNew`、`osTimerStart`、`osTimerStop`、`osTimerDelete` | `osTimerStart` 的周期是 tick；回调不能阻塞 |
| 内存池 | `osMemoryPoolNew`、`osMemoryPoolAlloc`、`osMemoryPoolFree`、`osMemoryPoolDelete` | 以适配实现为准，检查容量耗尽、属性支持和释放规则 |

### 常用调用参数速查

以下为接口签名导读，不是可独立运行的程序；所需类型与声明以对应头文件为准。

```c
osThreadId_t osThreadNew(osThreadFunc_t func, void *argument,
                        const osThreadAttr_t *attr);
osMessageQueueId_t osMessageQueueNew(uint32_t msg_count, uint32_t msg_size,
                                     const osMessageQueueAttr_t *attr);
osStatus_t osMessageQueuePut(osMessageQueueId_t mq_id, const void *msg_ptr,
                             uint8_t msg_prio, uint32_t timeout);
osStatus_t osMessageQueueGet(osMessageQueueId_t mq_id, void *msg_ptr,
                             uint8_t *msg_prio, uint32_t timeout);
```

`msg_count` 是队列深度，`msg_size` 是每条消息字节数；Put/Get 使用创建时的固定消息尺寸，
调用者必须提供足够的可读/可写存储。`timeout` 为 tick，零表示不等待；创建失败返回空句柄，
传输通过 `osStatus_t` 报告结果。本版本 Put/Get 的 `msg_prio` 参数不生效。
线程入口的 `argument` 以及用户提供的栈内存需要保持有效直到线程完成使用。

### 已核对的适配差异

1. LOS 与 CMSIS 优先级通过 `LOS_PRIORITY` / `CMSIS_PRIORITY` 转换，不能用数字直接互换。
2. `osMutexNew` 实现包含 `UNUSED(attr)`，不能仅根据 CMSIS 标准声明推断名称、用户内存或属性支持。
3. `osMessageQueuePut/Get` 实现包含 `UNUSED(msg_prio)`。Get 不会替调用者填充有效消息优先级。
4. CMSIS 队列操作在 ISR 且 timeout 非零时拒绝请求；返回的是该适配实现定义的错误，不能编写依赖错误分类猜测的逻辑。
5. CMSIS 声明全集大于“某个产品已经启用且完整支持的接口集”；Kconfig、实现分支与链接产物需共同核对。

## 容易误用的语义

- **事件清除掩码**：原生 `LOS_EventClear` 要传清除位的反码，例如清 bit 0 传 `~1U`。
  它与 CMSIS `osEventFlagsClear` 的参数语义不能机械替换。
- **事件不是计数器**：同一 bit 连续写入可能合并；要求统计每次采样时使用队列或计数方案。
- **消息复制不等于深拷贝**：队列复制结构体中的指针后，指向的 payload 仍有独立寿命。
- **软定时器上下文**：该版本文档描述 Tick 记录超时，再由软定时器任务执行回调；仍不应长时间执行或阻塞。
- **实时预算**：延时、排队、优先级和关中断共同决定响应时间；API 有 timeout 不代表端到端 WCET 已证明。

以上限制依据已采集的原生头文件、CMSIS 声明/适配实现与官方任务、事件、队列、软定时器文档。
[接口索引](API-INDEX.md) 提供逐符号定位，[来源](05-sources.md) 提供固定版本资料。
