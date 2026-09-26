---
day: 17
week: 3
part: I
chapter: 3
chapter_title: Coding with Style
title: Errors, Assert and Clear Control Flow
duration: 60
status: published

topics:
  - error-handling
  - assert
  - control-flow
  - early-return

guidelines:
  - no-assert-for-recoverable-errors
  - early-return
  - strong-error-types
  - nodiscard-status

lab:
  path: examples/day-017/main.cpp

previous: 16
next: 18
---

# Day 17 · Coding with Style：错误处理、断言与清晰控制流

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 3 · **Coding with Style**。

今天只解决一个问题：

> 错误到底应该怎么表达、怎么检查，以及怎样让"出错时的代码路径"和正常路径一样清晰？

重点关注：

- programmer error vs recoverable error 的分界；
- `assert` 的正确位置（以及它在 release 构建里会消失）；
- error code → `enum class` → `std::expected` 的演进；
- early return 与深层嵌套的取舍；
- `[[nodiscard]]` 为什么是对调用者的契约；
- 嵌入式/无异常语境下的错误策略。

今天不讨论异常的语法细节（那是后面的章节），而是建立一个判断框架：
**这个错误是"代码写错了"，还是"世界不如预期"？** 答案决定一切。

## ② 昨日复习 3 问（5 分钟）

1. 为什么看到 warning 后直接加 `static_cast` 压掉，不等于修复了问题？
2. 编译器 warning 和 clang-tidy 的分工分别是什么？
3. 把 `.clang-format` 提交进仓库，对团队有什么好处？

建议先口头回答，再继续阅读。

## ③ 核心概念（12 分钟）

### 先分类：两种完全不同的"错误"

**Programmer error（代码的 bug）：**

- 空指针解引用、前置条件被违反、数组越界、逻辑上不可能到达的分支；
- 发生意味着代码错了，调用者给什么输入都救不回来；
- 对策：让它在开发期 loudly 失败 —— `assert`。

**Recoverable error（运行时的坏运气）：**

- 传感器超时、UART 帧校验失败、I2C NACK、超时、资源暂时不可用；
- 发生是正常的，系统必须有预案（重试、降级、上报）；
- 对策：用类型表达，走正常的控制流 —— 绝不用 `assert`。

这条分界线是今天最重要的观念。后面所有争论（assert 还是返回码、
early return 还是单一出口）都是它的推论。

### assert：开发期的 loud failure，不是运行时检查

```cpp
// 对：内部不变量，违反 = 代码有 bug
std::uint8_t RingBuffer::Pop() {
  assert(size_ > 0 && "Pop on empty buffer is a bug");
  // ...
}
```

三条铁律：

1. **assert 只断言"如果错了就是 bug"的东西**，比如前置条件、内部不变量、
   switch 里"逻辑上不可能"的 default；
2. **永远不要用 assert 检查外部输入、硬件状态、超时** —— release 构建
   （`NDEBUG`）下 assert 会被编译掉，你的"检查"就凭空消失了；
3. assert 的消息字符串要写清楚"谁错了"，方便 core dump 时定位。

嵌入式视角：很多固件的 release 构建确实定义了 `NDEBUG`。
如果你用 `assert(ptr != nullptr)` 来"检查" DMA 描述符是否有效，
release 版里这行就不存在了 —— bug 从 loud failure 变成 silent corruption。
这是最危险的一类误用。

### 错误表达：从 int 到类型

C 传统：

```cpp
// -1 表示失败，但为什么失败？调用者只能猜
int sensor_read(float* out);
```

问题：`-1` 不携带原因；调用者很容易忽略返回值；
错误码的含义散落在文档（或根本没有文档）里。

Modern C++ 的演进路线：

```cpp
enum class SensorError {
  kOk,
  kTimeout,
  kCrcMismatch,
  kNotCalibrated,
};

[[nodiscard]] SensorError ReadTemperature(float& out) noexcept;
```

- `enum class`：错误原因成为类型的一部分，强类型、可扩展；
- `[[nodiscard]]`：忽略返回值直接编译警告 —— 把"必须检查"写进契约；
- `noexcept`：在嵌入式/无异常语境下明确承诺不抛异常。

C++23 还有 `std::expected<T, E>`，把"值或错误"表达得更直接。
今天先建立观念，语法细节会在后续章节展开；但从现在起，
新代码不要再发明 `int` 错误码了。

### 清晰的控制流：让正常路径是直线

对比两种写法：

```cpp
// 深层嵌套：正常路径被埋在最里面
Status ProcessFrame(const Frame& frame) {
  Status s = Validate(frame);
  if (s == Status::kOk) {
    s = Decode(frame);
    if (s == Status::kOk) {
      s = Dispatch(frame);
      if (s == Status::kOk) {
        return Commit(frame);
      }
    }
  }
  return s;
}
```

