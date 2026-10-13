---
day: 47
week: 7
part: II
chapter: 6
chapter_title: Designing for Reuse
title: Design for Extensibility
duration: 60
status: published
date: 2026-10-13
topics:
  - extensibility
  - open-closed-principle
  - customization-points
  - dependency-injection
  - stable-contracts
guidelines:
  - prefer-explicit-customization-points
  - inject-dependencies
  - bound-runtime-extensibility
lab:
  path: examples/day-047/main.cpp
previous: 46
next: 48
---

# Day 47 · Design for Extensibility

## ① 今日章节与建议阅读范围（5 分钟）

继续 Chapter 6 · **Designing for Reuse**，沿教材顺序进入 **Design for Extensibility**。

今天的目标不是“把所有东西都设计成插件”，而是识别**真正可能变化的轴**，为这些变化建立稳定 customization point，使新增行为尽量通过扩展完成，而不是不断修改已经验证过的核心代码。

建议阅读时重点关注：

- extensibility 与过度泛化的区别；
- Open/Closed Principle（OCP）：对扩展开放、对修改关闭；
- inheritance、template、function object、dependency injection 等不同扩展机制；
- 为什么扩展点必须有明确 contract；
- embedded 系统中扩展能力如何保持内存、时间与生命周期可审计。

---

## ② 昨日复习 3 问（5 分钟）

1. 为什么外部输入无效属于 runtime error，而不是 `assert` 的使用场景？
2. 为什么 reusable blocking API 的 timeout 必须进入公开 contract？
3. safeguard 本身为什么也必须具有时间和空间上界？

---

## ③ 核心概念（12 分钟）

### 1. Extensibility 是“预留变化边界”，不是预测所有未来

假设 Modem 模块支持不同的 reset policy。最差的方式是在核心流程中不断加入设备判断：

```cpp
if (model == Model::kA) {
  // reset A
} else if (model == Model::kB) {
  // reset B
}
```

每增加一种设备都修改稳定核心。更好的设计是先识别变化轴：**reset 行为会变化，但 modem orchestration 不应变化**。

```cpp
class ResetPolicy {
 public:
  virtual ~ResetPolicy() = default;
  virtual bool Reset() = 0;
};
```

核心只依赖稳定 contract。

### 2. OCP 的重点是减少修改面

Open/Closed Principle 并不要求所有类都使用继承。C++ 中常见 customization point 包括：

- runtime interface / virtual function；
- template / concept；
- function object / lambda；
- composition + dependency injection；
- wrapper / adapter。

选择机制时先问：变化发生在**编译期还是运行期**？是否需要独立生命周期？是否允许 heap allocation？是否需要稳定 ABI？

### 3. Dependency Injection 让扩展点显式

不要让组件内部偷偷寻找全局对象：

```cpp
class ModemController {
 public:
  ModemController(Transport& transport, ResetPolicy& reset_policy)
      : transport_{transport}, reset_policy_{reset_policy} {}

 private:
  Transport& transport_;
  ResetPolicy& reset_policy_;
};
```

这里两个引用都是 required borrow：对象不拥有依赖，且依赖不能为空。依赖关系、测试替身和生命周期都可见。

### 4. Embedded extensibility 必须有边界

桌面应用可以动态扫描插件，但 MCU/RTOS 中通常更关心：

- 扩展对象数量是否固定；
- 是否在实时路径动态分配；
- virtual dispatch 是否可接受；
- 初始化顺序是否确定；
- callback 是否可能越过被借用对象生命周期；
- 新扩展是否改变 WCET、stack、flash/RAM 预算。

因此 embedded 的 extensibility 常常是**编译期可配置 + 启动期组装 + 运行期有界调用**。

---

## ④ C 写法 vs Modern C++（8 分钟）

### C：通过 type code 扩展

```c
int reset_modem(int modem_type) {
  switch (modem_type) {
    case 1:
      return reset_gpio();
    case 2:
      return reset_at_command();
    default:
      return -1;
  }
}
```

新增类型必须修改已有 `switch`，而且硬件依赖与业务流程容易逐渐耦合。

### Modern C++：显式 customization point

