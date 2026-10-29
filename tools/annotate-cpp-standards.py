#!/usr/bin/env python3
"""Maintain reviewed standard-version notes; --check verifies generated content."""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# First standardized version, not the repository's compilation mode.
FEATURES = [
    (r'列表初始化|统一初始化|\b(?:int|double|bool|char|auto|std::\w+(?:::\w+)*)\s+\w+\s*\{', '列表初始化', 'C++11', '包括直接列表初始化；窄化检查及 initializer_list 优先规则须单独注意。'),
    (r'\blambda\b|Lambda|\[(?:[&=]|[A-Za-z_]\w*(?:\s*=\s*[^]\n]+)?|)\]\s*(?:\(|\{)', 'lambda 表达式', 'C++11', '泛型 lambda（auto 形参）、初始化捕获从 C++14 起可用；显式模板形参列表从 C++20 起可用。'),
    (r'=\s*(?:default|delete)\b', '`= default` / `= delete`', 'C++11', '显式默认化与删除函数。'),
    (r'范围\s*for|range-based|for\s*\([^;\n]+(?<!:):(?!:)[^;\n]+\)', '范围 `for`', 'C++11', '带初始化语句的范围 for 从 C++20 起可用。'),
    (r'\b(?:if|switch)\s*\([^\n)]*;[^\n)]*\)', '`if` / `switch` 初始化语句', 'C++17', '如 if (auto x = read(); x.ok())；不同于条件中声明变量。'),
    (r'\bconstexpr\b', '`constexpr`', 'C++11', 'C++14 放宽函数体限制；C++20 继续扩展可用于常量求值的操作。声明不保证每次调用都在编译期执行。'),
    (r'\bstatic_assert\b', '`static_assert`', 'C++11', '省略诊断字符串的单参数形式从 C++17 起可用。'),
    (r'\bnullptr\b', '`nullptr`', 'C++11', '空指针字面量；不要与整数 0 的类型混为一谈。'),
    (r'\benum\s+class\b', '`enum class`', 'C++11', '有作用域枚举。'),
    (r'结构化绑定|\bauto\s*(?:const\s*)?[&]*\s*\[', '结构化绑定', 'C++17', '如 `auto [a, b] = value;`。'),
    (r'\bauto\s+[A-Za-z_]\w*\s*(?:=|\{)|\bauto\s*(?:const\s*)?&', '`auto` 类型推导', 'C++11', 'C++14 才支持普通函数返回类型推导；C++20 才支持 `auto` 形参的简写函数模板。'),
    (r'\bdecltype\b', '`decltype`', 'C++11', '`decltype(auto)` 从 C++14 起可用。'),
    (r'\bnoexcept\b', '`noexcept`', 'C++11', '从 C++17 起异常说明成为函数类型的一部分。'),
    (r'\boverride\b|\bfinal\b', '`override` / `final`', 'C++11', '用于虚函数覆盖检查、限制覆盖或继承。'),
    (r'\balignas\b|\balignof\b', '`alignas` / `alignof`', 'C++11', '对齐要求与查询。'),
    (r'R"[^\s(]*\(', '原始字符串字面量', 'C++11', '如 `R"(text)"`；不负责字符编码转换。'),
    (r'\[\[nodiscard', '`[[nodiscard]]`', 'C++17', '带说明字符串的形式从 C++20 起可用。'),
    (r'\[\[maybe_unused', '`[[maybe_unused]]`', 'C++17', '抑制有意未使用实体的相关诊断。'),
    (r'\bif\s+constexpr\b', '`if constexpr`', 'C++17', '编译期分支；与普通 `if` 不同。'),
    (r'\bconsteval\b|\bconstinit\b', '`consteval` / `constinit`', 'C++20', '前者约束立即函数调用；后者要求静态或线程存储期变量满足静态初始化，不表示不可修改。'),
    (r'\brequires\b|\bconcept\s+\w|std::(?:concepts|same_as|convertible_to)', 'Concepts / `requires` / `<concepts>`', 'C++20', '语言约束与标准库概念；`std::concepts` 不是标准命名空间。'),
    (r'\bco_await\b|\bco_return\b|\bco_yield\b', '协程语言支持', 'C++20', '语言支持不等于标准库提供通用异步任务运行时。'),
    (r'std::(?:u?int(?:8|16|32|64)_t)', '`<cstdint>` 固定宽度整数', 'C++11', '精确宽度类型仅在实现提供对应整数类型时存在。'),
    (r'std::array\b', '`std::array`', 'C++11', '固定大小容器。'),
    (r'std::(?:unique_ptr|shared_ptr|weak_ptr|make_shared|enable_shared_from_this)\b', '标准智能指针与 `std::make_shared`', 'C++11', '`unique_ptr`、`shared_ptr`、`weak_ptr`、`enable_shared_from_this`；不要据此把所有相关辅助函数都标为 C++11。'),
    (r'std::make_unique\b', '`std::make_unique`', 'C++14', '晚于 C++11 的 `std::unique_ptr`。'),
    (r'\bweak_from_this\s*\(', '`enable_shared_from_this::weak_from_this`', 'C++17', '`shared_from_this()` 从 C++11 起已有。'),
    (r'std::(?:move|forward)\b|右值引用|移动语义', '移动语义 / `std::move` / `std::forward`', 'C++11', '`std::move` 本身执行类型转换，不直接搬运资源。'),
    (r'std::function\b', '`std::function`', 'C++11', '可调用对象包装；可能分配内存。'),
    (r'std::chrono\b', '`std::chrono`', 'C++11', '如 duration、time_point、steady_clock；不是所有 chrono 后增 API 都属于 C++11。'),
    (r'chrono_literals|\b\d+(?:ms|us|ns|s)\b', 'chrono 时长字面量', 'C++14', '如 `100ms`；需要相应头文件与 `std::chrono_literals`。'),
    (r'std::string_view\b', '`std::string_view`', 'C++17', '非拥有视图；其 `starts_with` / `ends_with` 是 C++20 新增。'),
    (r'\bstarts_with\s*\(|\bends_with\s*\(', '`string` / `string_view` 的前后缀检查', 'C++20', '`starts_with` / `ends_with`。'),
    (r'std::(?:optional|nullopt)\b', '`std::optional` / `std::nullopt`', 'C++17', '可选值；不自带错误原因。'),
    (r'std::variant\b|std::visit\b', '`std::variant` / `std::visit`', 'C++17', '类型安全的可辨识联合与访问。'),
    (r'std::any\b', '`std::any`', 'C++17', '保存可复制类型的类型擦除值容器。'),
    (r'std::(?:from_chars|to_chars)\b', '`std::from_chars` / `std::to_chars`', 'C++17', '整数及浮点重载均在 C++17 标准化；旧标准库的浮点支持可能滞后。'),
    (r'std::byte\b', '`std::byte`', 'C++17', '字节枚举类型，不是整数算术类型。'),
    (r'std::pmr\b', '`std::pmr` / 多态内存资源', 'C++17', '包括 memory_resource、polymorphic_allocator 与标准内存资源。'),
    (r'std::destroy_at\b|\bdestroy_at\s*\(', '`std::destroy_at`', 'C++17', '从 C++20 起可用于常量求值，并支持数组。'),
    (r'std::construct_at\b|\bconstruct_at\s*\(', '`std::construct_at`', 'C++20', '不能与 C++98 已有的 placement new 混为同一引入版本。'),
    (r'std::launder\b', '`std::launder`', 'C++17', '满足前提时获取指向新对象的指针，不是任意对象重用的修复工具。'),
    (r'std::span\b', '`std::span`', 'C++20', '连续序列的非拥有视图；不自动延长底层对象生命周期。'),
    (r'std::format\b|std::format_to\b', '`std::format` / `std::format_to`', 'C++20', '需标准库实现支持；仅启用编译器语言选项并不足够。'),
    (r'std::ranges\b', '`std::ranges` 基础设施与算法', 'C++20', '后续视图与算法仍需逐项核对版本，例如 `ranges::to` 为 C++23。'),
    (r'std::expected\b|std::unexpected\b', '`std::expected` / `std::unexpected`', 'C++23', '此处 unexpected 指 `<expected>` 中的类模板，而非旧异常处理函数。'),
    (r'std::(?:print|println)\b', '`std::print` / `std::println`', 'C++23', '定义于 `<print>`；不同于 C++20 的 `std::format`。'),
]
START = '<!-- cpp-standards:start -->'
END = '<!-- cpp-standards:end -->'


