# 静态资源目录 (public)

`public` 目录包含应用运行时所需的静态文件、WebAssembly 编译器组件、内存演练 Trace JSON 数据以及 GitHub Pages 路由配置。

## 目录用途

存放由 Vite 直接复制到打包输出目录（如 `dist/`）的静态资源，为浏览器端 C++ 编译运行与内存可视化演示提供支持。

## 目录结构

```text
public/
├── .nojekyll                          # 禁用 GitHub Pages 的 Jekyll 构建过程
├── 404.html                           # GitHub Pages 单页应用（SPA）路由回退页面
├── clang/                             # Clang WASM 编译运行时资源
│   ├── asset-receipts.json            # 资源安装收据与版本校验记录
│   ├── runtime-manifest.v1.json       # WASM 运行时组件清单
│   ├── bin/                           # WASM 二进制文件（clang、lld、memfs、sysroot）
│   └── objective-c/                   # 辅助头文件与库
└── traces/                            # 内存可视化数据帧 JSON
    ├── dangling-pointer.json          # 野指针与悬挂指针演练 Trace
    ├── linked-list-reverse.json       # 链表反转演练 Trace
    ├── smart-ptr-shared.json          # std::shared_ptr 演练 Trace
    ├── smart-ptr-unique.json          # std::unique_ptr 演练 Trace
    └── vector-grow.json               # std::vector 扩容机制演练 Trace
```

## 关键模块表

| 资源路径 | 主要功能 |
| --- | --- |
| [.nojekyll](.nojekyll) | 防止 GitHub Pages 忽略以下划线开头的目录与文件 |
| [404.html](404.html) | 重定向路由请求至主入口，保证 SPA 在 GitHub Pages 刷新正常 |
| [clang/runtime-manifest.v1.json](clang/runtime-manifest.v1.json) | 声明在浏览器端运行的 Clang WASM 模块与依赖入口 |
| [clang/bin/clang.wasm.gz](clang/bin/clang.wasm.gz) | WebAssembly 版 Clang 编译器二进制文件 |
| [traces/dangling-pointer.json](traces/dangling-pointer.json) | 堆栈内存分配、销毁与悬挂指针状态的数据步进帧 |
| [traces/smart-ptr-unique.json](traces/smart-ptr-unique.json) | unique_ptr 所有权转移与生命周期步进数据帧 |

## 与仓库其他部分的关系

- **前端编译器调配**：[../src/lib/browserCompiler.ts](../src/lib/browserCompiler.ts) 会读取 `clang/runtime-manifest.v1.json` 并动态加载 `clang/bin/` 中的 WASM 文件。
- **内存可视化引擎**：[../src/visualizer/presetTraces.ts](../src/visualizer/presetTraces.ts) 加载 `traces/` 目录下的 JSON 步进帧数据，用于 [../src/visualizer/VisualizerWorkbench.tsx](../src/visualizer/VisualizerWorkbench.tsx) 绘图呈现。
- **自动化准备脚本**：运行 `npm run prepare:clang` 时，会自动将底层库的 WASM 资源准备并同步至 `clang/` 目录。

## 相关命令

相关 npm 脚本定义在 [package.json](../package.json) 中：

```bash
# 拷贝准备 Clang WASM 运行时资产到 public/clang
npm run prepare:clang

# 启动开发服务器（包含 predev 自动执行 prepare:clang）
npm run dev

# 构建生产产物（包含 prebuild 自动执行 prepare:clang）
npm run build
```
