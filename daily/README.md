# 每日课程（Daily Lessons）

本目录存放每日 C++ 工程化课程正文。课程基于 *Professional C++, 6th Edition* 的章节顺序展开，目前已发布 Day 1–72，单篇学习时间建议控制在 60 分钟左右。

## 文件命名与规范

课程文件统一采用 `day-XXX-slug.md` 命名，其中 `XXX` 为三位数字序号（如 `day-001-from-c-to-modern-cpp.md`）。格式细节可参考 [每日课程模板](../docs/maint/day-template.md)。

## 10 段式固化结构

每篇每日课程均包含以下 10 个固定章节：

1. **今日章节**：原书映射与阅读建议。
2. **昨日复习**：3 个上一课核心回忆点。
3. **核心概念**：语言机制与底层原理解析。
4. **C 写法 vs Modern C++**：新旧写法对比与演进原因。
5. **设计模式映射**：变化轴、稳定边界与应用决策。
6. **Embedded 场景**：资源限制、RTOS 与嵌入式工程边界。
7. **编码规范**：命名、契约与安全基线。
8. **可编译 Lab**：完整可运行示例（配套 `examples/day-XXX/`）。
9. **常见坑**：典型错误与模式滥用分析。
10. **检查题 + 设计题**：2 道知识自测与 1 道架构设计思考题。

## 课程目录概览

详细的前置依赖与导航可查阅 [逐课入门导航](../docs/beginner-course-map.md)。以下为各章节课程划分：

| 阶段 / 章节 | 范围 | 主题摘要 |
| --- | --- | --- |
| Chapter 1–2 | Day 1–7 | C 语言过渡、初始化、const/constexpr、引用指针与第 1 周 Modem 综合工程 |
| Chapter 3 | Day 8–14 | std::string、std::string_view、格式化、代码风格与头文件依赖边界 |
| Chapter 3–4 | Day 15–18 | 命名规则、静态分析门禁、错误处理模型与函数控制流 |
| Chapter 4 | Day 19–27 | 需求分析、架构抽象、复用策略、内聚耦合与 Chapter 4 设计收束 |
| Chapter 5 | Day 28–35 | 类不变量、构造函数、组合模式、所有权生命周期与虚接口多态 |
| Chapter 5 | Day 36–40 | Has-a / Is-a 关系边界、多继承契约、Mixin 类与类关系收束 |
| Chapter 6 | Day 41–55 | 面向复用设计、模板与概念、防护边界、可用接口设计与 SOLID 原则 |
| Chapter 7 | Day 56–66 | 内存所有权、智能指针、自定义删除器、PMR 分配器与资源决策树 |
| Chapter 8 | Day 67–72（进行中） | class 封装、成员函数、对象存储期、this、对象创建、构造函数、Copy Constructors |

下一课为 **Day 73 · Chapter 8 · Delegating Constructors（p.283 起）**。