def render(rows):
    return '\n'.join(['| 特性 | 首次标准化 | 版本边界 |', '| --- | --- | --- |'] +
                     [f'| {label} | **{version}** | {note} |' for _, label, version, note in rows])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    changes = []
    for path in sorted((ROOT / 'daily').glob('day-*.md')):
        original = path.read_text()
        clean = re.sub(r'\n' + re.escape(START) + r'.*?' + re.escape(END) + r'\n', '', original, flags=re.S)
        day = int(re.search(r'day-(\d+)', path.name)[1])
        sources = clean + '\n' + '\n'.join(p.read_text() for p in sorted((ROOT / f'examples/day-{day:03}').glob('*.cpp')))
        rows = [f for f in FEATURES if re.search(f[0], sources)]
        body = render(rows) if rows else '本课以设计原则或 C++98 已有机制为主；未匹配到本索引收录的 C++11 及以后特性。'
        block = f'\n{START}\n## 本课涉及的 C++ 标准\n\n以下按正文与配套 `.cpp` 示例中出现的特性标注首次标准化版本，不代表整份程序的最低编译版本。仓库主 Lab 统一使用 C++23。\n\n{body}\n\n版本差异、旧机制与工具链检查见 [C++ 标准来源速查](../docs/cpp-feature-standards.md)。\n{END}\n'
        heading = re.search(r'^# .+$', clean, re.M)
        assert heading, path
        updated = clean[:heading.end()] + '\n' + block + clean[heading.end():]
        # Keep insertion idempotent despite surrounding blank lines.
        updated = re.sub(re.escape(END) + r'\n\n+', END + '\n\n', updated)
        updated = re.sub(r'\n{3,}' + re.escape(START), '\n\n' + START, updated)
        if updated != original:
            changes.append(path)
            if not args.check:
                path.write_text(updated)
    doc = '''# C++ 新特性：标准来源速查

“本课用 C++23 编译”不表示其中的特性全部来自 C++23。下表记录首次进入 ISO C++ 标准的版本，并单独说明后续增强。课程正文和配套示例出现这些特性时，课首会显示对应表格。

## 如何读版本

- **语言特性**由编译器支持；**标准库功能**还取决于 libstdc++、libc++ 或 MSVC STL 的版本。
- `-std=c++20` / `-std=c++23` 选择语言模式，不保证对应标准库的每项功能都已实现。
- 本表不是完整 C++ 标准目录，也不承诺仅依表中的最高版本即可编译整份程序。模板写法、其他 API 和平台依赖仍须核对。
- 区分首次引入与增强：`unique_ptr` 是 C++11，`make_unique` 是 C++14；`string_view` 是 C++17，`starts_with` 是 C++20。

## 课程中的现代特性

''' + render(FEATURES) + '''

## 不要误标为“现代新增”的机制

| 机制 | 标准来源 | 提醒 |
| --- | --- | --- |
| `const`、引用、类、继承、虚函数、模板、异常、命名空间 | C++98 已有 | 不是 C++11 新特性；部分机制早于首版 ISO 标准。 |
| RAII、构造/析构、placement new | C++98 已有 | RAII 是资源管理惯用法，不是某个现代版本新增的关键字。 |
| `static_cast` / `dynamic_cast` / `const_cast` / `reinterpret_cast` | C++98 已有 | 不要因现代代码推荐使用而标为 C++11。 |
| `std::string`、`std::vector`、`std::numeric_limits`、`std::nothrow` | C++98 已有 | 具体后增成员及重载要另查。 |
| 列表初始化 `T value{...}`、范围 `for`、lambda、`= default` / `= delete` | C++11 | 不等同于 C++98 已有的聚合初始化；泛型 lambda 和初始化捕获从 C++14 起可用。 |
| `if (init; condition)` / `switch (init; condition)` | C++17 | 与 C++98 已有的条件中声明变量不同。 |
| 保证的复制消除、内联变量、折叠表达式 | C++17 | NRVO 仍不是强制保证；内联函数在 C++98 已有。 |

## 核对来源与工具链

- [cppreference：C++ 编译器支持与各版本索引](https://en.cppreference.com/w/cpp/compiler_support.html)：按语言特性、标准库及具体实现版本查阅。
- [cppreference：特性测试宏](https://en.cppreference.com/w/cpp/feature_test.html)：用 `__cpp_*` / `__cpp_lib_*` 判断具体能力；库宏通常需包含对应头文件或 C++20 的 `<version>`。
- [WG21 标准文档与工作草案入口](https://isocpp.org/std/the-standard)：需要精确措辞时核对对应版本标准或草案；提案编号、编译器扩展或实验性 TS 不等于已经进入正式标准。
- [仓库实验环境](lab-environments.md)：主 Lab、浏览器、设计模式及嵌入式实验使用不同运行环境。

维护：修改课程或配套示例后运行 `python3 tools/annotate-cpp-standards.py`；用 `--check` 检查课首表与本页是否同步。识别规则只覆盖人工维护的条目，不替代对新语法、新成员和重载的人工审查。
'''
    target = ROOT / 'docs/cpp-feature-standards.md'
    if not target.exists() or target.read_text() != doc:
        changes.append(target)
        if not args.check:
            target.write_text(doc)
    print(f'{"Out of date" if args.check else "Updated"}: {len(changes)} file(s)')
    return 1 if args.check and changes else 0


if __name__ == '__main__':
    raise SystemExit(main())
