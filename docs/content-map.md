---
summary: 从教材章节到工程专题、可运行实验和评审，按前置知识选择学习路径并核对验证证据。
---
# 内容总索引与覆盖矩阵

本项目提供现代 C++ 入门主线与 C / Embedded 进阶路径。主线仍按《Professional C++, Sixth Edition》章节推进；专题、模拟器和综合实验不占用新的 Day 编号。

## 如何开始

1. 首次学习：从[新手入门手册](beginner-start.md)与 [Day 1–64 前置导航](beginner-course-map.md)开始；当前主线已发布至 Day 64，正在 Chapter 7。
2. 做实验前：阅读 [实验环境矩阵](lab-environments.md)，确认浏览器、主机、模拟器和板端的边界。
3. 学过接口与复用：完成 [Chapter 6 章末评审](chapter-06-review.md)。
4. 串联模块：进入 [Modem 数据通道贯穿实验](engineering-learning-path.md)。
5. 查阅扩展资料：按 [参考资料导读](reference-reading-guide.md) 选择需要的章节，不必顺读整个资料区。

## 模块学习与交付矩阵

| 模块 | 前置知识 | 推荐顺序及现有入口 | 本轮交付／学习证据 | 后续缺口 |
| --- | --- | --- | --- | --- |
| 每日课程 | 可从编译运行起步，按课补齐函数与类型基础 | Ch1–3 → Ch4–6 → Ch7；以已发布课程为准 | 运行主 Lab、解释边界、完成章末评审 | Ch7 以后仍随教材逐课发布，不预设完成日期 |
| 历史练习 | 对应 Day 的概念与主 Lab | [迁移清单](historical-exercises.md) | 优先补齐借用、容量、契约、所有权四组；独立题型区分运行示范与修改练习 | 清单中的历史 starter 尚未全部落地 |
| 设计模式 | value semantics、composition、小接口 | [分类索引](../patterns/book-examples.md) → [选型工作坊](../patterns/engineering-workshop.md) | 33 个 C++17 程序；比较无模式方案、变化轴和成本 | 多模式综合场景按真实需求补充 |
| Asio | 生命周期、回调、错误处理；协程需 C++20 | [模块首页](../frameworks/asio/README.md) → 生命周期 → Handler → Runner → [异步契约实验](../frameworks/asio/ASYNC_WORKSHOP.md) | Echo 主机烟测；超时、取消、背压、关闭的实验步骤和判断标准 | 故障注入扩展的实际运行结果须逐项补记录 |
| OpenHarmony | 任务／ISR、C 接口、交叉编译 | [源码与接口](../frameworks/openharmony/README.md) → [首次构建手册](../frameworks/openharmony/07-first-build-lab.md) | 固定版本资料与源码核对；构建／启动证据清单 | 具体板卡、完整构建与启动尚待验证 |
| TRACE32 | 符号、异常、任务与资源生命周期 | [操作路线](../frameworks/trace32/README.md) → [证据案例包](../frameworks/trace32/08-case-study.md) | 主机 CFSR 解码断言；证据—推理—反证—回归示范 | 真实探头、目标板及命令执行待验证 |
| RTOS 模拟器 | 任务状态、同步、阻塞与超时 | [9 场景教学手册](rtos-simulator/LEARNING-GUIDE.md) | 预测 → 回放 → 参数对照 → 解释；保存事件或导出轨迹 | 不代表真实内核时序、吞吐或 WCET |
| 内存可视化 | 指针、作用域、RAII、容器 | [5 轨迹导学](memory-visualizer-guide.md) | 源码行、对象状态、所有权关系与检查题 | 预置快照不是当前编译器的内存布局证明 |
| 编码规范与复盘 | 对应概念和可运行代码 | [规范索引](../guidelines/embedded-cpp-guideline-notes.md) → [评审标准](../guidelines/review-rubric.md) → 章／周复盘 | 五项评审、错误／推荐对照、检测方法和例外依据 | 尚无统一实测评分，阅读记录不是掌握度 |
| 工程工具 | Git、构建产物、SSH／SCP | [工具首页](../utils/README.md) → [操作与失败清单](../utils/windows-remote-script-runner/OPERATIONS.md) | manifest、hash、日志和失败恢复记录 | Windows／硬件行为需在目标环境验证 |

## 状态与证据

状态是各类证据，不是按顺序自动晋级的等级：

| 状态 | 可以据此声称什么 | 不足以证明什么 |
| --- | --- | --- |
| 资料整理 | 有来源和阅读顺序 | 当前版本实现确实如此 |
| 源码核对 | 指定 revision 的符号或调用链已检查 | 已构建、板卡已启用该组件 |
| 主机验证 | 记录的主机、编译器、输入下行为符合预期 | 交叉编译成功、实时性能或板端可用 |
| 模拟验证 | 所选模型和配置生成了指定事件 | 真实 RTOS 的调度细节和硬件中断延迟 |
| 板端验证 | 指定固件、配置和硬件上有实际证据 | 其他板卡、版本或配置同样成立 |

每条验证记录包含：版本／commit、日期、命令与目录、环境、输入、实际结果、证据位置和未验证项。没有日志时只给操作与预期，不填写“已通过”。新增内容的验证入口汇总于 [整改验收记录](content-refinement-validation.md)。

## 章节与专题的双向联系

| 主线问题 | 对照专题 | 应留下的成果 |
| --- | --- | --- |
| 字符串与视图借用 | Modem 请求的 payload 所有权 | 修改源缓冲区后，队列中的请求保持快照 |
| 类的不变量与复用 | 设计模式工作坊 | 无效状态不可创建；解释何时不需要 virtual 或 Factory |
| Ch7 内存管理 | 智能指针、内存轨迹、Asio Session | 画出 owner／borrower，指出取消后的对象释放条件 |
| I/O 与错误处理 | Asio、Modem 通道 | 分清超时、取消、传输失败及部分传输 |
| 多线程与并发 | RTOS、Asio Runner | 声明共享状态、执行上下文和关闭协议 |
| 测试与调试 | TRACE32、构建同步工具 | 符号匹配、复现输入、失败证据和修复回归 |

## 维护约定

- 每篇深入文章只保留一个主要维护位置；其他模块添加导读和交叉链接。
- `references/system-design-notes/` 保留迁移清单和校验基线；纠错写在导读或本项目专题，引用原文件及适用版本。
- 新增 Day 不覆盖旧 Day，不用专题补齐进度数字。周复盘在对应 7 天结束后编写；章末评审不必等待周末。
- 发布前同时检查文档入口、完整源码、预期结果、失败分支和验证范围。
