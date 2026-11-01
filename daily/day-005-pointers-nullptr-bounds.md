# Day 05 · 指针、nullptr 与数组边界

<!-- cpp-standards:start -->

## 本课涉及的 C++ 标准

以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。

| 特性                             | 首次标准化 | 版本边界                                                                                     |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| 列表初始化                       | **C++11**  | 包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。                         |
| `constexpr`                      | **C++11**  | C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。 |
| `nullptr`                        | **C++11**  | 空指针字面量；不要与整数 0 的类型混为一谈。                                                  |
| `auto` 类型推导                  | **C++11**  | C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。                   |
| `<cstdint>` 固定宽度整数         | **C++11**  | 精确宽度类型仅在实现提供对应整数类型时存在。                                                 |
| `std::array`                     | **C++11**  | 固定大小容器。                                                                               |
| `std::optional` / `std::nullopt` | **C++17**  | 可选值；不自带错误原因。                                                                     |
| `std::span`                      | **C++20**  | 连续序列的非拥有视图；不自动延长底层对象生命周期。                                           |

版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。

<!-- cpp-standards:end -->

指针、nullptr 与数组边界

**Chapter 1 · 今日目标：把 C 的地址操作升级为“可空性、借用关系与边界显式化”的现代 C++ 接口思维。**

## ① 今日阅读范围 · 5分钟

### 新手起步：先知道今天在解决什么

先判断是否有对象可访问，再判断有多少元素可访问。指针非空不代表缓冲区足够长；`span` 携带长度，但不延长底层数组的生命周期。这句话高度概括了 C++ 内存安全与视图（View）设计的三个核心防御原则：**存在性校验**，**边界（长度）校验**与**所有权/生命周期管理**。结合底层机制与具体代码场景，可以从以下三个维度拆解：

**1. 指针非空不代表缓冲区足够长（“是否有对象” vs “有多少元素”）**
在 C/C++ 中，“并非所有指针都是数组”。编译器允许在期望传入指针的地方传入数组，但这只传递了首地址，丢失了容量信息：

- **判空只解决“有没有对象可访问”**：检查 `ptr != nullptr` 只能确认指针指向了某个内存位置（例如判断网络接收函数 `getMoreData()` 是否还返回了数据块）。

- **缺乏长度校验会导致缓冲区分配不足与越界（Out-of-Bounds Memory Access）**：即使指针非空，如果你假定目标缓冲区足够大，或者处理的 C 风格字符串丢失了末尾的 `'\0'` 终止符，直接写入数据就会越过分配的边界覆写未知内存，最终导致核心内存被破坏甚至程序崩溃。

  ```cpp
  char buffer[1024] { 0 };
  while (true) {
      char* nextChunk { getMoreData() };
      if (nextChunk == nullptr) { // 1. 仅判断了是否有对象可访问
          break;
      } else {
          // 2. BUG! nextChunk 非空，但完全没有检查 buffer 剩余空间是否够长！
          strcat(buffer, nextChunk); 
          delete [] nextChunk;
      }
  }
  ```

要解决这类问题，要么改用自动管理内存的 C++ `std::string` / `std::vector`，要么显式传入并追踪最大可容纳元素数量（即在确认非空后，继续校验“有多少元素可访问”，如 `inRange(x, m_width)` 或 `x >= m_size`）。

**2. `std::span` 携带长度：把“地址 + 元素数量”绑定为统一视图**
为了避免裸指针丢失长度信息或为不同容器重复编写重载函数，C++20 引入了定义在 `<span>` 中的 `std::span`：

- **封装指针与大小**：`std::span` 本质上包含两个数据成员：**指向序列首个元素的指针**以及**元素的数量（size）**。它提供了 `size()`、`empty()`、`front()`、`back()`、`subspan()` 等成员函数，让你在访问前能够精确获知“有多少个元素可访问”（例如在 `findMatches()` 中先校验 `if (values1.size() != values2.size()) return;`）。

