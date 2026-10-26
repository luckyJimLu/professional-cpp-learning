# 第 2 课：SOLID 与 GoF 的 Modern C++ 重构 —— Slidev 幻灯片

> 本课主线：SOLID 的变化边界 → GoF 意图 → Modern C++ 实现 → 绘图引擎重构。
> 文件路径：`slides/lesson-02.md`
> 共 43 页，覆盖 12 个 PPT 单元，每单元 2–4 页。

来源：`PPT/设计模式大纲.md` 第 2 课，12 个 PPT 单元。保留原代码与全部演讲要点；片段代码不是独立可编译程序。图示为 Slidev 原生内联 SVG，无远程渲染、无外部资源路径依赖；SVG 本身是可编辑源，适配主站与独立 Slidev。

## 页面与大纲溯源表（Traceability Matrix）

| 页码 | PPT 单元 | 页面标题 | 映射自【重点内容 / 呈现方式】的具体条目 | 备注映射自【演讲要点】 | 点击数 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | SOLID 与 GoF 的 Modern C++ 重构 | 重点内容：SOLID 五大原则；Design for Change vs YAGNI | 本单元演讲要点全文 | 0 |
| 2 | 1 | SOLID 是面向变化的架构罗盘 | 呈现方式：SOLID 架构罗盘图 | 同单元知识说明／技术边界 | 3 |
| 3 | 1 | 五大原则共同降低修改成本 | 重点内容：SOLID 五大原则在 Modern C++ 中的全景定位 | 同单元知识说明／技术边界 | 0 |
| 4 | 1 | 使用 SOLID 达成可维护性 | 重点内容：核心哲学与 Katerina Trajchevska 原话 | 同单元知识说明／技术边界 | 1 |
| 5 | 2 | SRP 聚焦变化的原因 | 重点内容：SRP 精确解读；Journal 与 Document 两个反例 | 本单元演讲要点全文 | 0 |
| 6 | 2 | 导出职责单向依赖纯净的 Document | 呈现方式：Before / After 依赖对比图 | 同单元知识说明／技术边界 | 0 |
| 7 | 2 | 正交职责捆绑产生三大恶果 | 重点内容：传递性物理耦合、实现强绑定、破坏可测试性 | 同单元知识说明／技术边界 | 3 |
| 8 | 3 | 新增过滤条件，不修改已测试的类 | 重点内容：ProductFilter 痛点与 OCP 定义 | 本单元演讲要点全文 | 1 |
| 9 | 3 | Specification 分离判定与过滤 | 呈现方式：原始 Specification 代码；重点内容：operator&& 与 SRP | 同单元知识说明／技术边界 | 1 |
| 10 | 3 | 编译期扩展同样遵守 OCP | 重点内容：Modern C++ 编译期非侵入式 OCP | 同单元知识说明／技术边界 | 0 |
| 11 | 4 | 继承必须保持行为契约 | 重点内容：LSP 定义；Square is NOT a Rectangle | 本单元演讲要点全文 | 0 |
| 12 | 4 | Square 破坏 transform 的断言 | 呈现方式：案发现场 transform(Rectangle&) 原代码 | 同单元知识说明／技术边界 | 0 |
| 13 | 4 | LSP 约束行为，也约束 Concepts | 重点内容：大纲实际列出的四项形式化法则与泛型扩展 | 同单元知识说明／技术边界 | 0 |
| 14 | 5 | 接口由客户端需要决定 | 重点内容：ISP 定义与两个 OOP 案例 | 本单元演讲要点全文 | 0 |
| 15 | 5 | 拆分胖接口，组合最小能力 | 呈现方式：OOP 接口拆分对比图 | 同单元知识说明／技术边界 | 0 |
| 16 | 5 | 算法不索取更强的模板约束 | 呈现方式：Concept 层级原代码；重点内容：STL 最小参数约束 | 同单元知识说明／技术边界 | 0 |
| 17 | 6 | Builder 消除伸缩式构造函数 | 重点内容：具名参数与 DSL；呈现方式：左栏两种 Builder | 本单元演讲要点全文 | 0 |
| 18 | 6 | Composite Builder 平滑切换子建造者 | 重点内容：Builder 三种形态与复合建造者 | 同单元知识说明／技术边界 | 0 |
| 19 | 6 | Lambda 注册创建逻辑替代工厂子类 | 呈现方式：传统 Abstract Factory 类图 vs Functional Factory | 同单元知识说明／技术边界 | 0 |
| 20 | 6 | make_unique 是实现模式 | 呈现方式：DrinkWithVolumeFactory 完整原代码；重点内容：Factory 概念正名 | 同单元知识说明／技术边界 | 0 |
| 21 | 7 | Adapter 转换接口，Decorator 叠加职责 | 重点内容：Adapter vs Decorator 本质辨析 | 本单元演讲要点全文 | 0 |
| 22 | 7 | 静态装饰以灵活性换取内联 | 呈现方式：性能对比表；重点内容：三种 Decorator 形态 | 同单元知识说明／技术边界 | 0 |
| 23 | 7 | 嵌套 Mixin 在编译期展开 | 呈现方式：Taxed / Discounted 原代码；重点内容：Concept 约束 | 同单元知识说明／技术边界 | 0 |
| 24 | 7 | PMR 融合多种设计意图 | 呈现方式：PMR 装饰链；重点内容：Decorator / Adapter / NVI | 同单元知识说明／技术边界 | 0 |
| 25 | 8 | Strategy 关注 How，Command 关注 What | 重点内容：Strategy vs Command 异同 | 本单元演讲要点全文 | 0 |
| 26 | 8 | 策略抽象也必须遵守 ISP | 呈现方式：ISP 陷阱 vs 正确隔离架构图 | 同单元知识说明／技术边界 | 0 |
| 27 | 8 | 按值接收策略，移动注入 | 呈现方式：现代值语义 Strategy 原代码 | 同单元知识说明／技术边界 | 0 |
| 28 | 8 | Policy 模板参数实现静态 Strategy | 重点内容：std::function 与 Policy-Based Design | 同单元知识说明／技术边界 | 0 |
| 29 | 9 | 类型与操作构成二维扩展困境 | 呈现方式：二维扩展困境矩阵；重点内容：表达式问题 | 本单元演讲要点全文 | 0 |
| 30 | 9 | 双重分发锁死类型集合 | 呈现方式：循环依赖死结图；重点内容：Double Dispatch | 同单元知识说明／技术边界 | 0 |
| 31 | 9 | 经典 Visitor 的设计代价 | 重点内容：大纲实际列出的五项 Visitor 阵痛 | 同单元知识说明／技术边界 | 5 |
| 32 | 9 | Acyclic Visitor 付出近九倍耗时 | 呈现方式：Acyclic Visitor 性能警告框与精确实测数字 | 同单元知识说明／技术边界 | 0 |
| 33 | 10 | variant 让图形回归独立值类型 | 重点内容：类型安全联合体；非侵入式架构 | 本单元演讲要点全文 | 0 |
| 34 | 10 | overloaded 在调用处组合 Lambda | 呈现方式：std::variant + std::visit + overloaded 完整原代码 | 同单元知识说明／技术边界 | 0 |
| 35 | 10 | 重载访问者支持多重分发 | 重点内容：模式匹配与多重分发 | 同单元知识说明／技术边界 | 4 |
| 36 | 10 | 连续值存储改善访问性能 | 呈现方式：完整五项 Benchmark 性能表 | 同单元知识说明／技术边界 | 0 |
| 37 | 11 | Meyers’ Singleton 只解决唯一实例 | 重点内容：标准实现细节与实现模式正名 | 本单元演讲要点全文 | 4 |
| 38 | 11 | 硬编码单例隐藏依赖 | 重点内容：Singleton 三大原罪 | 同单元知识说明／技术边界 | 0 |
| 39 | 11 | 让具体数据库依赖高层抽象 | 呈现方式：Widget → Concrete Database vs PersistenceInterface 架构反转 | 同单元知识说明／技术边界 | 0 |
| 40 | 11 | 注入接口恢复可测试性 | 呈现方式：全局可替换策略抽象与显式注入完整原代码 | 同单元知识说明／技术边界 | 0 |
| 41 | 12 | Modern C++ 保留意图，替换实现 | 重点内容与呈现方式：全景对比大表 | 本单元演讲要点全文 | 0 |
| 42 | 12 | 重构图形与操作，注入日志策略 | 重点内容：课后实战任务 1/2；呈现方式：作业前后架构拓扑图 | 同单元知识说明／技术边界 | 0 |
| 43 | 12 | 实践交付：无图形硬件的单元测试 | 重点内容：课后实战作业；下一课课程标题 | 同单元知识说明／技术边界 | 3 |

