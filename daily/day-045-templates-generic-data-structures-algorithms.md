---
day: 45
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Use Templates for Generic Data Structures and Algorithms
duration: 60
status: published
date: 2026-10-11
topics:
  - templates
  - generic-programming
  - reusable-algorithms
  - static-polymorphism
  - bounded-containers
guidelines:
  - explicit-template-contracts
  - bounded-storage
  - avoid-unnecessary-instantiations
lab:
  path: examples/day-045/main.cpp
previous: 44
next: 46
---

# Day 45 · Use Templates for Generic Data Structures and Algorithms

<!-- cpp-standards:start -->
## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性 | 首次标准化 | 版本边界 |
| --- | --- | --- |
| 列表初始化 | **C++11** | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。 |
| `constexpr` | **C++11** | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `static_assert` | **C++11** | 省略诊断字符串的单参数形式从 C++17 起可用。 |
| `nullptr` | **C++11** | 空指针字面量；不要与整数 0 的类型混为一谈。 |
| `enum class` | **C++11** | 有作用域枚举。 |
| `[[nodiscard]]` | **C++17** | 带说明字符串的形式从 C++20 起可用。 |
| Concepts / `requires` / `<concepts>` | **C++20** | 语言约束与标准库概念；`std::concepts` 不是标准命名空间。 |
| `std::array` | **C++11** | 固定大小容器。 |
| 移动语义 / `std::move` / `std::forward` | **C++11** | `std::move` 本身执行类型转换，不直接搬运资源。 |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。
<!-- cpp-standards:end -->

## ① 今日章节与建议阅读范围（5 分钟）

### 新手起步：先知道今天在解决什么

