# Day 13 · Coding with Style：可读性、命名与接口契约

> **历史重建**：原邮件发送未成功。本文件依据既有课程记录重建，并作为 Chapter 3 的正式入口。

## ① 今日章节与建议阅读范围（5 分钟）

进入 Chapter 3 · **Coding with Style**。今天先建立三条主线：

- 可读性优先；
- 一致性优先；
- 让接口本身表达契约，而不是依靠调用者猜测。

## ② 昨日复习 3 问（5 分钟）

1. raw string literal 最适合解决什么问题？
2. 协议文本常量为什么适合 `constexpr std::string_view`？
3. 文本协议为什么仍必须明确 CR/LF 等实际字节边界？

## ③ 核心概念（15 分钟）

专业代码风格并不等于“排版漂亮”。它的目标是降低维护者理解代码所需的推理量。

### Reader-first

调用者应能从类型和名称中直接看出：

- 输入是什么；
- 输出是什么；
- 是否可能失败；
- 单位是什么；
- 谁拥有对象；
- 是否允许为空。

### Consistency

团队统一采用一套约定，比每个文件选择“个人最喜欢”的风格更重要。

### Contract

以下接口迫使调用者猜测：

```cpp
int Send(int type, int timeout, bool wait, bool retry);
```

更清晰的方向是强类型 + 配置对象。

## ④ C 写法 vs 现代 C++（10 分钟）

```c
int modem_attach(int mode, int timeout, int retry);
```

改为：

```cpp
#include <chrono>
#include <cstdint>

enum class AttachMode {
  kAutomatic,
  kManual,
};

struct AttachOptions {
  AttachMode mode{AttachMode::kAutomatic};
  std::chrono::milliseconds timeout{5000};
  std::uint8_t retry_count{2};
};
```

## ⑤ 今日编码规范（10 分钟）

### MUST：命名表达角色和单位

```cpp
auto timeout_ms = 5000;  // 至少明确单位
```

优先进一步使用：

```cpp
std::chrono::milliseconds timeout{5000};
```

### SHOULD：参数过多时使用 Options / Config

错误：

```cpp
Status Attach(int mode, int timeout, bool retry, bool force);
```

推荐：

```cpp
Status Attach(const AttachOptions& options);
```

### MUST：注释解释“为什么”

低价值：

```cpp
// Set timeout to 5000.
timeout_ms = 5000;
```

更有价值：

```cpp
// The module may take several seconds to register after RF is enabled.
timeout_ms = 5000;
```

## ⑥ 可编译小实验（20 分钟）

```cpp
#include <cassert>
#include <chrono>
#include <cstdint>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
};

enum class AttachMode {
  kAutomatic,
  kManual,
};

struct AttachOptions {
  AttachMode mode{AttachMode::kAutomatic};
  std::chrono::milliseconds timeout{5000ms};
  std::uint8_t retry_count{2};
};

class ModemSession {
 public:
  Status Attach(const AttachOptions& options) {
    if (options.timeout <= 0ms) {
      return Status::kInvalidArgument;
    }
    options_ = options;
    return Status::kOk;
  }

 private:
  AttachOptions options_{};
};

int main() {
  ModemSession modem;
  AttachOptions options;
  options.timeout = 3s;

  assert(modem.Attach(options) == Status::kOk);
}
```

### 规范修复练习

把下面接口重构成可读、可测试的设计：

```cpp
int cfg(int a, int b, bool c, bool d);
```

要求至少使用：

- 明确函数名；
- `enum class`；
- `Options`；
- 明确时间单位；
- 统一错误类型。

## ⑦ 3 个常见坑（5 分钟）

1. 通过长注释弥补糟糕接口，而不是先修接口。
2. 参数名称写得清楚，但类型依然允许误传。
3. 每个模块发明自己的命名风格。

## ⑧ 检查题（5 分钟）

1. “读者优先”为什么通常会推动更小的接口？
2. 多个 `bool` 参数为什么经常是 API smell？

**答案要点**：接口越小，契约越容易理解和测试；多个 `bool` 在调用点缺乏自描述性，且组合状态会快速增加。
