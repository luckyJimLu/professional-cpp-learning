# C++ 示例编译修复

## Day 14：网页实验室缺少本地头文件

`examples/day-014/main.cpp` 包含同目录的 `config.hpp`。本地 GCC 能找到该文件，但网页实验室此前只传递 `main.cpp` 的文本，Clang/WASM 报 `config.hpp file not found`。

课程加载器现在将示例使用的本地 `.h` / `.hpp` 展开为单个翻译单元，保留 include guard，并用 `#line` 恢复诊断文件名和行号。本地源码继续使用独立头文件，不改变多文件实验的教学目标。标准库头文件仍交由编译器处理。

主程序重复包含 `config.hpp`，验证 include guard。`tools/check-examples.py` 另外单独、重复包含每日示例头文件进行语法检查，避免主程序中的间接包含掩盖头文件依赖缺失。浏览器回归测试验证 Day 14 能编译并输出 `header is self-contained`。

## 所有权示例：禁用异常的编译环境

`examples/pointer-choice.cpp` 此前使用 `throw` / `try` 拒绝空 transport，在当前禁用异常的 Clang/WASM 中无法编译。现使用返回 `std::optional<OwnedService>` 的工厂函数，空输入返回 `std::nullopt`；构造函数私有，保证成功创建的服务拥有有效 transport。专题示例同步更新，保留空输入校验、独占转移及析构计数断言。

## 验证

```bash
python3 tools/check-examples.py
python3 tools/check-examples.py --sanitize
python3 tools/check-course.py
npm run build
npx playwright test tests/browser-compiler.spec.ts
```

`examples/rtos/` 使用模拟器专用接口，由 `tools/check-rtos-examples.ts` 验证，不作为宿主机可链接程序。Boost.Asio 参考示例另需 Boost 开发头文件；Standalone Asio 模块另需 CMake 和 Asio 依赖。
