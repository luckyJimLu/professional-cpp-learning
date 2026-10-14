# Mermaid 图表学习与编写

课程里的图表用于解释控制流、所有权和异步时序。GitHub 可直接显示 Mermaid 代码块，Learning Console 的课程阅读器和“专题”使用相同渲染方式。

## 阅读与操作

- 图表宽于阅读栏时，可以聚焦图表并横向滚动。
- 点击“查看 Mermaid 源码”对照节点、边和代码行为。
- 语法错误或加载失败时保留源码；修复语法后重新构建，加载失败可点击“重试绘制”或刷新页面。
- 普通 C++、Shell 和文本代码块仍按代码显示。

## 流程图：借用还是拥有

把下面内容放在标记为 `mermaid` 的代码块中即可渲染。节点名使用短英文标识符，中文标签放在引号内。

```mermaid
flowchart TD
    A["对象是否负责销毁资源？"] --> B{"负责？"}
    B -->|否| C{"允许没有对象？"}
    C -->|否| D["使用引用，记录借用生命周期"]
    C -->|是| E["使用可空指针，检查 nullptr"]
    B -->|是| F{"多个拥有者确有必要？"}
    F -->|否| G["优先值语义或 unique_ptr"]
    F -->|是| H["评估 shared_ptr，避免强引用环"]
```

引用和裸指针不会自动延长被借用对象的生命周期。共享所有权也不提供线程安全的数据访问。

## 状态图：连接状态

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Connecting: Start
    Connecting --> Ready: Connected
    Connecting --> Idle: Timeout
    Ready --> Idle: Disconnect
```

图里没有的事件不一定可忽略，代码应定义其拒绝或处理行为。可对照 Day 27 的状态迁移实验。

## 时序图：异步资源生命周期

```mermaid
sequenceDiagram
    participant Caller as 调用者
    participant Session as 会话
    participant EventLoop as 事件循环
    Caller->>Session: 启动异步读取
    Session->>EventLoop: 注册操作与完成处理器
    Note over Session,EventLoop: 缓冲区必须活到操作完成
    EventLoop-->>Session: 完成或取消回调
    Session-->>Caller: 通知结果
```

取消请求不等于回调已经结束。释放缓冲区之前仍需确认操作的完成契约。

## PlantUML 架构与时序图

除 Mermaid 之外，文档系统还支持 PlantUML 流程图与时序图，使用 ```` ```plantuml ````（或 ```` ```puml ````、包含 `@startuml`）代码块编写：

```plantuml
@startuml
skinparam shadowing false
hide stereotype

participant "应用线程" as App
participant "RingBuffer" as RB
participant "后台写盘线程" as Disk

App -> RB: try_push(log_entry)
activate RB
RB --> App: success
deactivate RB
RB -> Disk: notify_data_ready()
activate Disk
Disk -> RB: pop_batch()
Disk -> Disk: write_to_file()
deactivate Disk
@enduml
```

在阅读器中，PlantUML 会自动渲染为矢量图，支持横向滚动、在“流程图”与“源码”之间切换、一键复制代码及打开外部 SVG。

## 编写检查

1. 一张图只解释一个决策、状态机或调用关系，避免把整个章节塞进单图。
2. 分支条件和代码一致，说明失败、超时与取消的去向。
3. 有效示例与故意错误示例分开：错误语法放在 `text` 代码块内，避免破坏阅读。
4. 不在图内嵌入 HTML、点击执行脚本或依赖外部图片；阅读器使用 strict 安全模式。
5. 修改图表后运行 `npm run test:e2e`；其中的图表检查会验证仓库所有 Mermaid 代码块的语法。

## 继续学习

- [所有权与智能指针](../patterns/ownership-and-smart-pointers.md)
- [Asio 异步架构](../frameworks/asio/ARCHITECTURE.md)
- [会话生命周期](../frameworks/asio/SESSION_LIFECYCLE.md)