- **统一连续内存接口**：`std::span` 可以无缝接收 `std::vector`、`std::array` 或原生 C 风格数组（以及它们的局部切片 subview），而且由于它只包含一个指针和一个计数值，拷贝开销极低，通常直接**按值传递**（Pass by Value）。当函数不需要修改元素时，推荐使用 `std::span<const T>` 替代 `const std::vector<T>&`。

**3. `std::span` 不延长底层数组的生命周期（非拥有式的引用语义风险）**
虽然 `std::span` 解决了“携带长度”的问题，但它与 `std::string_view` 一样属于**非拥有式视图（Non-owning View）**，遵循**引用语义（Reference Semantics）**：

- **绝不拷贝或拥有数据**：`std::span` 从不拷贝底层元素，也不负责管理底层容器的内存生命周期；真正拥有数据的是底层的容器（如 `std::vector` 或数组）。

- **底层扩容或销毁会导致悬垂视图（Undefined Behavior）**：如果底层容器在 `std::span` 存活期间发生了内存重新分配（Reallocation）或销毁，`std::span` 内部保存的旧指针并不会收到通知，从而瞬间变成悬垂指针。

  ```c++
  std::vector<int> v{ 1, 2, 3, 4 };
  std::span<int> const s{ v }; // s 记录了当前 v 的首元素地址和长度 4
  
  v = { 5, 6, 7, 8, 9 }; // v 元素增加到 5 个，触发重新分配内存，原数组内存已被丢弃！
  
  s[2] = 99; // 严重 BUG（未定义行为）！s 依然死死抓住旧地址，写入了已被释放的内存！
  print( s );
  ```

- **工程实践准则**：正因为 `std::span` 和 `std::string_view` 不会延长底层数据的生命周期，它们非常适合作为**函数参数**使用（在函数调用期间底层实参通常保持存活且稳定），但**切忌将它们作为类的数据成员长期存储**，否则极易引发严重的生命周期悬垂问题。

**前置检查：** 先能解释 [Day 2](day-002-variables-initialization-casts.md)、[Day 4](day-004-references-parameter-passing.md) 的核心例子；不必先掌握整本教材。

**本课最低完成目标：** 能按下面的步骤说明示例如何得到结果，并独立完成一项小修改；高级模式与平台性能分析可第二遍再读。新增导读和拓展练习不计入原有约 60 分钟安排，可分两次完成。

继续 Chapter 1 的 pointers、nullptr、arrays。重点观察 nullptr、裸指针借用语义，以及数组退化后长度信息为何丢失。

## ② 昨日复习 · 5分钟

**1. `const T&` 通常表达什么语义？**
`const T&`（即对 `const` 的引用，等价于 `T const&`）在 C++ 中通常表达“非拥有的只读别名”语义：

- **只读访问契约（不可通过该引用修改对象）**：引用本质上是目标变量的别名，将 `const` 应用于引用会阻止通过该引用对目标进行赋值或调用非 `const` 成员函数（例如 `const int& zRef { z }; zRef = 4;` 会编译报错），但它不会限制原变量 `z` 本身通过其他途径被直接修改。

- **零拷贝传递与绑定临时对象（右值）**：作为函数参数或只读返回值（如 `const SpreadsheetCell& getCellAt(...) const`）时，它既避免了按值拷贝大对象的性能开销，又支持直接绑定到无名常量（字面量）或临时对象（如 `const int& unnamedRef2 { 5 };` 或绑定函数按值返回的 `std::string` 临时对象），而普通非 `const` 左值引用 `T&` 则不允许绑定临时对象。

- **明确的不拥有（Non-owning）语义**：当函数接收引用时，语义非常清晰——被调用方只能读取（对于 `const T&`）该对象，绝不拥有该对象的内存，也不负责释放它。

