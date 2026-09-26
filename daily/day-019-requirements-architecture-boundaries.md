# Day 19 · Designing Professional C++ Programs：从需求到架构边界

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 4 · Designing Professional C++ Programs**

主题：从需求到架构边界
今天正式进入 Part II：从“写好一个函数”上升到“先设计程序，再写代码”。
## ① 今日章节与建议阅读范围（5 分钟）

阅读 Chapter 4 开始部分，关注专业程序设计、需求、设计与实现之间的关系。阅读时不断问：系统负责什么？哪些变化应该被隔离？组件之间交换什么？

## ② 昨日复习 3 问（5 分钟）

- 为什么可恢复的 Modem timeout 不应使用 assert？

- early return 如何降低嵌套复杂度？

- enum class 相比 int 状态码提供什么静态保证？

## ③ 核心概念讲解（15 分钟）

专业 C++ 程序设计不是先决定“我要几个 class”，而是先识别职责、变化轴和依赖方向。嵌入式项目尤其应区分 Policy 与 Mechanism：Attach 策略不直接操作 UART 寄存器；协议解析不应知道 RTOS queue；BSP/Driver 把平台差异压在系统边缘。

一个实用判断是：如果硬件型号改变，哪些代码必须变化？如果协议改变，哪些代码必须变化？ 两个答案如果高度重叠，边界通常划错了。

目标依赖方向

Application / Policy
↓
ModemSession
↓
Transport capability
↓
UART / RTOS / BSP / MMIO

## ④ C 写法 vs 现代 C++ 写法（10 分钟）

C 风格：依赖隐藏在全局环境中

```c
int g_state;
int modem_attach(bool verbose) {
uart_write("AT+CGATT=1\r\n");
return uart_wait(5000);
}
```

现代 C++：让依赖与配置出现在接口上

```cpp
enum class Status { kOk, kTimeout, kIoError };
```

```cpp
struct SessionOptions {
std::chrono::milliseconds timeout;
};

class Transport {
```
public:
```cpp
virtual Status Send(std::string_view data) = 0;
```
virtual Status Receive(std::span<char> out,
```cpp
std::chrono::milliseconds timeout) = 0;
virtual ~Transport() = default;
};
```

## ⑤ 今日编码规范（10 分钟）

MUST：接口小而明确，并显式表达依赖。
MUST：避免可写全局状态。
SHOULD：平台差异集中隔离。

不要在业务逻辑内部散落 #ifdef BOARD_A。让 BoardA/BoardB 的差异停留在 Driver/BSP 层；让 timeout 进入 SessionOptions；让 transport 作为借用依赖进入对象。

违反规范

```cpp
extern int g_timeout_ms;
extern int g_state;
```
int Attach(); // 依赖全部隐藏

推荐写法

```cpp
class ModemSession {
```
public:
```cpp
ModemSession(Transport& transport, SessionOptions options)
: transport_(transport), options_(options) {}
```

```cpp
Status Attach();
```

private:
Transport& transport_; // 借用，不拥有
```cpp
SessionOptions options_;
};
```

## ⑥ 可编译小实验 / 代码练习（20 分钟）

实现一个 ModemSession：Attach() 只编排 AT 命令流程，不访问 UART/MMIO；输入输出使用有界视图；无全局可写状态；无 magic timeout；实时路径不新增动态分配。

练习 A：实现一个 FakeTransport，记录最后发送的命令，并让 Receive 可配置返回 kOk/kTimeout/kIoError。验证 ModemSession 无需真实 UART 就能测试。

练习 B — Code Review 修复：把一个同时包含 uart_write、volatile UART_REG、5000 magic timeout、g_state 和 #ifdef BOARD_A 的 modem_attach(bool verbose) 拆成至少三层：

Board/UART Driver → Transport → ModemSession

并为每层写一句“它为什么会变化”。这比单纯画类图更重要。

编译

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
modem_session.cpp -o modem_session
```

## ⑦ 3 个常见坑（5 分钟）

- 设计阶段立即制造大量 class，却没有识别变化轴。

- 建立巨大的 IPlatform，把几十个无关能力塞进一个接口。

- 为了“解耦”到处使用 shared_ptr，导致生命周期与所有权反而更模糊。

## ⑧ 2 道检查题（5 分钟）

- 为什么 ModemSession 依赖 Transport 能力比直接依赖 UartDriver 更容易测试和复用？

- 若 Transport 由系统静态创建且保证长于 ModemSession，引用、裸指针、unique_ptr、shared_ptr 中哪一种最直接表达“借用而不拥有”？为什么？

C++23 工具链提示：本课主要使用 string_view、span、chrono、enum class 等成熟设施。嵌入式交叉工具链应按实际标准库能力验证，不能只看编译器版本。

明日：继续 Chapter 4，深入需求分析、组件职责与接口契约。
