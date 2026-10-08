# Week 06 Review · Class Relationships → Designing for Reuse

覆盖 **Day 36–42**。

## 本周主线

本周从 Chapter 5 的类关系收束进入 Chapter 6 的 reusable design：

- Day 36：Has-a vs Is-a
- Day 37：Not-a Relationship
- Day 38：Hierarchies
- Day 39：Multiple Inheritance
- Day 40：Mixin Classes
- Day 41：Reuse Starts with Stable Contracts
- Day 42：Use Abstraction

核心转变：**不要先问“C++ 能不能这样继承/复用”，先问“这个关系和 contract 是否真实、稳定、可被调用者理解”。**

## 复盘 8 问

1. 什么条件下一个类型真正满足另一个类型的 is-a？
2. 为什么现实世界分类不应机械映射成代码 hierarchy？
3. 中间基类什么时候值得存在？
4. 多继承什么时候可以表示多个独立 contract？
5. mixin 与 composition 的选择边界是什么？
6. reusable component 为什么应避免可写全局状态？
7. abstraction leakage 在 Driver/RTOS/Linux 边界上通常长什么样？
8. 为什么 abstraction 不等于 virtual interface？

## Code Review 检查

### 头文件依赖

- [ ] 头文件自包含，Include What You Use
- [ ] reusable interface 没有无必要引入 HAL/RTOS/Linux 私有类型
- [ ] concrete adapter 承担平台依赖

### 命名

- [ ] 类型 PascalCase
- [ ] 函数 PascalCase
- [ ] 变量/参数 snake_case
- [ ] 成员 snake_case_
- [ ] 常量 kPascalCase

### 所有权 / 生命周期

- [ ] 默认单一 owner
- [ ] `unique_ptr` 只在所有权转移时使用
- [ ] required borrow 使用引用
- [ ] optional borrow 的 `nullptr` 语义明确
- [ ] 多态关系没有掩盖 ownership 关系

### 实时路径动态分配

- [ ] ISR / hard real-time path 无无界 heap allocation
- [ ] wrapper/mixin 没有偷偷引入动态分配
- [ ] template 实例化数量和 flash/RAM 成本可审计

### 错误模型

- [ ] 可恢复错误不使用 assert
- [ ] 项目统一 Status/error model
- [ ] 阻塞 API 显式 timeout
- [ ] 错误没有被随意压缩成 bool

### ISR / volatile

- [ ] ISR 保持最小
- [ ] `volatile` 仅表达 MMIO/特定可见性需求，不充当线程同步
- [ ] 共享状态有明确同步策略

### Magic number

- [ ] timeout、baudrate、buffer size 等有命名或强类型单位
- [ ] HAL 常量没有泄漏到 reusable contract

### 边界测试

- [ ] empty buffer
- [ ] zero / expired timeout
- [ ] maximum payload
- [ ] invalid state
- [ ] fake/mock adapter 路径

## 本周重构练习

给定：

```cpp
class Device {};
class SerialDevice : public Device {};

UartDriver* g_uart;

class Modem : public SerialDevice {
 public:
  bool Send(const uint8_t* data, int length) {
    return g_uart->Write(data, length, 1000) == 0;
  }
};
```

重构目标：

1. 删除没有真实 contract 的分类层；
2. 引入最小 `IByteSink`；
3. Modem/Protocol 使用 required borrow；
4. buffer 改为 `std::span<const std::uint8_t>`；
5. timeout 改为 `std::chrono::milliseconds`；
6. 使用统一 Status；
7. UART 细节留在 adapter；
8. 为 empty payload / timeout 编写边界测试。

## 下周关注

继续 Chapter 6 · Designing for Reuse：结构化 reusable code、拆分无关职责、generic/template 策略、checks/safeguards、extensibility 与 usable interfaces。