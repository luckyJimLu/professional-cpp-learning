# OpenHarmony Mini System 启动流程

> 从 MCU 上电到 LiteOS-M 调度、`OHOS_SystemInit()`、SAMGR 服务启动以及业务线程运行的完整路径。

OpenHarmony Mini（L0）面向 MCU 类处理器。与小型/标准系统不同，Mini 采用单进程多线程模型，内核、系统服务和应用通常静态链接到同一镜像中。启动过程可以理解为四层接力：**硬件引导 → RTOS 内核 → OpenHarmony 框架 → 应用业务**。

## 1. 全景启动流程

```mermaid
flowchart TD
    A[上电 / Reset] --> B[ROM Boot]
    B --> C[Bootloader / FlashBoot]
    C --> D[reset_vector.S / startup.S]
    D --> D1[屏蔽中断 / 设置 CPU 模式]
    D1 --> D2[初始化 SP]
    D2 --> D3[复制 .data: Flash → SRAM]
    D3 --> D4[清零 .bss]
    D4 --> E[main 板级入口]

    E --> F[板级早期初始化\nClock / UART / PinMux]
    F --> G[LOS_KernelInit]
    G --> G1[OsMemSystemInit\nHeap]
    G1 --> G2[OsHwiInit\nInterrupt / NVIC]
    G2 --> G3[OsTaskInit\nTCB / Ready Queue / Idle]
    G3 --> G4[IPC / Software Timer\nSem / Mux / Queue / Swtmr]
    G4 --> H[创建 SystemInit 初始化任务]
    H --> I[LOS_Start]
    I --> I1[配置 SysTick]
    I1 --> I2[开启中断]
    I2 --> I3[第一次上下文切换]

    I3 --> J[OHOS_SystemInit]
    J --> K[遍历 .zinitcall.*]
    K --> L[MODULE_INIT\nbsp / device / core]
    L --> M[SYS_INIT\nservice / feature]
    M --> N[向 SAMGR 注册服务 / Feature / 业务入口]
    N --> O[SAMGR_Bootstrap]
    O --> P[按初始化级别拉起服务]
    P --> Q[创建/共享 LiteOS-M 服务线程和消息队列]
    Q --> R[SYS_RUN / APP_RUN]
    R --> S[用户业务线程 / CMSIS-RTOS2 / LOS_TaskCreate]
    R --> T[可选 ACE Lite / JS Ability]
```

## 2. 四层职责图

```mermaid
flowchart LR
    subgraph HW[阶段 1：硬件引导]
      A1[Reset Vector] --> A2[ROM Boot] --> A3[Bootloader] --> A4[startup.S]
    end

    subgraph KERNEL[阶段 2：LiteOS-M]
      B1[main] --> B2[LOS_KernelInit] --> B3[SystemInit Task] --> B4[LOS_Start]
    end

    subgraph OHOS[阶段 3：OpenHarmony Framework]
      C1[OHOS_SystemInit] --> C2[MODULE_INIT] --> C3[SYS_INIT] --> C4[SAMGR_Bootstrap]
    end

    subgraph APP[阶段 4：Application]
      D1[APP_SERVICE / FEATURE] --> D2[SYS_RUN / APP_RUN] --> D3[业务线程 / ACE Lite]
    end

    HW --> KERNEL --> OHOS --> APP
```

## 3. LiteOS-M 内核初始化

`LOS_KernelInit()` 建立调度器运行所需的核心数据结构，但真正开始执行任务是在 `LOS_Start()` 之后。

```mermaid
flowchart TD
    A[LOS_KernelInit] --> B[OsMemSystemInit]
    A --> C[OsHwiInit]
    A --> D[OsTaskInit]
    A --> E[IPC Init]
    A --> F[Software Timer Init]
    B --> G[Heap Ready]
    C --> H[Interrupt Ready]
    D --> I[TCB + Ready Queue + Idle Task]
    E --> J[Sem / Mux / Queue Ready]
    F --> K[Swtmr Ready]
    G --> L[Kernel Ready]
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M[LOS_Start]
    M --> N[SysTick + IRQ Enable]
    N --> O[Scheduler owns CPU]
```

关键边界：`LOS_KernelInit()` 是**初始化内核对象**；`LOS_Start()` 是**把 CPU 控制权交给调度器**。此后 `main()` 不再作为普通顺序程序继续承担系统控制职责。

