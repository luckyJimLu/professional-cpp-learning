# 可运行练习审计

## 结论

当前仓库已具备完整的 **主 Lab 可运行链路**，但尚未形成“每道代码类修复题/挑战题均有独立可运行源码”的统一结构。

本次结构审计覆盖 `examples/day-001` 至 `examples/day-052`：

- 52 / 52 个 Day 都存在 `main.cpp`；
- 51 / 52 个 Day 目录只有 `main.cpp`；
- Day 14 额外包含 `config.hpp`；
- 当前没有统一的 `exercise-01.cpp` / `exercise-01-solution.cpp` 目录约定；
- 旧课程中的 Markdown 代码片段不能仅凭目录结构证明可独立编译运行。

因此当前能力应区分为：

| 能力 | 状态 |
| --- | --- |
| 每日主 Lab 有独立 source | ✅ |
| 每日主 Lab 由 CI 编译 | ✅ |
| 每日主 Lab 由 CI 运行 | ✅ |
| 独立代码练习统一命名 | 新增规范 |
| 独立代码练习由 CI 编译 | ✅ 本次加入 |
| 独立代码练习由 CI 运行 | ✅ 本次加入 |
| 历史 Markdown 修复题全部迁移为独立 source | ⏳ 渐进迁移 |

## 可运行练习契约

凡要求学习者实际修改代码的练习，均不应仅保留在 Markdown 代码块中。

推荐结构：

```text
examples/day-053/
├── main.cpp
├── exercise-01.cpp
└── exercise-01-solution.cpp
```

规则：

1. `main.cpp` 是当天主 Lab，必须完整、可独立编译、可运行。
2. `exercise-XX.cpp` 是 starter，优先保持“能编译、能运行，但设计/语义存在问题”，便于形成：
   `运行 → 观察 → 修改 → 再运行`。
3. `exercise-XX-solution.cpp` 是推荐解，可在确有教学价值时提供。
4. 每个独立 `.cpp` 必须有自己的 `int main()`。
5. 不依赖未声明的 IDE 状态、隐藏文件或手工粘贴。
6. 默认使用：
   `-std=c++23 -Wall -Wextra -Wconversion -Wpedantic`。
7. Embedded 练习要把 timeout、capacity、ownership、lifetime、thread/ISR context 等约束显式化。
8. 设计模式练习优先展示“保持简单 → 识别变化轴 → 建立稳定边界 → 必要时引入 Pattern”的演化过程，而不是强行套模式。

## CI 契约

`.github/workflows/web-build.yml` 会查找：

```bash
find examples/day-* -maxdepth 1 -type f -name '*.cpp'
```

并对每个 source：

1. C++23 编译；
2. 开启严格 warnings；
3. 运行生成的可执行文件；
4. 任一文件失败即阻止合并/构建。

`tools/check-course.py` 还会检查：

- 每个已发布 Day 是否存在 `examples/day-XXX/main.cpp`；
- 每个 standalone `.cpp` 是否包含 `int main()`；
- frontmatter lab path 是否存在；
- 主 Lab 是否被课程引用。

## 历史迁移策略

不建议一次性机械生成 52 份低价值 exercise 文件。历史课程按以下优先级逐步迁移：

1. ownership / lifetime / smart pointer；
2. inheritance / polymorphism / slicing；
3. stable boundary / composition / dependency injection；
4. templates / generic design；
5. error handling / timeout / bounded retry；
6. Embedded callback / thread / ISR / resource-boundary 场景。

迁移时应从当天 Markdown 的真实教学目标生成 exercise，而不是复制一个通用模板。

## 新课程要求

从 Day 53 起，只要第 8 节包含“修复代码 / 重构 / 实现 / 调试”任务，就必须同时提交相应 `exercise-XX.cpp`；仅知识问答或纯设计题不要求额外 source。
