# 每日课程模板（Day Template）

所有 `daily/day-XXX-*.md` 都必须遵循本模板。目标：任何一天拿起来，
结构、篇幅、语气都一致；网站渲染、CI 检查都依赖 frontmatter 字段。

---

## Frontmatter（YAML，必须）

```yaml
---
day: 17                  # 数字，无前导零
week: 3                  # 第几周
part: I                  # 卷：I / II / III
chapter: 3               # 章节号
chapter_title: Coding with Style
title: Errors, Assert and Clear Control Flow   # 英文标题
duration: 60             # 分钟
status: published        # draft | published

topics:                  # 3~6 个 kebab-case 主题标签
  - error-handling
  - assert
  - control-flow

guidelines:              # 关联的编码规范条目（kebab-case）
  - no-assert-for-recoverable-errors
  - early-return

lab:
  path: examples/day-017/main.cpp   # 可选；若填写则必须存在且可编译

previous: 16
next: 18
---
```

## 正文结构（固定 8 节 + 下一步）

| 节 | 标题 | 时长 | 内容要求 |
|----|------|------|----------|
| ① | 今日章节与建议阅读范围 | 5 分钟 | 书的章节定位；今天只解决哪一个问题（用引用块强调）；重点关注 bullet 5~8 条 |
| ② | 昨日复习 3 问 | 5 分钟 | 恰好 3 个问题，源自上一天内容；建议先口头回答 |
| ③ | 核心概念 | 12 分钟 | 分 3~5 个小节讲透；每个概念配"为什么"和嵌入式视角 |
| ④ | C 写法 vs Modern C++ | 8 分钟 | 先给 C 风格代码 + 它的真实问题（bullet）；再给 Modern C++ 版本 + 好处；最后给"不要过度"的提醒 |
| ⑤ | 今日编码规范 | 8 分钟 | MUST / SHOULD / AVOID 三级条目，每条一句话 + 一行解释 |
| ⑥ | 可编译实验 | 15 分钟 | 实验目标、关键代码片段、编译运行命令、预期输出；完整代码在 `lab.path` |
| ⑦ | 3 个常见坑 | 3 分钟 | 恰好 3 个，每个：加粗标题 + 2 行解释 |
| ⑧ | 检查题 | 4 分钟 | 2 道题（Q1/Q2），每题有代码或场景；文末给"答案要点" |
| — | 下一步 | — | 一句话预告下一天主题 |

## 写作规范

- 标题：`# Day 17 · 中文标题`
- 代码块一律 ` ```cpp `，遵循仓库编码规范基线：
  类型/函数 `PascalCase`，变量/参数 `snake_case`，成员 `snake_case_`，
  常量 `kPascalCase`，`enum class`，RAII，`[[nodiscard]]` 优先。
- 嵌入式视角：每节至少一处点出资源/实时性/无异常语境下的取舍。
- 中英混排时，英文术语用反引号或加粗，不要裸奔。
- 禁止事项：不以投递、排版或迁移说明替代教学正文；
  实验代码必须在本地 `g++ -std=c++23 -Wall -Wextra -Wconversion -Wpedantic`
  下零警告编译并运行通过。


## 内容与验证附卡

保持上面的八阶段、frontmatter 和约 60 分钟结构；以下信息放在阅读、实验和检查题中，不创建另一套前端必须解析的字段。

- 阅读开头：本课一个核心问题、两至三个可观察学习目标、前置 Day／专题。
- 实验开头：源码路径、语言标准、依赖与运行环境；使用 [环境卡](lab-environments.md) 记录版本。
- 实验结尾：正常、边界和失败输入；预期结果与实际结果分开；资源释放、容量、timeout 和上下文约束。
- 检查题答案：结论、依据、常见误答及可验证方法；设计题按 [评审标准](../guidelines/review-rubric.md) 评分。
- 验证记录：资料／源码／主机／模拟／板端分别标注；未运行不填通过。专题和模拟器不等同于每日课程完成。
- 导航：至少关联一个已存在的前置内容及一个对应实验；后续尚未发布课程只给主题，不生成失效链接。
