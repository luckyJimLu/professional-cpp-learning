# Day 18 · Coding with Style 收官：函数边界、控制流与可维护性

> 历史课程迁移自原 Gmail 正文；已转换为 Markdown。

**Chapter 3 · Coding with Style 收官：函数边界、控制流与可维护性**

今日目标：把“风格”从排版提升为可维护性设计。围绕单一职责、早返回、参数对象、enum class 完整 switch、明确循环边界，完成一个嵌入式 Modem 状态处理实验。

建议阅读：Professional C++, Sixth Edition，Chapter 3 Coding with Style 的后半部分/收尾内容；复习 Chapter 3 关于可读性、一致性、命名、注释、格式与工程实践的讨论。

昨日复习：1) 为什么 warning 后直接 static_cast 不等于修复？2) assert 与可恢复错误的边界？3) 为什么错误要保留上下文？

核心：函数应完成一个可命名动作；错误和边界条件尽早返回；多个弱类型参数应升级为 Options/Config；状态用 enum class；switch 明确覆盖状态；协议帧、DMA、ring buffer 的 size/index 必须明确并检查边界。

C → 现代 C++：避免 int state、多个 bool、-1 错误码和深层 if；改用 enum class、Config、Result/Status 和小函数。

今日编码规范：MUST 可恢复错误不用 assert；SHOULD 单一职责与早返回；SHOULD 参数较多时用 Options/Config；MUST 循环边界明确。

练习：实现无异常、无动态分配的 Modem URC Dispatcher，解析 +CREG / +CSQ，使用 string_view 借用输入，enum class 表达事件类型，Result 表达解析状态；增加空输入、超长输入、未知 URC、非法数字和边界值测试。Code Review：修复一个使用 int state、bool verbose、bool retry、magic timeout、assert(input) 和 for(i <= len) 的旧接口。

常见坑：1) 把 early return 机械化导致清理逻辑遗漏；2) enum class 新增状态但 switch 未同步；3) size_t/有符号整数混用造成边界错误。

检查题：1) 为什么 Options 比连续 bool 参数更适合长期演进的驱动接口？2) ring buffer 中为什么必须明确容量、有效长度、读写索引各自语义？