先手写“存整数、容量 3 的队列”，再把元素类型和容量变成参数。模板复用的是同一规则，不是替你定义队列的满与空语义。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 5](day-005-pointers-nullptr-bounds.md)、[Day 28](day-028-class-invariants-minimal-interface.md)、[Day 41](day-041-reuse-contracts-components.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 6 · **Designing for Reuse**，进入 **Use Templates for Generic Data Structures and Algorithms**。

今天不把重点放在模板语法技巧，而是回答一个设计问题：

> 当算法或数据结构真正只依赖“能力”而不依赖某个具体类型时，怎样把它写成可复用、可检查、对嵌入式资源成本可预测的泛型组件？

建议阅读时重点关注：

- 泛型数据结构与泛型算法为什么比复制粘贴多个类型版本更可维护；
- 模板参数代表的 contract；
- compile-time polymorphism 与 runtime polymorphism 的取舍；
- 泛型组件不应泄漏平台细节；
- 嵌入式环境必须关注实例化数量、代码体积和有界存储。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么 logger、retry、storage 不应该无条件塞进一个 reusable component？
2. policy、mechanism、observation 分离后，谁负责 orchestration？
3. 为什么 service locator 虽然看起来解耦，却可能隐藏 ownership 与实时成本？

---

## ③ 核心概念（12 分钟）

### 先用白话建立概念

- **模板参数**：编译期提供的类型或值。
- **concept**：约束模板可接受操作的条件。

### 跟着本课实验走一遍

1. 读固定容量与正容量检查。
2. Push 三个值。
3. 第四次失败。
4. 按顺序 Pop。
5. 验证空队列行为。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

### 1. 泛型不是“任何类型都能传”

下面的算法实际上有 contract：元素必须能比较。

```cpp
template <typename T>
const T& Max(const T& lhs, const T& rhs) {
  return lhs < rhs ? rhs : lhs;
}
```

真正重要的不是 `T`，而是算法需要什么能力。

C++23 中可以用 concept 把这个要求写得更明确：

```cpp
#include <concepts>

template <typename T>
concept LessComparable = requires(const T& lhs, const T& rhs) {
                           { lhs < rhs } -> std::convertible_to<bool>;
                         };

template <LessComparable T>
const T& Max(const T& lhs, const T& rhs) {
  return lhs < rhs ? rhs : lhs;
}
```

### 2. 数据结构应把容量策略显式化

嵌入式实时路径中，固定容量往往比隐藏 heap allocation 更容易审计：

```cpp
template <typename T, std::size_t Capacity>
class FixedQueue;
```

`Capacity` 是设计 contract 的一部分，而不是 magic number。

### 3. 泛型算法应依赖最小能力

如果算法只需要遍历，就不要要求 `std::vector`：

```cpp
template <typename Range>
std::size_t CountErrors(const Range& statuses);
```

这使 `std::array`、固定容量容器以及测试数据都可以复用同一算法。

### 4. static polymorphism 不是 runtime polymorphism 的替代品

模板适合：

- 类型在编译期已知；
- 性能路径希望内联；
- 不需要运行时替换实现。

virtual interface 更适合：

- 驱动在运行时选择；
- plugin/backend 动态替换；
- 需要稳定 ABI 边界。

设计应由变化时机决定，而不是追求某一种机制。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：为每种元素复制容器

```c
struct byte_queue {
  unsigned char data[16];
  unsigned int size;
};

struct event_queue {
  struct event data[16];
  unsigned int size;
};
```

结构相同，却需要维护两套 push/pop/bounds logic。

### Modern C++：把真正变化的维度参数化

```cpp
template <typename T, std::size_t Capacity>
class FixedQueue {
public:
  bool Push(const T& value);
  bool Pop(T& value);

private:
  std::array<T, Capacity> data_{};
  std::size_t head_{0};
  std::size_t tail_{0};
  std::size_t size_{0};
};
```

这里复用的是“固定容量 FIFO”这个概念，而元素类型和容量成为显式参数。

---

## ⑤ 今日编码规范（10 分钟）

### MUST：模板参数的要求必须可读

错误：

```cpp
template <typename T>
auto Send(T& x) {
  return x.Write();
}
```

调用者只有在模板深处报错时才知道 `T` 需要 `Write()`。

推荐：

```cpp
#include <concepts>

class Status;

template <typename T>
concept Writable = requires(T& writer) {
                     { writer.Write() } -> std::same_as<Status>;
                   };

template <Writable T>
Status Send(T& writer) {
  return writer.Write();
}
```

### MUST：实时路径中的泛型容器必须有可审计的容量/分配策略

错误：

```cpp
std::vector<Event> events;
events.push_back(event);  // 可能扩容
```

推荐：

```cpp
FixedQueue<Event, 32U> events;
if (!events.Push(event)) {
  return Status::kFull;
}
```

### SHOULD：避免无意义的模板实例化爆炸

错误方向：

```cpp
template <typename Driver, typename Logger, typename Clock, typename Retry, typename Storage,
          typename Metrics>
class EverythingManager;
```

推荐：只参数化真正需要 compile-time variation 的维度；复杂独立依赖仍优先 composition / runtime interface。

---

## ⑥ 可编译实验 / 练习（15 分钟）

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-045/main.cpp`](../examples/day-045/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 用另一种简单值类型实例化同一队列并重复边界测试；容量 0 的负例只做独立编译试验。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

实验文件：

```text
examples/day-045/main.cpp
```

实验实现一个无 heap allocation 的 `FixedQueue<T, Capacity>`，并用 concept 约束一个可复用的 drain algorithm。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-045/main.cpp -o day045
./day045
```

### 修复违规代码

```cpp
template <typename T>
class Queue {
public:
  void Push(T value) {
    data_.push_back(value);
  }

private:
  std::vector<T> data_;
};
```

请修复：

1. 实时路径存在无界动态分配；
2. 没有容量 contract；
3. `Push()` 无法报告满队列；
4. 对大对象可能发生不必要复制；
5. 泛型接口没有说明元素能力要求。

---

## ⑦ 3 个常见坑（3 分钟）

1. **把 template 当成减少重复代码的万能工具**：先确认变化维度是否真的是 compile-time variation。
2. **忽略模板的资源成本**：不同参数组合可能产生不同实例，嵌入式必须检查 flash/RAM/map file。
3. **泛型接口要求过多能力**：算法只需要遍历就不要绑定具体容器，只需要比较就不要要求完整对象接口。

---

## ⑧ 检查题（2 分钟）

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 满足 concept 就保证算法语义正确吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

不能；约束主要检查表达式和类型关系，顺序、异常保证、复杂度等仍需约定与测试。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

### Q1

什么时候 `template/concept` 比 virtual interface 更适合作为 reusable abstraction？

### Q2

为什么 `FixedQueue<T, Capacity>` 中的 `Capacity` 应被视为接口 contract，而不是实现细节？

**答案要点：**

- 类型和策略在编译期已知、需要静态检查/内联且不需要运行时替换时，模板通常合适；
- 固定容量直接决定内存上界和满队列行为，对实时性与调用者错误处理都有可观察影响。

---

### 对照现有资料库

- [模式选型工作坊](<../patterns/engineering-workshop.md>)。
- [复用契约章末评审](<../docs/chapter-06-review.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。

### 今日 Code Review 快检
- [ ] template 参数是否代表真实变化维度
- [ ] concept / requires 是否表达最小能力 contract
- [ ] 实时容器容量是否有界
- [ ] 是否隐藏 heap allocation
- [ ] 是否产生不必要的模板实例化
- [ ] ownership / lifetime 是否仍然清晰
- [ ] 错误模型是否能表达 full / invalid / timeout
- [ ] 编译告警与边界测试是否覆盖容量 0/1/满队列

## 下一步

Day 46 继续 Chapter 6，沿教材顺序学习后续 reusable design 主题。
