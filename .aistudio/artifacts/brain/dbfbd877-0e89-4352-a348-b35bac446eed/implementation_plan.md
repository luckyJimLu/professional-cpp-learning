# GitHub Pages 纯前端 C++ 内存拓扑与执行轨迹可视化架构方案

为 GitHub Pages 静态站点打造零后端成本、首屏毫秒级加载、支持全交互单步调试与自由拖拽缩放的 C++ 内存状态拓扑可视化引擎。

## User Review & Critical Decisions

> [!IMPORTANT] 
> 已根据您在澄清环节确认的偏好锁定核心选型与产品路线：

- **已确认架构选型**：采用 **2D 内存拓扑与指针图方案（React + XYFlow + ELKjs + Shiki/CodeMirror）**。彻底解决 3D 渲染在移动端和高分屏下“内存十六进制地址透视变形看不清”与“三维指针空间穿模”两大痛点，Gzip 打包体积仅 ~120KB，首屏秒开。
- **已确认数据源供给模式**：**预置 C++ 经典案例剧本库 + 本地自定义 JSON 导入 + URL 参数动态加载**。构建期与日常写作中仅需提交极简静态 JSON 文件（1~3KB/个），运行期 0 Token 消耗、0 服务器成本。
- **已确认交互主轴**：**VCR 播放器时间轴 + 单步调试（Step Forward / Backward）+ 内存变量与生命周期警报**。支持自由前进、后退、时间轴拖拽与倍速播放。

---

## 1. Overview & Core Concept

### What It Does
一款专为技术博客、文档站点（GitHub Pages, VitePress, Hugo, Hexo）设计的纯静态嵌入式 C++ 内存可视化调试器。读者无需在本地配置 C++ 编译环境或等待云端服务器响应，即可像在 IDE 调试器中打断点一样单步观察：
- **函数调用栈帧（Call Stack）** 的压栈与出栈
- **局部变量、原生指针（Raw Pointers）与现代智能指针（`unique_ptr` / `shared_ptr`）** 的生命周期
- **堆内存分配与释放（`new` / `delete` / `malloc` / `free`）** 的状态流转
- **指针连线拓扑（Pointer Edges）** 与深浅拷贝转移
- **内存安全问题即时告警**：野指针（Dangling Pointer）、内存泄漏（Memory Leak）、空指针解引用

### Target Audience & Persona
- **C++ 进阶学习者与系统工程师**：直观理解现代 C++ 移动语义、RAII、析构顺序与虚表/复杂数据结构。
- **技术博主与技术教程作者**：在 Markdown 文章中以 `<iframe src="https://user.github.io/cpp-viz/?trace=smart-ptr&embed=true" />` 一键内嵌高互动图解。

### Key Value
- **0 运维成本 & 0 运行期 Token 消耗**：纯前端静态分发，无 Node.js/Python 容器或云函数负担。
- **无依赖高稳定性**：不受第三方 WASM 在线 manifest 或云端网络抖动阻断。
- **极佳的阅读器体验**：移动端触控优化、桌面端全屏拖拽缩放、文字与连线清晰锐利。

---

## 2. User Experience & Visual Design

### Key User Flows

1. **进入站点 / 嵌入式体验**：
   - 用户打开独立页面或文章内嵌卡片，首屏 150ms 内瞬间呈现 C++ 代码与对应的第 0 步初始内存状态。
   - 顶部快捷选择预置案例：*“链表反转”*、*“`std::unique_ptr` 移动语义”*、*“`std::vector` 动态扩容”*、*“RAII 栈展开与悬挂指针检测”*。
2. **单步调试与观察**：
   - 读者点击 **`下一步 (Step Next)`** 或按键盘 `→` 键，左侧代码编辑器的高亮行平滑滑落至下一条执行语句。
   - 右侧 XYFlow 画布中，新分配的堆块由 ELKjs 在 5ms 内算出优雅坐标并平滑渐显，指针连线以平滑贝塞尔曲线自动吸附至对应结构体字段。
3. **时光倒流（Step Backward）**：
   - 读者随时可以后退到任意前置步骤，内存状态精准恢复，方便对照理解“对象何时被析构”。
