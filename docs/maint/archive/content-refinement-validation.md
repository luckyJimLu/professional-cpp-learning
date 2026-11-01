# 内容整改验收记录

日期：2026-10-20。返回 [内容总索引](content-map.md)。本页只记录实际执行的检查与可追溯边界，不把待执行操作手册视为硬件结果。

## 本轮可运行证据

| 对象 | 输入／环境 | 检查与结果 | 范围限制 |
| --- | --- | --- | --- |
| Modem starter | GCC 14.2，C++23、严格 warnings、`-fno-exceptions` | 公共检查通过；输出恢复容量 0 及 EXPECTED GAP，进程成功退出 | 明确保留取消容量缺陷，不表示满足完整契约 |
| Modem 参考解 | 同一主机与行为矩阵 | 输出恢复容量 1，所有契约检查通过 | 可控时钟、单线程 Fake；不证明真实 I/O 或实时性 |
| Modem 内存检查 | ASan／UBSan，禁止 sanitizer 恢复 | 两份程序均运行通过 | 不证明未执行路径或真实并发安全 |
| 反例敏感性 | 在参考解临时副本中注入 starter 的取消缺陷 | `recovered` 断言失败，回归能检出该缺陷 | 测试副本位于 scratch，未改动推荐解 |
| Standalone Asio | tag `asio-1-30-2` 对应 commit `12e0ce9e0500bf0f247dbd1ae894272656456079`；GCC 14.2；CMake 4.4.4 | 三个 C++20 程序严格编译；二进制分片与重连烟测均通过 | SYSTEM include 隔离依赖告警；主机 loopback，不是超时／背压／优雅关闭结果 |
| Asio 版本门禁 | 临时头文件声明 `ASIO_VERSION 103001` | CMake 配置拒绝并报告期望 103002 | 校验版本标记，不是对任意修改版源码的 hash 审计 |
| TRACE32 Host Lab | 合成 CFSR、BFAR、MMFAR | 严格编译并输出 `all decoder checks passed` | 未访问硬件，未确定真实故障根因 |
| RTOS | 8 个文件、9 个预置，使用场景自带配置 | 模拟检查 0 个 error；parser／kernel／objects／reducer 的 6 项 Node 测试通过 | 哲学家预期 deadlock；不测真实并行和中断延迟 |
| 内存轨迹 | 仓库 5 份 JSON | 导学的快照数及关键步骤按保存数据核对；修正增长倍率和局部置空说明 | 快照地址、布局和控制块示意不构成标准保证 |

## 复现入口

在仓库根目录运行：

```bash
python3 tools/check-examples.py
node tools/check-rtos-examples.ts
node --test tests/rtos-parser.test.ts tests/rtos-kernel.test.ts tests/rtos-objects.test.ts tests/rtos-reducer.test.ts
cmake -S frameworks/asio/examples -B build/asio
cmake --build build/asio -j2
python3 tools/check-asio-echo.py --bin-dir build/asio
python3 tools/check-course.py
python3 tools/check-migration.py
npm run build
npx playwright test
```

新通道的逐文件命令与预期输出见 [实验手册](engineering-learning-path.md)。原生总检查也包含设计模式示例；只运行该部分可用 `--patterns-only`。

## 整体内容与导航检查

- 55 节课程结构检查通过；未发布或覆盖 Day 56。
- 263 个迁移文件 SHA-256 校验通过，来源资料未批量改写。
- 本地原生检查覆盖 96 个独立程序和 1 个课程头文件，0 失败。该数量包括工作区原有未提交的 Day 25 两个练习；本次不将它们纳入发布，干净检出的数量会相应减少。
- 本轮 35 份新增／修改 Markdown 的 249 个本地文件链接检查无缺失；不包含外部 URL 可用性和历史设计文档的旧 `file:` 链接。
- 新内容注册到现有专题阅读器，贯穿源码作为可下载资源，浏览器验证覆盖总索引、环境矩阵、工作坊及新程序编译。

## 站点回归

`npm run build` 通过；`npx playwright test --timeout=60000` 全量 50 项通过，包括新总索引跨文档导航、源码资源下载、手机 RTOS 手册、两份通道程序在浏览器 Clang 中的输出与成功退出。既有图表、课程、搜索、内存与 RTOS 工作台回归继续通过。构建保留已有的大包体积提示，本轮没有实施分包优化。

## 本轮未验证

- OpenHarmony 完整系统构建、开发板启动、驱动和 C++ 运行时适配；[手册](../frameworks/openharmony/07-first-build-lab.md) 仍待填写目标环境与实际输出。
- Zephyr／ZPP 的特定 revision、板卡与全部 C++20 能力。
- 真实 TRACE32 探头、故障现场与板端回归。
- Windows PowerShell、SSH／SCP 与烧录；[操作清单](../utils/windows-remote-script-runner/OPERATIONS.md) 已明确当前脚本不实施自动 hash 校验。
- Asio 工作坊中新增的取消竞争、背压和有界关闭扩展；Echo 烟测不能替代它们。

后续验证时保留原记录并增加新的版本／输入／结果，不用“已验证”覆盖不同环境下的待验证项。