## 术语表

| 中文 | English | 首次出现页 |
| :--- | :--- | :--- |
| 可维护性 | Maintainability | 1 |
| 单一职责 | Single Responsibility Principle | 2 |
| 开闭原则 | Open–Closed Principle | 2 |
| 里氏替换 | Liskov Substitution Principle | 2 |
| 接口隔离 | Interface Segregation Principle | 2 |
| 依赖倒置 | Dependency Inversion Principle | 2 |
| 建造者 | Builder | 17 |
| 工厂 | Factory | 19 |
| 装饰者 | Decorator | 21 |
| 策略 | Strategy | 25 |
| 命令 | Command | 25 |
| 双重分发 | Double Dispatch | 30 |
| 和类型 | Sum Type | 33 |
| 依赖注入 | Dependency Injection | 39 |

## 大纲歧义与技术边界

- PPT 4 写“五大法则”但只有四个编号；PPT 9 写“六大阵痛”但只有五个编号。本课覆盖所有实际列出的条目，不编造缺失项。
- PPT 11 原代码注释称“构造函数注入”，实际为方法参数注入；保留原代码，并在讲师备注澄清。构造注入示例 `ConfigurableRecordFinder(Database& db)` 也保留在对应备注。
- 原始 Specification 组合片段省略具体实现；若组合保存子规范引用，要防止临时子规范销毁后的悬空引用。备注明确边界，不把示意片段误当可独立编译源码。
- Benchmark 数字按大纲引用，未在本仓库重新测量，不能外推到所有平台。0.078x / 12.8 倍只指静态 Decorator 案例；Visitor 五项数据逐一保留。
- `std::variant` 的封闭类型集合与大备选类型空间代价、`std::visit` 返回类型一致性、Magic Statics 仅保证初始化线程安全等限制写入讲师备注。
- 未找到本地 PlantUML 后端。使用可编辑原生 SVG 兑现所有依赖／类关系图，不上传源码，不把 SVG 声称为 PlantUML 渲染产物。