## 4. OHOS_SystemInit 与链接段机制

Mini 没有依赖动态加载器去发现服务，而是在编译/链接阶段把初始化入口组织进 `.zinitcall.*` 等链接段。启动时 `OHOS_SystemInit()` 按既定阶段遍历这些函数指针。

```mermaid
flowchart TD
    A[编译期初始化宏] --> B[函数/结构注册]
    B --> C[Linker Script]
    C --> D[.zinitcall.* Sections]
    D --> E[OHOS_SystemInit]
    E --> F[MODULE_INIT]
    F --> G[SYS_INIT service / feature]
    G --> H[SAMGR registry]
    H --> I[SAMGR_Bootstrap]
```

这是一种很值得 C/C++ 工程学习的模式：**宏 + section attribute + linker script + function pointer table**，把“模块发现”从运行期动态加载转化为链接期静态注册。

## 5. SAMGR 启动优先级

```mermaid
flowchart TD
    A[SAMGR_Bootstrap] --> L1[1 CORE_INIT\n核心平台服务]
    L1 --> L2[2 SYS_SERVICE_INIT\n系统服务]
    L2 --> L3[3 SYS_FEATURE_INIT\n系统 Feature]
    L3 --> L4[4 APP_SERVICE_INIT\n应用服务]
    L4 --> L5[5 APP_FEATURE_INIT\n应用 Feature]
    L5 --> L6[6 SYS_RUN / SYSEX_ov\n启动函数]
    L6 --> L7[7 APP_RUN\n业务执行]
    L7 --> L8[8 TEST_RUN\n测试]
```

| Level | 初始化入口 | 主要职责 |
|---|---|---|
| 1 | `CORE_INIT` | 底层核心基础设施 |
| 2 | `SYS_SERVICE_INIT` | 核心系统服务 |
| 3 | `SYS_FEATURE_INIT` | 系统服务下的 Feature |
| 4 | `APP_SERVICE_INIT` | 外围/用户服务 |
| 5 | `APP_FEATURE_INIT` | 应用 Feature |
| 6 | `SYS_RUN()` | 常见 C 原生业务入口 |
| 7 | `APP_RUN` | 高层业务执行 |
| 8 | `TEST_RUN` | 测试套件 |

## 6. Service 的线程与消息模型

SAMGR 不只是按顺序调用初始化函数。Service 可以依据 `TaskConfig` 获得独立 LiteOS-M 线程，或共享线程资源，并通过消息队列进行异步通信。

```mermaid
flowchart LR
    A[SAMGR_Bootstrap] --> B[Service A]
    A --> C[Service B]
    A --> D[Service C]
    B --> E[TaskConfig]
    C --> F[TaskConfig]
    D --> G[TaskConfig]
    E --> H[LiteOS-M Task / Shared Task]
    F --> I[LiteOS-M Task / Shared Task]
    G --> J[LiteOS-M Task / Shared Task]
    H <--> Q[Message Queue]
    I <--> Q
    J <--> Q
```

## 7. 从启动流程理解嵌入式 C/C++

这条启动链可以映射到几个重要工程知识点：

- `startup.S → main()`：理解 ABI、栈、`.data/.bss` 与 C/C++ runtime 前置条件。
- `LOS_KernelInit → LOS_Start`：区分“构造调度器状态”和“真正进入并发执行”。
- `.zinitcall.*`：理解链接脚本、ELF section、静态注册和函数指针表。
- `SAMGR_Bootstrap`：理解 Service/Feature 生命周期和依赖顺序。
- `TaskConfig + Queue`：理解线程所有权、异步消息、共享线程和资源约束。
- `SYS_RUN → osThreadNew / LOS_TaskCreate`：理解框架入口与业务线程之间的边界。

## 8. 一句话记忆

```text
Reset
  → ROM/Bootloader
  → startup.S 建立 C 运行环境
  → main
  → LOS_KernelInit 建立 RTOS 内核
  → LOS_Start 开始调度
  → OHOS_SystemInit 扫描静态初始化表
  → SAMGR_Bootstrap 拉起 Service/Feature
  → SYS_RUN / APP_RUN
  → 用户业务线程持续运行
```

> 学习重点不是只记函数名，而是抓住控制权转移：**硬件 → C runtime → RTOS scheduler → OpenHarmony framework → application tasks**。
