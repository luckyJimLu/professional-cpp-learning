# 实验环境、版本与能力矩阵

返回 [内容总索引](content-map.md)。先确认在哪里运行，再复制命令。以下是内容基线，不是对所有平台的支持承诺。

## 环境矩阵

| 内容 | 语言／依赖基线 | 执行位置与命令 | 能力边界 |
| --- | --- | --- | --- |
| 每日主 Lab 与顶层贯穿实验 | C++23；GCC／Clang，严格 warnings | 仓库根目录：`python3 tools/check-examples.py` | 独立程序；不能把多个 `main()` 链接到一起 |
| 设计模式书籍示例 | C++17；部分使用宿主机线程与异常 | `python3 tools/check-examples.py --patterns-only` | 与禁异常、禁堆或硬实时目标有不同约束 |
| 浏览器 Lab | `@live-codes/clang-wasm` 0.2.0，C++23 | 站点 Lab；主机 `npm run build` 后执行浏览器测试 | 当前异常不可用；不能据此保证原生线程、网络或设备支持 |
| Standalone Asio Echo | Asio **1.30.2**，C++20，CMake ≥3.20，Threads | `cmake -S frameworks/asio/examples -B build/asio`；`cmake --build build/asio` | 原生网络及协程实验，保留异常；不在浏览器 Lab 运行 |
| Boost.Asio 迁移示例 | Boost **1.83.0**，C++20 | `npm run check:reference-cpp`；依赖见 [迁移说明](content-migration.md) | `boost::asio` 与 `asio` 的命名、版本和扩展 API 不能直接混用 |
| RTOS 模拟器 | 仓库受限 C++ 子集；声明头 `include/rtos_sim.h` | Node.js 24：`node tools/check-rtos-examples.ts`；网页 `rtos.html` | 确定性解释执行；头文件没有提供可原生链接的 RTOS 实现 |
| 内存预置轨迹 | 仓库 JSON 快照；实际运行事件另行标注 | 站点内存可视化；`npx playwright test tests/visualizer.spec.ts` | 地址、引用计数、容量变化用于特定案例，不是 ABI 或通用增长策略 |
| OpenHarmony 资料 | `OpenHarmony-v5.0.0-Release` 来源基线 | 按 [首次构建手册](../frameworks/openharmony/07-first-build-lab.md) 固定板卡和 manifest | 现有来源核对不等于已构建完整系统；C++11 支持依目标工具链和库实测 |
| Zephyr／ZPP 扩展 | 文章讨论 C++20；具体 Zephyr／ZPP revision 待实验锁定 | [兼容性文章](zephyr-cpp20-zpp.md) 的构建与任务清单 | 不声明任意板卡支持全部 C++20 标准库；不能等同于 OpenHarmony 运行时 |
| TRACE32 Host Lab | C++20；标准库 | `g++ -std=c++20 -Wall -Wextra -Wpedantic -Werror frameworks/trace32/fault-decode.cpp -o /tmp/fault-decode`，随后运行 | 只解码合成快照，不访问真实寄存器 |
| TRACE32 板端／Windows 桥接 | 安装版工具、目标配置、PowerShell、OpenSSH | 对应模块操作手册 | 未经目标环境运行的脚本保持模板状态 |

## 实验开始前的环境卡

在实验记录中填写以下正文，不增加前端必须解析的新字段：

```text
源码 commit：
主机 OS / CPU：
编译器及标准库版本：
语言标准 / 异常 / RTTI / 线程：
第三方依赖版本与获取方式：
目标设备 / 固件 / 配置（主机实验写不适用）：
运行目录与完整命令：
输入、预期输出及成功退出码：
实际结果与证据路径：
未验证能力：
```

`std::thread`、`std::chrono` 或某头文件能编译，不足以证明目标运行时完整支持相关语义。内存分配失败、线程栈、时钟源、取消和析构顺序都应单独核对。

## 统一运行规则

- 使用临时输出目录，不覆盖固件或已有实验数据。默认不使用 `-DNDEBUG`，这些程序的行为检查依赖断言。
- 原生独立示例使用 `-Wall -Wextra -Wconversion -Wpedantic -Werror`；定制标准必须与所检查模块一致。
- `--sanitize` 增加 ASan／UBSan；工具不支持时记录未验证原因，不能将未运行写为通过。
- 超时不应通过无限重试掩盖。编译与运行检查分别有边界；网络烟测须有进程清理及连接／读取超时。
- 故障教学优先采用显式错误返回、合成快照和预置轨迹，不为演示去执行 use-after-free 等未定义行为。

## 版本差异怎么处理

Standalone Asio 示例以 `asio-1-30-2` 为基线；其构建入口检查实际头文件版本。旧文章曾使用未复核的 1.38.2 标记，不能据此认为全部描述已在该版本核对。取消适配器等扩展 API 必须依据所选版本声明判断；基线教程优先使用 `steady_timer` 和显式取消流程。

源码内部 `detail` 类型是阅读定位信息，不是稳定应用 API。迁移到新版本时先核对类型与调用链，再更新结论和记录，不仅替换文首版本号。