**2. 何时 `T*` 比 `T&` 更合理？**
虽然引用（`T&`）语法更整洁且不可能为空，但在以下典型场景中，使用裸指针 `T*`（或 `const T*`）比引用更合理：

- **需要改变指向的目标（Rebinding）**：引用一旦在初始化时绑定到某个特定变量，终生都不能再改为指向另一个变量（对引用赋值只会修改原变量的值）；如果需要在运行期修改所指向的内存位置，必须使用指针。

- **目标是“可选的”（允许为空 `nullptr`）**：不存在所谓的“空引用”（Null Reference）。当某个函数参数、返回值或句柄是可选的（即 `nullptr` 是一个合法的有效状态）时，应当使用指针 `T*`。

- **在容器中存储多态类型或充当唯一标识句柄**：当需要在标准库容器中存放多态类型，或者像观察者模式（Observer Pattern）那样在 `std::set` 等容器中存储已注册观察者的非拥有句柄（借用指针地址作为唯一标识符来执行 `attach()` / `detach()`，同时避免拷贝有状态的实体）时，使用 `T*` 非常合适。

**3. 为什么裸指针不等于所有权？**
正如 C++ Core Guideline R.3 明确规定的那样：**“裸指针（`T*`）是不拥有资源的（A raw pointer is non-owning）”**：

- **语义模糊极易引发内存泄漏或双重释放**：一个裸指针本身只保存内存地址，单看 `T*` 无法区分它指向的是栈上变量、单个堆对象还是数组，更无法在语法上表明“谁负责调用 `delete`”。如果在涉及所有权的代码中使用裸指针，一旦函数存在多个 `return` 分支、中途抛出异常，或者调用者与被调用者对谁负责清理产生误解（如直接覆写指针引用参数 `Simple*&`），就会立刻导致内存泄漏或崩溃。

- **现代 C++ 用 RAII 与智能指针专职管理所有权**：在现代 C++ 中，任何动态分配的资源所有权都必须立即交给 RAII 类或标准智能指针——独占所有权默认使用 `std::unique_ptr`（配合 `std::make_unique()`），共享所有权使用 `std::shared_ptr`（配合 `std::make_shared()`）。当对象离开作用域或异常栈展开时，智能指针会自动释放资源，使得现代 C++ 代码中几乎不再需要手写 `delete`。

- **职责彻底解耦**：将所有权完全剥离给智能指针后，裸指针 `T*` 的职责就变得纯粹而清晰——它**仅在不涉及所有权转移或共享时使用**（例如作为纯观察/访问用途的可选函数参数，或观察者模式中的注册句柄）。

## ③ 核心概念 · 15分钟

### 先用白话建立概念

- **nullptr**：空指针值。
- **span**：不拥有元素的连续范围视图。

### 跟着本课实验走一遍

1. 从帧数据构造视图。
2. 先检查至少有头部需要的字节数。
3. 读出类型与长度，再处理短帧失败。

先尝试口头预测，再到第⑥节运行。下面原有概念、图示与接口对照用于解释这些步骤，短代码片段不一定能单独编译；完整程序以本课 `main.cpp` 为准。

nullptr 表达空指针

```cpp
Device* device{nullptr};
```

不要用 0 表达空指针。可空借用可用指针；不可空借用优先引用。

数组边界

C 风格的地址 + 长度容易失配；现代 C++ 可用 std::span 表达非拥有范围，用 std::array 表达固定容量。

## ④ C vs Modern C++ · 10分钟

std::optional<std::uint8_t> ParseFrame(
std::span<const std::uint8_t> frame)

```cpp
{
  constexpr std::size_t kMinimumFrameSize{2};
  if (frame.size() < kMinimumFrameSize) {
    return std::nullopt;
  }
  return frame.front();
}
```

## ⑤ 今日编码规范 · 10分钟

- MUST：明确 nullptr 语义；可空才使用指针。

- SHOULD：裸指针/引用只表达借用，不表达所有权。