```cpp
// early return：错误路径先行，正常路径是直线
Status ProcessFrame(const Frame& frame) {
  if (Status s = Validate(frame); s != Status::kOk) {
    return s;
  }
  if (Status s = Decode(frame); s != Status::kOk) {
    return s;
  }
  if (Status s = Dispatch(frame); s != Status::kOk) {
    return s;
  }
  return Commit(frame);
}
```

early return 的好处：每个 `if` 只处理一种失败；
读代码时"正常路径"从上到下是一条直线；
新增一个检查步骤只加三行，不增加缩进层级。

关于"单一出口"的争论：在需要手动释放资源的 C 代码里，
单一出口（goto cleanup）有历史原因。在 RAII 的 C++ 里，
资源由析构函数管理，early return 不会泄漏 ——
**让 RAII 承担清理，让控制流保持扁平**。

### switch on enum class：把"未处理"变成编译期问题

```cpp
enum class ModemState { kIdle, kDialing, kConnected, kError };

const char* ToString(ModemState state) {
  switch (state) {
    case ModemState::kIdle: return "idle";
    case ModemState::kDialing: return "dialing";
    case ModemState::kConnected: return "connected";
    case ModemState::kError: return "error";
  }
  // 注意：没有 default，没有兜底 return
}
```

配合 `-Werror=return-type`（昨天 Day 16 的内容），
将来给 `ModemState` 加一个新状态，编译器会立刻报错提醒你补分支。
这就是"让非法状态难以表示"在控制流上的体现。

## ④ C 写法 vs Modern C++（8 分钟）

### C 风格：int 错误码 + 深层嵌套 + 到处 assert

```cpp
#define SENSOR_OK 0
#define SENSOR_TIMEOUT -1
#define SENSOR_CRC_ERR -2

int sensor_read(float* out_temp) {
  assert(out_temp != NULL);  // 危险：release 下消失
  uint8_t raw[4];
  int rc = i2c_read(SENSOR_ADDR, raw, sizeof(raw), 100);
  if (rc == 0) {
    if (check_crc(raw)) {
      *out_temp = convert(raw);
      return SENSOR_OK;
    } else {
      return SENSOR_CRC_ERR;
    }
  } else {
    return SENSOR_TIMEOUT;
  }
}
```

真实问题：

- `assert` 被用来检查调用者传参 —— release 构建下形同虚设；
- `-1` / `-2` 的含义只存在于注释（如果注释还对得上的话）；
- 调用者 `sensor_read(&t);` 忽略返回值，编译器一声不吭；
- 超时单位 `100` 是什么？ms？tick？只能靠猜；
- 嵌套层级随检查项线性增长。

### Modern C++：强类型错误 + 早返回 + 契约

```cpp
enum class SensorError {
  kOk,
  kTimeout,
  kCrcMismatch,
};

[[nodiscard]] SensorError ReadTemperature(
    float& out_temp,
    std::chrono::milliseconds timeout) noexcept {
  std::array<std::uint8_t, 4> raw{};
  if (!I2cRead(kSensorAddress, raw, timeout)) {
    return SensorError::kTimeout;
  }
  if (!CheckCrc(raw)) {
    return SensorError::kCrcMismatch;
  }
  out_temp = Convert(raw);
  return SensorError::kOk;
}
```

此时：

- 错误原因是一个类型，不是魔法数字；
- `[[nodiscard]]` 让"忽略返回值"变成警告；
- `timeout` 带单位，`noexcept` 明确语义；
- 每个失败独立一行，正常路径是直线；
- 参数校验（`out_temp` 是引用，不可能为空）由类型系统保证，
  不需要 assert 来"检查调用者"。

### 不要把 early return 变成教条

early return 是手段，不是目的。如果函数需要在返回前做
"非 RAII 管理"的清理（比如关中断、恢复寄存器），
要么把清理包成 RAII guard，要么老老实实写清楚。
**规则服务于清晰，而不是相反。**

## ⑤ 今日编码规范（8 分钟）

### MUST：可恢复错误绝不用 assert 表达

assert 在 `NDEBUG` 下会被编译掉。用它检查超时、校验失败、
外部输入，等于在 release 构建里删除了检查。

### MUST：错误类型用 enum class，不用 int / 宏

错误原因必须是一个类型。调用者 switch 时能被编译器检查覆盖度；
新加一种错误时，所有处理点都会被提醒。

### SHOULD：返回状态的函数标记 [[nodiscard]]