4. **自定义导入与导出**：
   - 点击“导入 JSON”按钮，可将 AI 或平时调试生成的 `.json` 轨迹拖拽上传即刻查看；亦可一键复制当前剧本为 JSON 格式。

### Visual Identity & Theme
遵循 Universal Frontend Design Constitution（60-30-10 配色原则与反 AI-Slop 设计规范）：
- **深色工匠主题（Engineering Dark Slate）**：
  - **60% 基础底色**：`#0b0f17`（深冷太空灰底色，极度护眼且突出代码对比度）。
  - **30% 结构面板**：`#121824`（栈帧面板、堆内存块卡片、顶部控制栏、代码编辑器背景），搭配 `1px solid rgba(255, 255, 255, 0.08)` 细线分割。
  - **10% 语义强调高光**：
    - 活跃指针 / 正常分配：天青蓝 `#38bdf8` 与翡翠绿 `#10b981`
    - 智能指针所有权转移：紫罗兰 `#a855f7`
    - 悬挂指针 / 内存泄漏告警：珊瑚红 `#ef4444`
    - 语法与行号高亮：琥珀金 `#f59e0b`
- **字体规范**：
  - 代码与地址：`JetBrains Mono` / `ui-monospace`，数字严格采用 `tabular-nums` 对齐。
  - 界面排版：`Plus Jakarta Sans`，干净利落无衬线，字号层级严谨（14px 正文、12px 辅助元数据）。
  - 拒绝无意义装饰药丸徽章（No-Pill Rule），元数据采用 `·` 或 `/` 典雅文本分隔。

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: 核心拓扑引擎采用 XYFlow + ELKjs，而非 React Three Fiber (3D)
- **选择方案**：`@xyflow/react` + `elkjs` 纯前端渲染。
- **为什么**：
  - **可读性是第一优先级**：C++ 教学的核心是内存地址（`0x7fff5fbff8c0`）、字段类型（`int* next`）与指针箭头的精确指向。2D SVG/HTML 节点拥有像素级的文字锐利度，绝无 3D 摄像机旋转带来的透视失真和 z-fighting 穿模。
  - **加载性能极佳**：纯前端 DOM/SVG 渲染，无 WebGL 编译初始化开销，打包体积仅 3D 方案的三分之一，千元机或弱网移动端秒级响应。
- **权衡与备选**：3D 虽然具有空间纵深视觉噱头，但对于结构体、链表、智能指针而言，交互成本极高且极易遮挡。

### Decision 2: 纯静态 JSON 离线化底座 + 运行时状态回放机
- **选择方案**：状态回放机模式（State Replay Engine）。
- **为什么**：
  - 纯静态 GitHub Pages 无法运行 C++ 编译器后台；而纯浏览器端 WASM 运行时受制于网络 manifest、内存限制与多线程安全策略，在读者设备上存在失败概率。
  - 将 C++ 执行过程抽象为极简、规范的 JSON 轨迹（含行号、代码、堆栈变量、指针指向与描述）。既可以由作者写作时让大模型/离线脚本生成一次，也可由读者本地导入，彻底实现 0 错误率、0 外部网络请求。
- **兼顾动态能力**：保留本地客户端轻量代码解释模拟器（针对标准指针、`new`/`delete` 代码模式），在未提供预制 JSON 时亦可自动生成模拟轨迹。