- MUST：边界输入必须验证，禁止 magic number。

## ⑥ 20分钟实验：Modem TLV Reader

### 第一次做：先运行，再只改一件事

1. 在仓库根目录打开 [`examples/day-005/main.cpp`](../examples/day-005/main.cpp)，先读 `main()`，圈出输入、调用与结果检查。
2. 运行原版，把实际输出和退出状态记下来，再与本节预期对照。无输出也可能成功，必须结合退出码与断言判断。
3. 修改前先写预期；若失败，先读第一条编译错误或失败断言，再回到对应概念，不同时重写多个函数。

**本课小改动：** 对照正常帧和短帧断言，增加一个空视图输入；预期解析失败而不是越界读取。

<details>
<summary>练习提示：卡住时再展开</summary>

把上面的执行步骤当作检查点；保留原版作为对照。若练习故意让编译或断言失败，请只在实验副本操作，解释失败后还原，不把负例混入日常通过用例。不要执行越界、悬空解引用或重复释放来“观察效果”。

</details>

完整源码：[main.cpp](../examples/day-005/main.cpp)。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <optional>
#include <span>

constexpr std::size_t kHeaderSize{2};

struct TlvHeader {
  std::uint8_t type{};
  std::uint8_t length{};
};

std::optional<TlvHeader> ParseTlvHeader(std::span<const std::uint8_t> frame) {
  if (frame.size() < kHeaderSize) {
    return std::nullopt;
  }
  return TlvHeader{frame[0], frame[1]};
}

int main() {
  const std::array<std::uint8_t, 4> valid_frame{0x01, 0x02, 0xAA, 0xBB};
  const auto header = ParseTlvHeader(valid_frame);
  assert(header.has_value());
  assert(header->type == 0x01);
  assert(header->length == 0x02);

  const std::array<std::uint8_t, 1> short_frame{0x01};
  assert(!ParseTlvHeader(short_frame).has_value());

  std::cout << "TLV Header parsed: type=" << static_cast<int>(header->type)
            << ", len=" << static_cast<int>(header->length) << '\n';
  return 0;
}
```

在仓库根目录运行：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-005/main.cpp -o /tmp/day-005
/tmp/day-005
```

## ⑦ 3 个常见坑

- nullptr 检查防不了悬空指针。

- const T* 与 T* const 的 const 对象不同。

- std::span 不拥有数据，必须保证底层 buffer 生命周期。

## ⑧ 检查题

### 分层自测：从解释到判断

1. **理解：** 不看代码，用三句话复述本课示例的输入、关键步骤和结果。
2. **应用：** 说明第⑥节小改动的预期，以及实际结果是否符合预期。
3. **辨析：** 有 `span` 就不需要检查协议长度了吗？

<details>
<summary>辨析题参考答案与通过依据</summary>

仍需要；`span` 描述可访问范围，协议头或字段长度是否满足业务要求由解析器检查。

能运行只是第一步。只有能解释本课具体步骤、完成小改动，并说清一个不适用条件，才算完成本次自测；不清楚时回看第③节，不以阅读次数当作掌握证据。

</details>

### 原课检查题

Q1：不能为空且不接管所有权：T* / T& / unique_ptr / void*？

Q2：为什么 span 通常优于 (pointer, size)？
今日 Code Review 肌肉记忆：这个指针是否可空？是否拥有资源？长度在哪里？生命周期由谁保证？边界是否检查？
明日：数组/容器与固定容量缓冲区，把类型安全和嵌入式内存预算结合起来。

### 对照现有资料库

- [实验环境与工具链边界](<../docs/lab-environments.md>)。
- [类型、借用与错误处理规范](<../guidelines/embedded-cpp-guideline-notes.md>)。

先完成本课小实验，再查对照资料；专题中的线程、网络、板端或模式不是本课默认前置。以上为本项目已有讲解和工程对照，不冒充标准条文，也不表示所有示例已在目标板验证。