如果"忽略返回值"在语义上是 bug，就用 `[[nodiscard]]` 把它变成
编译期问题，而不是 code review 时的人肉检查。

### SHOULD：错误路径 early return，保持正常路径扁平

先处理失败、尽早返回。正常逻辑从上到下应该是一条直线，
而不是嵌套在 4 层 if 里面的"彩蛋"。

### AVOID：深层嵌套的 if/else 链

超过 2 层嵌套是坏味道。拆小函数，或者反转条件 early return。

### AVOID：用 bool 表示"成功/失败"并丢掉原因

`bool` 只能回答"行不行"，回答不了"为什么不行"。
需要原因时用 `enum class` 或 `std::expected`。

## ⑥ 可编译实验（15 分钟）

实验目标：实现一个无异常、无动态分配的传感器读取模块，
演示今天的全部观念 —— 强类型错误、`[[nodiscard]]`、
early return、assert 只用于内部不变量。

完整代码：`examples/day-017/main.cpp`

```cpp
enum class SensorError {
  kOk,
  kTimeout,
  kCrcMismatch,
};

// 模拟硬件：偶数次调用超时，用来演示错误路径
[[nodiscard]] bool I2cRead(std::uint8_t address,
                           std::span<std::uint8_t> out,
                           std::chrono::milliseconds timeout) noexcept {
  assert(!out.empty() && "I2cRead with empty buffer is a bug");
  // ... 硬件交互（演示用桩）
}
```

编译并运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
    examples/day-017/main.cpp -o /tmp/day017 && /tmp/day017
```

预期输出：

```text
read 1: ok, temp=23.50
read 2: timeout, retrying...
read 2: ok, temp=23.75
read 3: crc mismatch, discarding frame
```

动手改一改：

1. 把 `ReadTemperature` 的 `[[nodiscard]]` 去掉，
   在 `main` 里故意忽略一次返回值，观察 `-Wall` 是否告警；
2. 在 `I2cRead` 的 `assert` 处传入空 `span`，
   用 `-DNDEBUG` 和不加分别编译，对比行为差异 ——
   亲手验证"assert 在 release 下消失"；
3. 给 `SensorError` 加一个 `kNotCalibrated`，
   看编译器在哪里提醒你补处理分支。

## ⑦ 3 个常见坑（3 分钟）

1. **用 assert 检查运行时错误**  
   超时、CRC 失败、用户输入是"世界不如预期"，不是 bug。
   assert 在 `NDEBUG` 下消失，你的检查会跟着消失。

2. **忽略 [[nodiscard]] 返回值**  
   错误码设计得再漂亮，调用者一行 `ReadTemperature(t, 100ms);`
   不看返回值就全白费。契约要写进类型系统，而不是文档。

3. **错误处理把正常路径埋了**  
   5 层嵌套的 if-else 里找"成功时发生了什么"，
   本身就是一种 bug 来源。先处理失败，让主路径是直线。

## ⑧ 检查题（4 分钟）

### Q1

下面这段代码至少有 3 个违反今日规范的问题，分别是什么？

```cpp
int uart_send(const uint8_t* data, int len) {
  assert(data != nullptr);
  assert(len > 0);
  for (int i = 0; i <= len; ++i) {
    UART->DR = data[i];
  }
  return 0;
}
```

### Q2

你的同事说："为了代码简单，所有函数出错都返回 `bool`，
调用者只关心成功失败。" 请用今天的观念反驳，
并给出一个嵌入式场景下 `bool` 不够用的具体例子。

**答案要点：**

Q1：

- 用 `assert` 检查调用者传参（`data`/`len` 是外部输入，
  release 下检查消失）；
- `int len` + `i <= len`：越界访问，应为 `size_t` 且 `<`；
  长度/边界问题用类型和循环条件保证，而不是事后 assert；
- 返回 `int` 但永远返回 0：错误模型是假的；
  应返回 `enum class` 错误类型并标记 `[[nodiscard]]`；
- `const uint8_t*` + 裸 `int`：边界没有类型化，
  应该用 `std::span<const std::uint8_t>`。

Q2：

- `bool` 丢掉了失败原因：超时（可重试）和 CRC 错误（应丢弃帧）
  的处理策略完全不同，调用者需要区分；
- 具体例子：Modem AT 命令发送失败时，重试、复位模组、
  上报网管是三种不同动作，`false` 无法指导选择；
- 扩展性：新增一种错误时 `bool` 接口不用改，
  所有调用点 silently 行为不变 —— 这恰恰是最危险的。

## 下一步

Day 18 是 Chapter 3 收官：**函数边界、控制流与可维护性** ——
把今天"错误与控制流"的观念，扩展到函数设计、
参数对象和模块边界上。
