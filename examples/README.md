# Examples 示例代码库

`examples` 目录存放仓库每日课程的可编译运行 C++ 代码示例与练习实现。所有示例均为独立可运行的 C++23 程序，支持本地与 CI 自动化编译校验。

## 目录用途

- 提供每日课程（`daily/day-XXX.md`）配套的编译验证基准代码。
- 落地代码类练习（修复、重构、实现与调试），确保每个练习均有独立的源码实现。
- 为 CI 构建及在线编译环境（C++ Web Lab / RTOS 模拟器）提供确定性的标准 C++ 样例。

## 内容结构

```text
examples/
├── day-001/ ~ day-076/     # 每日课程配套目录
│   ├── main.cpp            # 每日课程核心 Lab 主入口
│   ├── exercise-01.cpp     # 独立代码练习实现（如存在）
│   └── exercise-01-solution.cpp # 独立代码练习参考解答（如存在）
├── rtos/                   # RTOS 并发模拟器 C++ 教学场景示例
├── modem-channel-exercise.cpp # 独立专题练习源码
├── modem-channel-solution.cpp # 独立专题练习参考解答
└── pointer-choice.cpp      # 指针与所有权决策案例
```

主要契约关系：
1. 每日课程必须拥有对应的 `examples/day-XXX/main.cpp`。
2. 每一个独立 `.cpp` 源文件均须包含 `int main()`，保证可独立编译运行。
3. 练习类文件须按 `exercise-XX.cpp` 规则命名落地，不得只停留在文档说明中。

## 使用方式（相关命令）

在仓库根目录下，可以通过以下 npm 命令发起示例代码的自动编译与运行校验：

```bash
# 使用 g++ -std=c++23 及严格警告标志编译并运行 examples/ 下所有源文件
npm run check:examples
```

直接调用 Python 校验脚本（支持 Sanitizer 内存检查）：

```bash
# 普通模式检查
python3 tools/check-examples.py

# 开启 AddressSanitizer 与 UndefinedBehaviorSanitizer 诊断
python3 tools/check-examples.py --sanitize
```

在本地使用 GCC 单独编译某个示例：

```bash
g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror examples/day-066/main.cpp -o /tmp/day66-main
/tmp/day66-main
```

## 维护约定

1. **零警告编译**：所有示例代码在 `-std=c++23 -Wall -Wextra -Wconversion -Wpedantic -Werror` 下不得产生任何编译警告或错误。
2. **单一职责**：不要在同一个 `main.cpp` 中混入无关的测试代码。新增加的练习需求必须建立单独的 `exercise-XX.cpp`。
3. **确定性输出**：示例中使用 `assert` 进行断言验证，并在控制台输出清晰的运行日志，方便 CI 捕获异常。
4. **与课程联动**：修改或新增 `examples/` 下的文件后，需同步运行 `npm run check:course` 与 `npm run check:examples`，确保 `daily/` 课程文档与示例代码保持一致。
