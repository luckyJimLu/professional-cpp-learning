---
summary: 以 Google C++ Style Guide 为主要参考的工程规范导读，结合 Core Guidelines 与嵌入式边界，提供命名、接口、所有权、错误处理和评审检查清单。
---

# C++ 编程规范：Google 风格与嵌入式工程实践

用于写新代码、评审与渐进重构。本文是项目学习规范，不是 Google 官方译文，也不宣称仓库所有历史示例已符合 Google 全部规则。涉及语言机制时，以所选 ISO C++ 标准及工具链支持为准。

## 1. 官方来源与采用范围

主要参考 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)，资源安全与接口设计另参考 [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)。后者由 Bjarne Stroustrup、Herb Sutter 等推动，是社区指南，不是某一家公司的内部制度，也不是 ISO 标准。

核对日期：2026-10-30。在线规范会更新，项目应记录采用日期、工具版本与偏离理由。

| 层次 | 本文如何使用 |
| --- | --- |
| Google 原规则 | 作为团队命名、可读性和协作约定的主要参照，冲突处明确说明 |
| Core Guidelines | 用于检查资源管理、接口与并发设计，不将两份指南拼成无差别禁令 |
| 本项目建议 | 针对课程、嵌入式和实时场景制定，不能标成 Google 原话 |
| 平台契约 | 寄存器、DMA、中断、RTOS、ABI 以芯片和工具链文档为准 |

建议新模块先确定 C++17/20/23 中的一个基线；以下完整示例使用 **C++20**。维护旧模块时尊重已有公共接口，不为统一命名破坏兼容性或修改第三方代码。

## 2. Google 风格速查

以下仅为入口摘要，细节与例外查官方对应章节。

| 项目 | 典型约定 | 示例 |
| --- | --- | --- |
| 文件 | 小写，可用下划线 | `packet_parser.h` |
| 类型 | PascalCase | `PacketParser` |
| 普通函数 | PascalCase，访问器等有例外 | `ReadPacket()` |
| 变量与参数 | snake_case | `packet_size` |
| 类数据成员 | snake_case 加尾下划线；struct 规则不同 | `buffer_size_` |
| 常量 | k 前缀与大写单词边界 | `kMaxPacketSize` |
| 宏 | 少用，必要时大写加下划线 | `PROJECT_PLATFORM_ARM` |
| 头文件 | 自包含、守卫、直接包含所用声明 | 不依赖偶然的传递包含 |

格式交给 clang-format；格式化通过不代表所有权、线程安全或业务行为正确。

## 3. 先写清接口，再写实现

本项目建议每个公开接口回答六个问题：输入范围、输出含义、拥有关系、失败方式、调用上下文、复杂度或时间上界。

- 小型数值按值传递；只读大对象通常用 const 引用；必须存在的非拥有依赖可用引用，可选借用才使用语义清楚的指针。
- 独占所有权优先用 `std::unique_ptr`（C++11），转移在调用点可见。仅在确有共同拥有关系时使用 `std::shared_ptr`（C++11）。
- 连续缓冲区可用 `std::span`（C++20）；文本借用可用 `std::string_view`（C++17）。两者都不延长底层对象寿命。
- 时间采用 `std::chrono`（C++11）或明确的单位类型；不要让 timeout 的单位靠猜测。
- 用 `enum class`（C++11）或 Options 表达有名字的选择，避免连续多个 bool 参数。
- 单参数构造通常使用 explicit；实现重写使用 override（C++11）。通过基类删除对象的接口需有合适的虚析构。

反例：`Start(true, false, 100, data)` 无法从调用处识别模式、时间单位和缓冲区边界。

改进方向：`Start(options, std::chrono::milliseconds{100}, payload)`，再明确 payload 是同步借用还是需要存活到异步操作完成。仅把参数换成 span 并未解决异步寿命。

## 4. 对象与资源：默认写出可安全退出的代码

