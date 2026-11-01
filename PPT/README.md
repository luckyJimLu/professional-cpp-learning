# 课程大纲与 Slidev PPT 蓝图（PPT Outline）

本目录包含 Modern C++ 软件设计与架构精品课程的单一源头大纲源文件 [设计模式大纲.md](设计模式大纲.md)。

## 单一大纲源头

[设计模式大纲.md](设计模式大纲.md) 是生成交互式课件（`slides/lesson-0X.md`）的唯一权威大纲。大纲融合了 *C++ Software Design* (Klaus Iglberger)、*Hands-On Design Patterns with C++* (Fedor G. Pikus) 与 *Design Patterns in Modern C++* (Dmitri Nesteruk) 三大著作的核心思想。

## 单元结构与课程映射

大纲共划分为 3 门核心课程，包含 34 个标准的 PPT 单元：

* **第 1 课：C++ 语言机制、内存所有权与 RAII 资源管理**（PPT 1 ~ PPT 10）
  重点涵盖三层金字塔模型、内存所有权模型、RAII、移动语义、Smart Pointers、Pimpl 与资源管理。
* **第 2 课：SOLID 设计原则与 GoF 设计模式在 Modern C++ 中的重构**（PPT 11 ~ PPT 22）
  映射至 [slides/lesson-02.md](../slides/lesson-02.md)，涵盖 SOLID 五大原则、Prototype、Factory、Singleton、Adapter、Observer、Visitor 等模式的现代重构。
* **第 3 课：架构解耦与值语义多态：现代 C++ 高级设计模式与实践**（PPT 23 ~ PPT 34）
  映射至 [slides/lesson-03.md](../slides/lesson-03.md)，涵盖物理依赖解耦、DIP、External Polymorphism、Type Erasure、SBO 与 Concepts。

## 课件生成与校验机制

课件由 [slidev-ppt 技能](../.opencode/skills/slidev-ppt) 自动读取 [设计模式大纲.md](设计模式大纲.md) 生成，确保课件页面与大纲单元一一对应，并保持 Slidev Dark Blueprint 视觉风格。

仓库提供了自动校验工具 [tools/check-slides.py](../tools/check-slides.py)，用于检测课件与大纲间的三栏结构映射、单元完整性及溯源约束。

### 常用校验命令

在仓库根目录下执行：

```bash
# 校验 slides 目录下的课件是否符合大纲映射规则
npm run ppt:check

# 严格模式校验（将警告提升为错误）
npm run ppt:check:strict
```

生成与构建课件的具体操作命令说明请参阅 [slides/README.md](../slides/README.md)。