```cpp
class ResetPolicy {
 public:
  virtual ~ResetPolicy() = default;
  virtual bool Reset() = 0;
};

class ModemController {
 public:
  explicit ModemController(ResetPolicy& reset_policy)
      : reset_policy_{reset_policy} {}

  bool Recover() { return reset_policy_.Reset(); }

 private:
  ResetPolicy& reset_policy_;
};
```

增加 `GpioResetPolicy` 或 `AtResetPolicy` 时，`ModemController` 无需修改。

---

## ⑤ 今日编码规范（10 分钟）

### MUST：扩展点必须表达稳定、最小 contract

错误：

```cpp
class Plugin {
 public:
  virtual void ConfigureEverything(void* context) = 0;
};
```

推荐：

```cpp
class ResetPolicy {
 public:
  virtual ~ResetPolicy() = default;
  virtual bool Reset() = 0;
};
```

不要为了“以后可能需要”暴露万能接口。

### SHOULD：required dependency 使用显式注入，不使用隐藏的全局 service locator

错误：

```cpp
bool Recover() {
  return GlobalServices::Instance().GetResetPolicy()->Reset();
}
```

推荐：

```cpp
explicit ModemController(ResetPolicy& reset_policy)
    : reset_policy_{reset_policy} {}
```

### MUST：实时路径中的 runtime extensibility 必须有界

错误：

```cpp
std::vector<std::function<void()>> callbacks;
// 运行中任意注册、扩容、删除
```

推荐：

```cpp
std::array<Handler*, kMaxHandlers> handlers{};
```

容量、注册时机和生命周期必须可审计；如果不需要 runtime extension，优先静态组装。

---

## ⑥ 可编译实验 / 练习（15 分钟）

实验文件：

```text
examples/day-047/main.cpp
```

实现一个 `ModemController`，核心恢复流程借用 `ResetPolicy`；提供 `GpioResetPolicy` 与 `AtResetPolicy` 两种实现。核心类不知道具体 reset 机制，也不拥有 policy，不使用 heap allocation。

编译：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic \
  examples/day-047/main.cpp -o day047
./day047
```

### 修复违规代码

```cpp
bool Recover(int modem_type) {
  if (modem_type == 1) {
    while (!gpio_ready()) {}
    return gpio_reset();
  }
  if (modem_type == 2) {
    return send_at_reset();
  }
  return false;
}
```

至少修复：

1. type code 导致核心函数随设备类型增长；
2. reset mechanism 与 orchestration 混合；
3. busy wait 无 timeout；
4. 扩展点 contract 不明确；
5. 错误只用 `bool` 表达；
6. 新实现无法在不修改核心代码的情况下接入。

---

## ⑦ 3 个常见坑（3 分钟）

1. **为假想未来过度设计**：十层抽象并不等于 extensible；只为已识别的变化轴建立边界。
2. **把继承等同于扩展性**：很多 policy 更适合 composition、template 或 callable；先判断变化时机与生命周期。
3. **动态扩展破坏实时预算**：无界注册、动态分配、不可控 callback 链会把“灵活”变成不可审计的 WCET 和 lifetime 风险。

---

## ⑧ 检查题（2 分钟）

### Q1

为什么 OCP 不意味着“所有行为都做成 virtual interface”？

### Q2

在 RTOS/Driver 代码中，为什么“启动期组装、运行期有界调用”通常比运行时任意插件注册更合适？

**答案要点：**

- OCP 描述的是设计目标，不规定实现技术；编译期变化可以用 template/concept，轻量行为可以用 callable，独立 runtime implementation 才更适合 virtual interface；
- 启动期确定依赖能让对象数量、ownership、内存、初始化顺序和 WCET 更容易审计，减少实时路径动态分配与生命周期不确定性。

---

## 今日 Code Review 快检

- [ ] 是否先识别真实变化轴，再建立扩展点
- [ ] customization point 是否最小且稳定
- [ ] dependency 是否显式注入
- [ ] owner / borrower / lifetime 是否明确
- [ ] 是否误用 `shared_ptr` 表达普通依赖
- [ ] runtime registration 是否有容量上限
- [ ] 实时路径是否避免无界动态分配
- [ ] 新实现能否在不修改稳定核心的情况下接入
- [ ] timeout、错误模型和边界测试是否仍然成立

## 下一步

Day 48 继续 Chapter 6，沿教材顺序进入 **Design Usable Interfaces**。