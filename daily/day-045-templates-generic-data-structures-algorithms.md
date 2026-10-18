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

## ① 今日章节与建议阅读范围（5 分钟）

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

### Q1

什么时候 `template/concept` 比 virtual interface 更适合作为 reusable abstraction？

### Q2

为什么 `FixedQueue<T, Capacity>` 中的 `Capacity` 应被视为接口 contract，而不是实现细节？

**答案要点：**

- 类型和策略在编译期已知、需要静态检查/内联且不需要运行时替换时，模板通常合适；
- 固定容量直接决定内存上界和满队列行为，对实时性与调用者错误处理都有可观察影响。

---

## 今日 Code Review 快检

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