本项目建议：业务对象优先零法则，让成员容器和资源句柄管理释放。直接管理资源的类型则明确复制、移动及析构语义，禁止无意的双重释放。

锁、文件、设备句柄、DMA 缓冲区和订阅关系都要有释放责任。RAII 的关键是让普通返回、提前返回及异常路径遵守同一资源契约；不是只给 new 配一个 delete。

评审时特别检查：

- 返回的指针、引用或 view 是否指向局部对象？容器扩容后借用是否失效？
- lambda 捕获的 this、引用与回调执行时间是否匹配？取消请求是否等于回调已经结束？
- shared_ptr 是否掩盖所有权不清或形成环？计数安全是否被误当成对象线程安全？
- 成员是否按**声明顺序**正确初始化？析构顺序是否满足依赖？
- noexcept 是否真实成立？逃逸的异常会触发终止，不能将它当成性能注解随意添加。

## 5. 错误处理：不要混淆三种失败

| 失败类型 | 本项目处理建议 | 不应怎样处理 |
| --- | --- | --- |
| 外部输入、超时、忙、容量满 | 返回保留原因的结果，让调用方决定重试或恢复 | 全部压成 bool；只记录日志后假装成功 |
| 程序员违反内部前提 | 断言、静态检查与契约测试 | 依赖 assert 校验不可信输入；发布模式可能移除断言 |
| 无法继续的系统故障 | 定义故障状态、复位或终止策略并保存必要诊断 | 无界重试，或在中断里阻塞打印 |

Google 明确不使用 C++ 异常，这与其现有代码生态有关；不能推导成“异常在所有 C++ 项目都错误”。Core Guidelines 包含使用异常及无异常环境的指导，两者不能直接互换。

本项目建议：每个组件统一错误模型并声明边界。禁异常的固件可使用自定义 Result；`std::expected` 从 **C++23** 起提供。C++17 的 optional 适合“有或无”，不能单独保留多种失败原因。不要因 Google 风格就自动引入 Abseil，也不要静默给整个仓库加 `-fno-exceptions`。

## 6. 完整示例：带边界和错误原因的解析

下面是**本项目示例**，不是官方示例。C++20；缓冲区仅在调用期间借用；长度必须恰好为 2；成功时按大端顺序解码。它不分配内存、不访问硬件、不保存输入指针。

```cpp
#include <array>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <span>
#include <variant>

enum class ParseError { kInvalidLength };
using ParseResult = std::variant<std::uint16_t, ParseError>;

[[nodiscard]] ParseResult ParseBigEndian16(
    std::span<const std::byte> input) noexcept {
  if (input.size() != 2) {
    return ParseError::kInvalidLength;
  }
  const auto high = std::to_integer<std::uint16_t>(input[0]);
  const auto low = std::to_integer<std::uint16_t>(input[1]);
  return static_cast<std::uint16_t>((high << 8) | low);
}

int main() {
  const std::array input{std::byte{0x12}, std::byte{0x34}};
  const auto result = ParseBigEndian16(input);
  const auto* value = std::get_if<std::uint16_t>(&result);
  assert(value != nullptr && *value == 0x1234);

  const auto invalid = ParseBigEndian16(std::span<const std::byte>{});
  const auto* error = std::get_if<ParseError>(&invalid);
  assert(error != nullptr && *error == ParseError::kInvalidLength);
}
```

标准标记：定宽整数 C++11（精确宽度类型由实现支持决定）；byte、variant、nodiscard、类模板实参推导 C++17；span C++20。示例使用平台提供的 uint16_t，不宣称对缺少该类型的平台可直接编译。

使用字节组合避免未对齐的 uint16_t 指针解引用，也不依赖主机字节序。代码中的断言是测试，生产解析逻辑始终执行长度检查。这里 noexcept 的依据是所用标量及 variant 操作不会抛出，不能将同一结论推广到任意 variant 类型。

