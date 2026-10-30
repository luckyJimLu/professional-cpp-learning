# 参考资料导读：按问题进入，不重复建立主线

返回 [内容总索引](content-map.md)。`references/system-design-notes/` 是带迁移清单的来源资料；中英文版本不是两套独立课程。原文保留校验基线，当前项目的纠错、实验结果和新版本对照写在本页或所属专题，不批量改动原文。

## 编译器与 ABI 进阶书单

新增 [C++ 底层机制进阶书单](../references/reading-paths/cpp-compiler-abi.md)：按二进制观察 → 对象模型 → 现代编译期机制 → 工业编译器与 ABI 四阶段推进。每阶段有书目、阅读重点、实践与进入下一阶段的检查点；网页在“专题知识库 → 参考书籍 · 书单与 PDF”进入。

另见 [C++ 入门与软件设计四阶段书单](../references/reading-paths/cpp-software-design.md)，含资料库原文件链接及核对后的版次。

## 按问题查资料

| 你现在的问题 | 推荐入口 | 读完后做什么 |
| --- | --- | --- |
| 模板、虚接口与组件边界如何取舍 | [C++ 系统架构](<../references/system-design-notes/content/33. Cpp System Architecture/index.zh.md>) | 先做 [模式选型工作坊](../patterns/engineering-workshop.md)，记录直接组合的基线 |
| 事件循环如何组织线程与回调 | [Boost.Asio 深入](<../references/system-design-notes/content/34. Boost Asio Deep Dive/index.zh.md>) | 对照 [Standalone 工作坊](../frameworks/asio/ASYNC_WORKSHOP.md)，先分清 namespace、版本和取消 API |
| 如何搭建基本 I/O 与网络程序 | [Asio 基础](<../references/system-design-notes/content/35. Boost.Asio - 01 The Basics/index.zh.md>) → [I/O 操作](<../references/system-design-notes/content/36. Boost.Asio - 02 IO Operations/index.zh.md>) | 运行现有三个 Echo，保留分片与重连证据 |
| 客户端、服务端、HTTP／TLS 如何演化 | [客户端](<../references/system-design-notes/content/37. Boost.Asio - 03 Client Applications/index.zh.md>) → [服务端](<../references/system-design-notes/content/38. Boost.Asio - 04 Server Applications/index.zh.md>) → [HTTP／TLS](<../references/system-design-notes/content/39. Boost.Asio - 05 HTTP and SSL-TLS/index.zh.md>) | 先明确 framing、证书校验、deadline、关闭和错误语义，再添加实现 |
| 共享数据与条件变量有什么风险 | [共享数据](<../references/system-design-notes/content/43. C++ Concurrency - 03 Sharing Data/index.zh.md>) → [同步操作](<../references/system-design-notes/content/44. C++ Concurrency - 04 Synchronizing Operations/index.zh.md>) | 用 [RTOS 场景](rtos-simulator/LEARNING-GUIDE.md) 研究状态转换；另用原生测试研究数据竞争 |
| 为什么不能用 volatile 同步 | [内存模型与原子](<../references/system-design-notes/content/45. C++ Concurrency - 05 Memory Model and Atomics/index.zh.md>) | 写出 happens-before 依据；调度动画不证明 C++ 内存模型正确 |
| 怎样验证并发和关闭协议 | [并发测试与调试](<../references/system-design-notes/content/51. C++ Concurrency - 11 Testing and Debugging/index.zh.md>) | 用可控事件顺序、失败注入和有界等待补充压力测试 |
| 嵌入式资源、网络与诊断如何结合 | [嵌入式资料入口](<../references/system-design-notes/content/29. embedded-systems/README.md>) | 对照 [OpenHarmony](../frameworks/openharmony/README.md) 与 [TRACE32](../frameworks/trace32/README.md)，声明目标差异 |

## 版本和概念校对

- Boost.Asio 迁移示例按原文的 Boost 1.83.0 环境；本项目 Standalone 示例按 Asio 1.30.2。源码相似不意味着所有 API、错误类型和取消行为一致。
- `strand` 的串行执行保证不等于实现 lock-free；只有经同一 strand 的状态访问受该约束。
- `shared_ptr` 的共享生命周期不替代对象同步，取消也不等于处理器已返回。
- 原生线程、RTOS 任务和确定性解释器有不同调度与运行时；同名 API 不能直接等价。
- 原书页码与 PDF 页序可能不同；按书名、版本、章节、小节定位。已有资料与许可证说明继续保留，不发布未获许可的原书全文。

发现原文不适用于当前环境时，记录原路径、段落、原版本、当前版本、源码／实验依据和影响，不在未核对时直接标“原文错误”。来源文件完整性与技术结论适用性是两类检查。

## Zephyr 与 Mini 扩展怎么读

[Mini C++11 兼容性](harmonyos-mini-cpp11-compatibility.md) 与 [Zephyr／ZPP C++20](zephyr-cpp20-zpp.md) 是跨平台学习摘要，不是已验证的统一包装库。对照构造／初始化顺序、线程入口、栈存储寿命、错误模型和释放上下文；选择目标版本后逐项验证。

维护来源校验使用 `python3 tools/check-migration.py`；可运行部分见 [实验环境矩阵](lab-environments.md)。
