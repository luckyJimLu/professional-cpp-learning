# 第 09 周复盘 · Day 57–63

本周主线：从 `unique_ptr` 所有权转移推进到共享生命周期、回调拆除、别名与类型转换 API，最后进入分配器与资源策略。核心原则：**先梳理生命周期、所有权与资源图谱，再选择指针、模式与分配器。**

## 代码评审清单

- 头文件依赖是否最小，接口是否泄漏 concrete driver / allocator 实现？
- required borrow 是否优先使用 reference，optional borrow 是否明确 nullable？
- `unique_ptr` / `shared_ptr` / `weak_ptr` 是否真正对应 ownership 语义？
- callback 是否有 unsubscribe/cancel/in-flight/join/teardown 顺序？
- 实时路径是否存在 heap allocation、atomic refcount、锁或无界 blocking？
- allocation failure 是否有显式错误模型，而不是依赖异常穿越实时边界？
- ISR 是否只做有界工作，避免 allocator、复杂析构和 blocking？
- timeout、容量、buffer size 是否使用明确单位/常量而非 magic number？
- 是否覆盖 0、最大值、超容量、resource exhaustion、owner 提前销毁等边界测试？

## 设计评审

### 变化轴

transport 实现、callback lifetime、resource source、容量策略、host/RTOS 环境。

### 稳定边界

- Protocol 依赖最小 transport capability；
- callback observer 不隐式成为 owner；
- allocator/resource 作为显式 dependency；
- backing storage 的 owner 与 borrower 生命周期可画出来。

### 模式审计

- Strategy：只有资源策略确实需要 runtime replacement 时使用；固定 firmware 优先 static policy。
- Adapter：适合把现有 RTOS pool/HAL 映射到稳定接口。
- Observer：必须包含 unsubscribe 与 teardown protocol，而不仅是 callback registration。
- Factory：若只有一个构造路径，不引入。
- Service Locator：避免隐藏 transport/resource dependency。

### Overengineering 检查

警惕：所有对象 `shared_ptr`、所有实现 virtual、业务层反复 downcast、全局 default allocator、为单一固定容量问题引入完整 allocator hierarchy。

## 可运行的设计重构练习

使用 `examples/day-063/exercise-01.cpp` 作为本周设计重构练习。它是完整可运行程序，要求把“reserve 后靠约定不越界”重构成显式 bounded API，并比较 PMR runtime policy 与 fixed-capacity static composition。

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic examples/day-063/exercise-01.cpp -o week09-review
./week09-review
```

完成标准：

1. 第 33 次写入不触发 allocation，并返回显式错误；
2. resource lifetime/owner 在接口或注释中明确；
3. 0/31/32/33 容量边界可观察测试；
4. 说明为什么选择 PMR、fixed array 或 pool；
5. 说明 callback/worker 若持有 batch view 时的 teardown 顺序。
