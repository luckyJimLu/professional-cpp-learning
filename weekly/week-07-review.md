# Week 07 Review · Reusable Boundaries, Extensibility and Usable Interfaces

覆盖 **Day 43–49**。

## 本周主线

- Day 43：Structure Your Code for Optimal Reuse
- Day 44：Avoid Combining Unrelated or Logically Separate Concepts
- Day 45：Templates for Generic Data Structures and Algorithms
- Day 46：Checks and Safeguards
- Day 47：Design for Extensibility
- Day 48：Design Usable Interfaces
- Day 49：Consider the Audience and Purpose

这一周的核心转变是：

> **不是先选 Pattern，而是先找变化轴；不是先画 hierarchy，而是先建立稳定 contract；不是先选 smart pointer，而是先设计 lifetime。**

## 一、7 个关键问题

1. reusable component 为什么要按独立变化原因拆分？
2. template/concept 适合什么 compile-time variation？
3. runtime polymorphism 什么时候比 template 更合适？
4. safeguard 为什么也必须有容量、重试和 timeout 上界？
5. OCP 为什么不等于“所有东西都 virtual”？
6. usable interface 如何把单位、buffer 边界和错误语义放入类型？
7. audience / purpose 如何决定接口应该暴露哪些能力？

## 二、Pattern 映射复盘

| 变化 | 优先思路 | 何时不要用 |
|---|---|---|
| 平台 C API / HAL 差异 | Adapter | 上层直接依赖 concrete 且不会替换时不必先抽象 |
| 算法变化 | Strategy / policy | 单一固定算法没有真实变化轴 |
| 创建产品/平台组件 | Factory | 对象构造简单且调用点唯一 |
| trace/retry/metrics 横向能力 | Decorator / composition | 只有一次使用且普通函数组合足够 |
| 多处理阶段 | Chain of Responsibility | 链顺序隐式、WCET 无法界定时 |
| 事件通知 | Observer | 单一同步调用直接函数即可 |
| required dependency | Dependency Injection | 不要退化成 service locator |

## 三、Code Review 检查

### 头文件依赖

- [ ] 头文件自包含
- [ ] Include What You Use
- [ ] 公共 interface 不无必要 include HAL/RTOS/Linux 私有类型
- [ ] template implementation 没有把平台依赖扩散到公共头文件

### 命名

- [ ] 类型 PascalCase
- [ ] 函数 PascalCase
- [ ] 变量/参数 snake_case
- [ ] 成员 snake_case_
- [ ] 常量 kPascalCase
- [ ] 单位、状态、模式名字语义明确

### 所有权 / 生命周期

- [ ] 默认单一 owner
- [ ] `unique_ptr` 只表达所有权转移
- [ ] required borrow 使用引用
- [ ] optional borrow 的 `nullptr` 语义明确
- [ ] 没有用 `shared_ptr` 掩盖 teardown 设计
- [ ] callback/observer 如存在，注册、注销和销毁顺序明确

### 实时路径动态分配

- [ ] hard real-time / ISR 无无界 heap allocation
- [ ] runtime registration 有容量上限
- [ ] handler/observer collection 有最大数量
- [ ] template 实例化的 flash/RAM 成本可审计

### 错误模型

- [ ] 可恢复错误不用 assert
- [ ] timeout / busy / invalid input 不全部压成 bool
- [ ] retry 有最大次数或 deadline
- [ ] 错误跨层仍保留调用者需要的原因

### ISR / volatile

- [ ] ISR 保持最小
- [ ] `volatile` 不作为线程同步
- [ ] ISR → task 的共享状态有明确 atomic/queue/critical-section 策略

### Magic number

- [ ] timeout 使用 chrono 或明确单位
- [ ] capacity / payload limit 有具名常量
- [ ] mode/state 使用 `enum class`
- [ ] HAL 数值常量没有泄漏到业务 contract

### 边界测试

- [ ] empty
- [ ] min / max / max+1
- [ ] zero / expired timeout
- [ ] transport failure
- [ ] capacity exhausted
- [ ] dependency teardown / invalid lifetime 假设

## 四、Design Review 检查

### 1. 本周的主要变化轴

至少能指出：

- platform/transport variation；
- compile-time algorithm/type variation；
- runtime implementation variation；
- validation/error variation；
- audience/purpose variation。

### 2. 稳定边界

对每个 abstraction 都回答：

```text
谁是 caller？
它真正需要什么？
变化发生在哪里？
谁拥有对象？
谁只是 borrow？
边界是否泄漏平台细节？
```

### 3. Pattern 使用判断

- [ ] Pattern 是否对应真实重复出现的结构问题？
- [ ] 是否能用 value semantics / composition / function 解决？
- [ ] virtual dispatch 是否真的需要 runtime replacement？
- [ ] 是否出现“万能 Factory + ServiceLocator”？
- [ ] 是否出现过度 `shared_ptr`？
- [ ] callback lifetime 是否清楚？
- [ ] registration/handler chain 是否有上界？

## 五、设计题：保持简单、Composition，还是 Pattern？

给定：

```cpp
class SensorManager {
 public:
  SensorManager();

  float ReadTemperature();
  float ReadHumidity();
  void EnableLogging(bool enable);
  void SetRetry(bool enable);
  void SetBus(int bus);
  void* GetDriverHandle();

 private:
  void* driver_;
};
```

背景：

- 产品当前固定一个 I2C 温湿度 sensor；
- host test 需要 fake；
- 未来可能更换另一个 vendor；
- 读取路径有 2 ms deadline；
- 禁止运行时 heap allocation。

请回答：

1. 真实变化轴是什么？
2. 是否需要 runtime interface？
3. Adapter 是否合适？
4. logging/retry 应塞进 SensorManager 吗？
5. owner / borrow 怎么设计？
6. 是否需要 Factory？
7. 哪些设计属于 overengineering？

### 推荐分析方向

- vendor API 差异是明确变化轴，可用小 Adapter；
- host fake 是 runtime test replacement 的理由之一，但仍可根据 build strategy 选择 virtual 或 template；
- logging/retry 是不同变化原因，优先组合或上层 orchestration；
- `GetDriverHandle()` 是 abstraction leakage；
- 固定平台启动期组装即可，不需要 service locator；
- 如果 concrete implementation 编译期已知，template/static polymorphism 也可能比 runtime virtual 更合适；
- 2 ms deadline 要求检查锁、I/O、retry 和 logging 的 WCET。

## 六、本周一句话总结

```text
需求变化
  → 识别变化轴
  → 找稳定边界
  → 选择最简单的 C++ 机制
  → 必要时再使用 Pattern
  → 明确 ownership/lifetime
  → 检查 Embedded 上界
```

下一周继续 Chapter 6，并逐步进入 general-purpose interface、generality vs ease-of-use、successful abstraction 与 SOLID。