## 字体与运行

中文正文／标题：本地 `Noto Sans CJK SC`；代码：本地 `Noto Sans Mono CJK SC`。禁止远程字体请求，延续共享主题的 Regular / Bold 层级。

```bash
npm run ppt:check:strict
npm --prefix slides run dev:02
npm --prefix slides run build:02
npm --prefix slides run export:02
```

## 校验结果与待确认项

- `npm run ppt:check:strict`：第 1、2 课均通过，0 error / 0 warning；11 项技能与内容保真回归测试通过。
- `npm run ppt:build`：第 1、2 课独立 Slidev 站点构建通过。
- `npm run build`：主站 TypeScript 检查与 Vite 生产构建通过，第 2 课由已有 glob 自动发现。
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/slides-lesson02.spec.ts tests/slides-fullscreen.spec.ts tests/slides.spec.ts --timeout=30000`：8 项通过，覆盖选课、原文备注隔离、大纲定位、URL 刷新、SVG、横竖屏全屏及课程 1 回归。
- Chromium 对 43 页逐页检查：主内容无页面边界溢出、代码无横向裁切、SVG 标签未出界且字号未被主题覆盖；未发现页面运行时错误。人工检查封面、罗盘、代码对照、全部依赖图与 Benchmark 表格截图。
- PDF：通过 Slidev CLI 与本机 Chromium 导出，`pdfinfo` 确认 43 页、16:9。中文与代码字体均通过本机元数据检查；未下载或分发字体。
- 导出工具的可选 FloatingVue / Twoslash 提示出现兼容性日志；未阻止导出，静态构建浏览器无对应运行时错误，已核对 PDF 内容。未修改第三方依赖。
- 待确认项：原大纲两个条目计数与“构造函数注入”注释的歧义已在上文记录；没有缺失的教学字段阻塞本次交付，不擅自补造或改写原大纲。
