# Day 31 · 对象所有权、生命周期与资源管理边界

> **历史重建**：当天课程已生成但邮件投递失败。本文件依据既有主题记录恢复为 Markdown。

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 5 · **Designing with Classes**。从 Day 30 的 composition 进一步追问：

> 一个成员到底是 **owned**、**borrowed**，还是只在调用期间临时使用？

## ② 昨日复习 3 问（5 分钟）

1. `has-a` 为什么不等于 `owns-a`？
2. 什么时候成员引用比 `shared_ptr` 更清晰？
3. 为什么组合通常比“为了复用实现而继承”更容易维护？

## ③ 核心概念（15 分钟）

### Ownership

负责资源生命周期结束的对象才是 owner。

### Borrowing

借用对象不负责销毁资源，要求被借用对象活得更久。

### RAII

把资源释放和对象生命周期绑定，使 cleanup 不依赖手工路径。

### 嵌入式中的重点

在 RTOS / Driver / Modem 工程中，常见做法是：

- 启动阶段构建 ownership tree；
- 运行期通过引用借用长期存在的驱动对象；
- hard real-time path 避免 heap allocation；
- 只有确实存在所有权转移时才使用 `std::unique_ptr`。

## ④ C 写法 vs 现代 C++（10 分钟）

### C：所有权靠约定

```c
struct Modem {
  struct Uart* uart;
};

void modem_deinit(struct Modem* modem) {
  free(modem->uart);  // uart 真的是 modem 创建的吗？
}
```

### C++：借用直接写进类型

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

 private:
  ITransport& transport_;  // non-owning borrow
};
```

若对象真正独占一个运行期创建的实现：

```cpp
std::unique_ptr<ITransport> transport_;
```

## ⑤ 今日编码规范（10 分钟）

### MUST：默认单一所有者

能够明确唯一 owner 时，不要使用共享所有权。

### SHOULD：借用使用引用或裸指针

- required borrow → reference
- optional borrow → pointer，并明确 `nullptr` 语义

### MUST：实时路径避免动态分配

对象图尽量在初始化阶段建立。

### 错误写法

```cpp
class ModemSession {
 public:
  explicit ModemSession(std::shared_ptr<ITransport> transport)
      : transport_(std::move(transport)) {}

 private:
  std::shared_ptr<ITransport> transport_;
};
```

如果会话不需要共享拥有 transport，这会模糊生命周期。

### 推荐写法

```cpp
class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

 private:
  ITransport& transport_;
};
```

## ⑥ 可编译实验（20 分钟）

```cpp
#include <array>
#include <cassert>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <span>

using namespace std::chrono_literals;

enum class Status {
  kOk,
  kInvalidArgument,
  kTimeout,
};

class ITransport {
 public:
  virtual ~ITransport() = default;
  virtual Status Write(std::span<const std::uint8_t> data,
                       std::chrono::milliseconds timeout) = 0;
};

class FakeTransport final : public ITransport {
 public:
  Status Write(std::span<const std::uint8_t> data,
               std::chrono::milliseconds timeout) override {
    if (data.empty()) {
      return Status::kInvalidArgument;
    }
    if (timeout <= 0ms) {
      return Status::kTimeout;
    }
    last_size_ = data.size();
    return Status::kOk;
  }

  [[nodiscard]] std::size_t LastSize() const { return last_size_; }

 private:
  std::size_t last_size_{0};
};

class ModemSession {
 public:
  explicit ModemSession(ITransport& transport) : transport_(transport) {}

  Status Send(std::span<const std::uint8_t> data,
              std::chrono::milliseconds timeout) {
    return transport_.Write(data, timeout);
  }

 private:
  ITransport& transport_;
};

int main() {
  FakeTransport transport;
  ModemSession modem{transport};

  constexpr std::array<std::uint8_t, 4> kAt{0x41, 0x54, 0x0D, 0x0A};

  assert(modem.Send(kAt, 100ms) == Status::kOk);
  assert(transport.LastSize() == kAt.size());
}
```

### 修复练习

找出问题：

```cpp
ITransport& MakeTransport() {
  FakeTransport transport;
  return transport;
}
```

说明为什么返回的是 dangling reference，并重构生命周期。

## ⑦ 3 个常见坑（5 分钟）

1. 把 `shared_ptr` 当作“省事指针”。
2. 把 borrowed raw pointer 误当成 owning pointer。
3. 对象销毁顺序与引用成员生命周期不匹配。

## ⑧ 检查题（5 分钟）

1. required non-owning dependency 更适合引用还是 `unique_ptr`？
2. `unique_ptr` 最重要的语义是什么？

**答案要点**：引用；`unique_ptr` 表达独占所有权以及可移动的所有权转移。