## 7. 现代特性：采用要有理由

| 特性 | Google 当前取舍 | 本项目的学习与工程边界 |
| --- | --- | --- |
| RTTI | 避免滥用，测试等有适用情形 | 不因限制 RTTI 而用未经证明的 static_cast 向下转型 |
| Concepts（C++20） | 谨慎使用，有具体约束与写法要求 | 学习时可比较不同写法；工程采用需改善接口或诊断 |
| Modules（C++20） | 当前指南不使用 | 可以保留教学实验；部署前验证构建依赖及工具链支持 |
| Coroutines（C++20） | 通过项目认可的库使用 | 明确帧分配、恢复上下文、取消与销毁责任 |

模板、虚函数、variant、类型擦除没有普遍最优选项。先画变化点和所有权，再比较代码体积、编译时间、调用成本与扩展需求；不要把“静态多态”当作实时性证明。

## 8. 嵌入式补充：这是平台规则，不是 Google 通用禁令

- **中断上下文：** 只调用平台明确允许的接口；避免阻塞锁、未知耗时析构、动态分配与无界日志。在线程中可用的 RAII 锁不一定能用于 ISR。
- **运行期资源：** 对实时路径定义容量、栈和时间预算；启动期分配可与运行期分开。容器 reserve 并不自动保证所有后续操作都不分配。
- **寄存器与 DMA：** volatile 不提供线程同步；原子内存序也不自动完成设备缓存维护。内存屏障、访问宽度、DMA 一致性按芯片与架构手册执行。
- **并发：** 为每份共享状态指定同步责任。atomic 不保证所有类型无锁；无锁不等于单次操作等待有界。
- **初始化与关闭：** 明确设备准备顺序、静态对象动态初始化、任务退出及回调排空。不要只测试正常启动。
- **跨语言/ABI：** C 接口边界明确布局、分配与释放方、错误编码、回调上下文；不能让 C 调用方承担隐藏的 C++ 异常传播。

## 9. 工具落地：先检查新增代码

以下是**可选模板**，并未修改仓库全局构建或批量重排历史代码。固定 clang 工具版本后再接入团队 CI。

```yaml
# .clang-format 的候选起点
BasedOnStyle: Google
```

```bash
# 先对本次修改文件检查；文件名替换为真实路径
clang-format --dry-run --Werror path/to/changed.cpp
# build/compile_commands.json 必须来自真实构建配置
clang-tidy -p build path/to/changed.cpp
```

clang-format 解决布局，clang-tidy 检查部分静态问题。不要一次启用所有 checks：先选 bugprone、clang-analyzer 和与语言基线匹配的 modernize 子集，确认目标工具版本可用；历史噪声单独记录，不能把屏蔽告警当作修复。

主机单元测试可按目标配置使用 AddressSanitizer/UndefinedBehaviorSanitizer；并发测试另用 ThreadSanitizer。它们不能证明目标 MCU 的 WCET、MMIO 或 DMA 行为，交叉编译参数也不能直接套用主机检测器。

## 10. 提交前评审清单

- 接口是否说明边界、单位、拥有关系与失败方式？
- 成功、失败、提前返回、取消及关闭路径是否正确释放资源？
- 新特性是否标明标准版本，目标编译器与标准库是否支持？
- 是否存在悬空借用、越界、溢出、未对齐访问或未同步共享状态？
- 实时路径的分配、阻塞、递归与栈使用是否有预算及证据？
- 测试是否覆盖失败路径，而不仅是“能编译”？
- 规则例外是否记录原因、影响、验证方法与复查条件？

进一步阅读：[嵌入式规范索引](embedded-cpp-guideline-notes.md)、[五项评审清单](review-rubric.md)、[软件设计四阶段书单](../references/reading-paths/cpp-software-design.md)。规范用于帮助判断；课程中用于解释错误的反例、历史机制及平台差异应保留清楚的教学标识。
