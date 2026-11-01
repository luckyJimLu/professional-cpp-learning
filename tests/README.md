# Tests 测试套件目录

`tests` 目录包含项目的所有端到端（E2E）测试与单元测试文件，覆盖 Web 学习控制台 UI 功能、小册子检索、Slidev 课件渲染以及 RTOS 模拟器核心逻辑。

## 目录用途

- 验证网页控制台 UI、导航、代码搜索、Markdown 渲染及交互组件功能。
- 自动化测试 RTOS 模拟器内核调度、解析器、归约器与快照生成流程。
- 确保小册子条目定位、关键字检索与 C/C++ 语法高亮无回归缺陷。

## 内容结构

本目录采用明确的文件后缀命名约定区分测试类型：

```text
tests/
├── *.spec.ts            # Playwright 端到端（E2E）测试套件
│   ├── booklets.spec.ts # 小册子导航、搜索与 URL 历史测试
│   ├── search.spec.ts   # 核心代码与课程全站搜索测试
│   ├── slides.spec.ts   # Slidev 课件交互与全屏测试
│   └── visualizer.spec.ts # 可视化工具与 RTOS 视图测试
└── *.test.ts            # RTOS 模拟器与 Web 模块单元测试
    ├── rtos-kernel.test.ts   # RTOS 调度与线程生命周期单元测试
    ├── rtos-objects.test.ts  # 信号量、互斥锁与消息队列单元测试
    ├── rtos-parser.test.ts   # C++ 子集 AST 解析器单元测试
    ├── rtos-reducer.test.ts  # 状态快照归约器单元测试
    └── trace-session.test.ts # 跟踪会话与数据导出单元测试
```

## 使用方式（相关命令）

在仓库根目录下，根据测试类型使用对应命令执行测试：

### 1. 运行 Playwright E2E 测试套件 (*.spec.ts)

Playwright 会自动启动本地 Preview 服务器（端口 4173）并运行测试：

```bash
# 执行全部 E2E 测试
npm run test:e2e

# 运行指定的 E2E 测试文件
npx playwright test tests/booklets.spec.ts

# 调试模式运行 E2E 测试
npx playwright test tests/search.spec.ts --debug
```

### 2. 运行单元测试套件 (*.test.ts)

单元测试采用 Bun / Node 原生测试框架运行：

```bash
# 使用 Bun 执行全部单元测试
bun test tests/*.test.ts

# 运行单个单元测试文件
bun test tests/rtos-kernel.test.ts
```

## 维护约定

1. **后缀分隔**：E2E 浏览器交互测试必须命名为 `*.spec.ts`；纯逻辑与算法单元测试必须命名为 `*.test.ts`。
2. **测试隔离**：单元测试不得依赖真实网络与 DOM 环境；E2E 测试需配置统一的页面尺寸与基准 URL（[playwright.config.ts](../playwright.config.ts)）。
3. **断言规范**：E2E 测试推荐使用 Playwright `expect(page...)` 异步断言；单元测试统一使用 `node:assert/strict`。
4. **提交前验证**：新增 UI 功能或修改 RTOS 模拟器逻辑后，须确保对应的测试套件执行无失败。
