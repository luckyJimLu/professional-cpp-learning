# 从语义到机器码：C / C++ 实现观察实验

先阅读小册子对应条目的标准版本、实现机制和深入讨论，再用实验验证。这里不假设标准规定了某个汇编序列、闭包大小或控制块布局。示例在 `booklets/labs/`，C17 与 C++20 分开编译；C23 的增量讨论没有包含在这些自测中。

## 1. 建立可重复的观察环境

在仓库根目录执行（GCC / G++）：

```bash
gcc --version
g++ --version
gcc -dumpmachine
lab_dir=$(mktemp -d)
gcc -std=c17 -Wall -Wextra -Wpedantic -Werror booklets/labs/mechanisms.c -o "$lab_dir/c"
g++ -std=c++20 -Wall -Wextra -Wpedantic -Werror booklets/labs/mechanisms.cpp -o "$lab_dir/cpp"
"$lab_dir/c"
"$lab_dir/cpp"
```

两个程序应分别报告通过。部分目标的原子操作需要额外链接 `-latomic`。断言验证语言行为，不能使用 `-DNDEBUG`；这里只使用常见的原子 int，不证明所有原子类型无锁。

## 2. 前端：类型和泛型选择

C 示例 `kind(value++)` 不递增 value，说明 `_Generic` 控制表达式不求值；被选择的表达式是整数常量。它不需要运行时类型标签。

C++ 示例以 `static_assert` 验证 `decltype(x)` 为 int，而 `decltype((x))` 为 int&。这是前端规则，不是优化结果。若有 Clang，可查看 AST 中的类型和闭包：

```bash
clang++ -std=c++20 -Xclang -ast-dump -fsyntax-only booklets/labs/mechanisms.cpp > "$lab_dir/ast.txt"
```

AST 包含标准库信息，输出可能很大；查 `lambda_probe` 附近的闭包、捕获成员及调用运算符。Clang 命令是可选观察方法，GCC 自测通过不等于已验证 Clang 输出。

## 3. 降低与优化：为何源码不同而机器码相近

```bash
g++ -std=c++20 -O0 -S booklets/labs/mechanisms.cpp -o "$lab_dir/cpp-O0.s"
g++ -std=c++20 -O2 -S booklets/labs/mechanisms.cpp -o "$lab_dir/cpp-O2.s"
gcc -std=c17 -O2 -S booklets/labs/mechanisms.c -o "$lab_dir/c-O2.s"
g++ -std=c++20 -O0 -fdump-tree-original -c booklets/labs/mechanisms.cpp -o "$lab_dir/lowering.o"
```

比较 `lambda_probe`：未优化时可能有闭包成员访问和调用；优化后常只剩加法。捕获状态在语义上存在，不代表物理对象一定保留。

比较 `constant_probe`：static_assert 强制常量表达式合法，普通函数中的 square(6) 则可被优化器折叠。不能用某次 -O0 是否折叠来定义 constexpr 的语义。

检查 `generic_probe` 与 `atomic_probe`：前者可直接返回常量；后者必须保留原子修改的要求。x86 的带锁指令、ARM 的原子或独占访问序列以及库回退都可能实现该要求。relaxed 只放宽排序，不取消原子性。

转储、符号名与指令随版本/ABI/优化选项变化，不设置固定汇编快照作为正确性测试。`-O0` 也不保证逐字对应源码。

## 4. 生命周期：移动不等于销毁

C++ 示例中，optional 的移动构造建立第二个 Item，源 optional 仍有值；reset 才结束源对象生命周期。离开作用域后计数归零。

这说明三层责任：前端选择移动构造；optional 库管理状态与原地存储；Item 定义资源行为。对象池必须另外管理槽位存储，不能仅复制字节替代非平凡构造。

继续讨论：若 Item 移动构造抛出，目标是否已经构造成功？若对象只是被移动，哪个析构函数仍须执行？若存储要重用，容量、对齐、旧对象销毁和新对象构造是否都成立？

## 5. 更深机制的阅读路径

- **智能指针**：分开观察对象、控制块、删除器。make_shared 的常见合并分配不是布局承诺；弱引用可能延长控制块及合并存储的占用。
- **协程**：先画挂起点及跨挂起点存活的对象，再读编译器降低文档。协程帧是状态机存储，执行器才决定在哪继续执行；句柄不是自动拥有帧的智能指针。
- **Concepts**：约束筛选发生在编译期；概念表达式成立不能证明比较器满足严格弱序等语义公理。
- **原子**：先建立 happens-before 证明，再观察指令。一次无数据竞争的运行、某种汇编或压力测试都不能替代内存模型论证。
- **C23**：分别查询前端与库支持。_BitInt、#embed 和 stdckdint.h 属于不同实现层，不用单个版本号推断全部可用。

本实验只验证所列 C17/C++20 行为及当前工具链能生成观察产物，不验证所有特性、协程调度、跨平台 ABI 或性能结论。

## 对象模型与虚调用进阶实验

新增 `labs/object-model.cpp`，由 `npm run check:booklets` 编译运行。布局、虚表地址点、多继承 thunk、闭包与优化结果见[五维深度拆解](../docs/cpp-implementation-deep-dive.md)。测试只断言语言行为，打印尺寸作观察，不固定目标 ABI。