### Decision 3: 双模式自适应响应式布局
- **桌面端（$\ge 1024\text{px}$）**：50/50 经典分屏，左侧代码、右侧拓扑画布与状态侦听，支持拖拽调整分屏宽度。
- **移动端（$< 1024\text{px}$）**：自适应单列流式切换，顶部提供简洁的 Segmented Control（`代码` | `拓扑` | `控制台`），底部常驻贴底单步控制条（高度控制在屏幕 8% 以内），单手即可轻松单步调试。

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App / Embed Route (?trace=...)                  │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  Top Header: Wordmark (OpenCode Pro) · Preset Trace Dropdown       │ │
│ │  · Import JSON Modal · GitHub Pages Deploy Docs Link               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  VCR Stepper Bar: [|<<] [<< Prev] [Play/Pause] [Next >>] [>>|]     │ │
│ │  Progress Bar (Step 3/8) · Speed (1x) · Warning Banners (Leaks)    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────┬─────────────────────────────────┐ │
│ │ Left: Code View (Shiki / CM)     │ Right: Topology Stage (XYFlow)  │ │
│ │                                  │                                 │ │
│ │  1: struct Node {                │  ┌─ Call Stack (main) ────────┐ │ │
│ │  2:   int val;                   │  │ head: 0x1000 ──┐           │ │ │
│ │  3:   Node* next;                │  └────────────────┼───────────┘ │ │
│ │  4: };                           │                   ▼             │ │
│ │  5: int main() {                 │  ┌─ Heap #1 (0x1000) ───────┐ │ │
│ │ >6:   Node* head = new Node{1};  │  │ val: 1                   │ │ │
│ │  7:   head->next = new Node{2};  │  │ next: nullptr            │ │ │
│ │  8: }                            │  └──────────────────────────┘ │ │
│ │                                  │                                 │ │
│ │ [Current Step Explain / Stdout]  │ [ELKjs Auto-Layout / Controls]  │ │
│ └──────────────────────────────────┴─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

```typescript
// 纯静态 Trace 格式标准（public/traces/*.json）
export interface StaticTraceFile {
  title: string;
  category: "basics" | "smart_pointers" | "data_structures" | "memory_safety";
  description: string;
  sourceCode: string;
  steps: Array<{
    stepIndex: number;
    line: number;
    title: string;
    explanation: string;
    stdout?: string;
    warning?: string; // 如 "检测到内存泄漏：堆块 0x2000 未被 delete"
    callStack: Array<{
      frameName: string;
      variables: Array<{
        name: string;
        type: string;
        value: string;
        address: string;
        pointsTo?: string | null; // 指向的堆地址，如 "0x1000"
        isSmartPtr?: boolean;
      }>;
    }>;
    heap: Array<{
      address: string;
      label: string;
      type: string;
      fields: Record<string, string>;
      status: "allocated" | "freed" | "leaked";
    }>;
  }>;
}
```

### Planned Preset Traces (内置高质量教学剧本)
1. `smart-pointer-unique.json`: `std::unique_ptr` 独占所有权与 `std::move` 指针置空。
2. `smart-pointer-shared.json`: `std::shared_ptr` 引用计数增减与循环引用危险。
3. `linked-list-reverse.json`: 单链表反转过程中三个指针（`prev`, `curr`, `next`）的精妙交替。
4. `vector-grow.json`: `std::vector` 动态扩容、申请新堆块、旧数据搬迁并释放旧内存。
5. `dangling-pointer.json`: 提前 `delete p;` 导致悬挂指针，随后非法解引用的红线高亮警告。

### Implementation Steps & Milestones

1. **安装并集成核心库**：
   - 引入 `@xyflow/react` 与轻量自动化拓扑依赖 `elkjs`（或内置轻量分层布局算法）。
2. **构建静态轨迹资源与加载器（Trace Loader Engine）**：
   - 在 `public/traces/` 构建 5 套经典 C++ 场景的高质量 JSON 轨迹。
   - 实现 JSON 格式校验器、拖拽/文件上传解析器、URL `?trace=xxx` 自动探测。
3. **实现 XYFlow 自定义节点与动态贝塞尔连接边**：
   - `<StackFrameNode>`：清晰展示函数名、局部变量、原生/智能指针锚点。
   - `<HeapBlockNode>`：展示堆地址、类型、结构体内部字段、alive/freed 视觉状态。
   - `<AnimatedPointerEdge>`：带有流光箭头与悬挂指针检测样式的动态边。
4. **接入 ELKjs 智能自动拓扑计算**：
   - 每次步进变化时，自动计算栈在左/上、堆在右/下的整洁层次，支持全屏缩放（Pan/Zoom/FitView）。
5. **打磨 VCR 时间轴控制器与嵌入式支持**：
   - 支持键盘左右方向键单步调试、播放/暂停、进度拖动。
   - 优化 `?embed=true` 无边框沉浸模式，确保在各类静态博客 iframe 中无缝适配。
6. **全链路验证与编译**：
   - 运行 `compile_applet` 确保 TypeScript 类型与 Vite 构建零报错，达到 GitHub Pages 纯静态开箱即用状态。
