# Day 76 · Object Destruction：析构顺序、RAII 与可控 Teardown

> **日期**：2026-11-09  
> **主教材**：Marc Gregoire, *Professional C++, Sixth Edition*（C++23），Chapter 8 · *Gaining Proficiency with Classes and Objects*，p.286 起 · **Object Destruction**。建议读完该小节，并在原书下一标题处停止；不提前展开后续 assignment operator 内容。  
> **前置课程**：[Day 75 · Summary of Compiler-Generated Constructors](day-075-summary-compiler-generated-constructors.md)；[Day 70 · Constructor Initializer Lists and Member Initialization Order](day-070-constructor-initializer-list-member-order.md)。  
> **辅教材**：Dmitri Nesteruk, *Design Patterns in Modern C++*。今天使用 RAII、Composition 与 Adapter 的工程思想；RAII 是 C++ 资源管理惯用法，不把它误称为一个 GoF 模式。

**今天要回答的问题：对象生命周期结束时，谁负责清理资源？多个成员互相依赖时，怎样保证析构顺序不会先销毁被依赖对象？**

**学习目标**：识别析构函数的调用时机与顺序；理解析构函数体、成员和基类的销毁顺序；判断多态基类是否需要 virtual destructor；区分“显式、可失败的 Stop/Close”与“不可失败的析构兜底”；为 callback registration、transport 和硬件资源设计安全 teardown。

**60 分钟安排**：阅读 7 分钟 → 复习 4 分钟 → 概念 15 分钟 → C/C++ 对照 5 分钟 → 设计映射 6 分钟 → Embedded 场景 7 分钟 → 规范 4 分钟 → Lab/练习 9 分钟 → 常见坑 2 分钟 → 检查题 1 分钟。

---

## ① 今日章节与建议阅读范围（7 分钟）

**Chapter 8，p.286 起：Object Destruction。** 以原书该小节为准，读完析构函数与对象销毁相关内容，在下一个小节标题处停止。仓库 Day 75 已把本节标为 Chapter 8 的下一主题；今天不跳到 assignment operator。

阅读时标记五件事：

1. 析构函数的声明形式，以及它与构造函数的区别；
2. 自动对象、动态对象、临时对象和静态对象分别在什么时候结束生命周期；
3. 一个完整对象销毁时，析构函数体、成员和基类按什么顺序执行；
4. 通过基类指针删除派生对象时，为什么需要虚析构函数；
5. 析构函数为什么不适合承担可能失败、需要 timeout 或可能阻塞的业务操作。

**阅读边界**：今天关注 destruction 与 teardown 的责任边界。Move constructor / move assignment 的完整规则仍留给 Chapter 9；这里只提醒：user-declared destructor 会影响编译器隐式生成 move special members 的规则，不在本课提前展开。

## ② 昨日复习 3 问（4 分钟）

承接 Day 75：

1. **核心机制**：编译器生成的 copy constructor 对 raw pointer 成员做了什么？它会自动复制指向的数据吗？
2. **工程判断**：一个类包含 `std::unique_ptr<Buffer>`，为什么默认复制能力会被限制？这与“对象是否应该共享资源”有什么关系？
3. **代码细节**：`std::is_copy_constructible_v<T>` 为 true，是否足以证明复制 `T` 不会 double-release？还需要检查哪些语义？

复习要点：memberwise copy 复制成员语义；raw pointer 只复制地址；`unique_ptr` 表达唯一所有权并自然阻止复制；type traits 检查表达式能力，不证明运行期资源语义。

## ③ 核心概念：Object Destruction（15 分钟）

### 1. 析构函数是对象生命周期结束时的清理入口

析构函数名称是 `~TypeName()`，没有返回类型、没有参数，同一个类不能通过参数列表重载多个析构函数。

```cpp
class UartPort {
public:
    explicit UartPort(int handle) noexcept : handle_{handle} {}
    ~UartPort() noexcept = default;

private:
    int handle_;
};
```

析构函数的责任是释放对象拥有的资源、解除对象建立的局部关系，并维持 teardown 后的系统不变量。它不是普通业务 API：调用方不能从析构函数接收 `Status`，也不能通过参数选择不同的关闭策略。

### 2. 常见销毁时机

| 对象来源 | 生命周期结束的典型时机 | 工程提醒 |
|---|---|---|
| automatic storage 对象 | 离开所在作用域 | 按构造顺序的逆序销毁 |
| dynamic storage 对象 | 对应 `delete` 表达式，或 owner 执行释放 | 优先用 `unique_ptr` / 容器管理 |
| 临时对象 | 通常在创建它的 full-expression 结束时 | 不要把临时对象地址保存到异步 callback |
| static storage 对象 | 程序正常终止阶段 | 跨 translation unit 的静态析构依赖要谨慎 |
| thread storage 对象 | 对应线程结束时 | 不要假设它比所有后台任务活得更久 |

数组对象销毁时，元素按构造的逆序销毁。`std::unique_ptr<T[]>` 使用数组删除语义；不要混用 `new[]` 与标量 `delete`。

### 3. 一个对象内部的销毁顺序

对一个完整的派生对象，核心顺序可以记为：

1. 先执行最派生类的 destructor bod{﬊
