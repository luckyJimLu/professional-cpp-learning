# C++ 小册子内容覆盖与校核

正文：[C++ 语言速查](cpp.md)。网页：`?view=booklets&book=cpp`。与 C17 小册子独立，不混用语言规则。

## 内容来源

- 用户提供的《Cpp Comprehensive Cheatsheet.md》：用于主题覆盖与初学者查找需求，整合其 11 个模块；不将其中的绝对化说法直接当成标准保证。
- 仓库 [C++ 标准来源索引](../docs/cpp-feature-standards.md)：沿用并核对首次标准化版本及后续增强。
- [cppreference C++](https://en.cppreference.com/w/cpp.html)、[编译器支持](https://en.cppreference.com/w/cpp/compiler_support.html)、[特性测试宏](https://en.cppreference.com/w/cpp/feature_test.html)：进一步核对的公开参考入口。
- [WG21 标准入口](https://isocpp.org/std/the-standard)：精确规则以相应版本标准为准；工作草案、提案及实现扩展不能直接等同于已发布标准。

未声称逐页核对《Professional C++》原书，也未保留附件中未经验证的章节归属或固定性能收益。

## 覆盖范围

全册 17 章、108 个条目。保留原有稳定条目链接，新增主题章节，并保留 C++11/14/17/20/23 版本速查章节。

| 附件主题 | 小册子落点 | 补充边界 |
| --- | --- | --- |
| 关键字词典 | 关键字与声明 | explicit、mutable、friend、using、static/extern/inline、ODR；override/final 是特殊标识符 |
| 程序、编译与模块 | 基础、工具链、流 | 声明/定义、头文件守卫、标准库模块 C++23、工具链依赖 |
| 类型、字面量与常量 | 类型与表达式 | 类型大小的标准下限、编码单元、初始化重载、decltype 特殊规则 |
| 运算符、枚举与控制流 | 类型与表达式 | 溢出、短路、范围 for、三路比较 unordered、to_underlying C++23 |
| 函数、属性与 lambda | 函数 | 参数意图、捕获生命周期、NRVO、属性版本、条件 noexcept |
| 指针、引用、内存与智能指针 | 基础、内存、选型 | new/delete 配对、对象与存储分离、移动后状态、共享控制块与对象同步 |
| 面向对象 | 类 | 初始化顺序、虚析构的适用条件、覆盖规则、特殊成员删除、切片 |
| 模板与 Concepts | 基础、算法 | requires 表达式、约束不证明业务性质、if constexpr 检查边界 |
| STL 与 Ranges | 容器、算法 | 容器复杂度与失效、map 插入副作用、删除/去重、视图生命周期 |
| 文件、异常与线程 | 流、并发 | 打开/读写/关闭状态、异常安全等级、协作停止、锁与原子限制 |
| 新手检查表 | 并发章末、使用与选型 | 生命周期、错误处理、并发与标准版本 |

## 对附件的关键校正

- 类型的“常见大小”不能冒充标准保证；short 不等于必然的 int16_t，size_t 也不保证 64 位。
- constexpr 函数传入常量不保证调用一定在编译期求值；constinit 要求静态初始化，不使变量只读，也不解决所有初始化依赖。
- decltype 对未加括号的名字和一般表达式有不同规则；不是无条件“保留一切引用”。
- inline 不能许可任意重复定义，不保证机器码内联；pragma once 是实现扩展。
- C++20 模块机制与 C++23 标准库命名模块分开标注，不能承诺 import std 普遍可用或更快。
- static_cast 向下转换不执行 dynamic_cast 那样的运行时检查；bit_cast 也不是任意位模式合法化工具。
- override 允许合法协变返回，final 不保证去虚化，也不是完整安全边界。
- 特殊成员函数的隐式声明、定义与被删除必须分开；无条件 default 或无条件 noexcept 都可能错误。
- C++17 保证的复制消除不等于保证 NRVO；0LL 也不能保证累加永不溢出。
- 哈希容器查找为平均 O(1)、最坏 O(n)；map 和 unordered_map 的 API 及失效规则并非完全相同。
- 原子不保证无锁，RAII 锁不保证整个程序无死锁；jthread 使用协作停止且可能阻塞，线程入口未捕获异常仍会终止进程。
- 文件打开成功不表示后续写入、刷新、关闭成功；流析构不能替代需要报告失败的显式状态检查。

## 验证范围

运行 `npm run check:booklets`：校验两册稳定 ID、关键词与代码围栏；C 册维持关键字/头文件清单及 C17 完整程序检查；C++ 册编译运行完整内联程序与独立 C++20、C++23 主机自测。

自测使用独立临时目录，覆盖列表初始化、类型推导、Concepts、排序/去重/查找、哈希表、借用、移动、智能指针、多态、文件状态、jthread 汇合、互斥量、原子计数，以及 C++23 expected / to_underlying / string::contains。

上下文片段不声称能单独运行。modules、format/print、真实设备、禁异常工具链、性能、无锁性和所有并发调度不由这些主机自测证明。`tests/booklets.spec.ts` 验证搜索、分册、导航、历史及窄屏；具体检查结果应以实际运行记录为准。
