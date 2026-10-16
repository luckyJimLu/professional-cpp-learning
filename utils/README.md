# Utils

面向 Professional C++ / Embedded / Systems Engineering 开发流程的实用工具与跨平台工作流。

## Modules

### Remote Development Bridge

[Remote Development Bridge](windows-remote-script-runner/README.md)

用于 **Windows 本机 + VS Code Remote-SSH + Remote Linux + OpenCode** 的统一开发桥接方案。

核心边界：

```text
Remote Linux = OpenCode / build / generate
Windows      = execute / debug / flash
SCP          = delivery boundary
LocalRoot    = download root + local terminal working directory
```

完整流程：

```text
VS Code Remote-SSH Window
│
├── Remote Linux Terminal
│   ├── OpenCode
│   ├── CMake / Ninja / GCC / Clang
│   ├── generate build-manifest.json
│   ├── generate symbols: ELF / AXF / MAP / SYM / DWARF
│   ├── generate firmware: BIN / HEX
│   └── generate Windows scripts
│
└── Local Windows Terminal
    └── sync-build.ps1 hook
        ├── SCP manifest first
        ├── SCP symbols
        ├── SCP firmware
        ├── SCP Windows scripts
        ├── verify build_id / commit / SHA-256
        └── Set-Location $LocalRoot
                ↓
        PS D:\Dev\target-runtime>
                ↓
        TRACE32 / J-Link / OpenOCD / vendor tools / USB / COM / ADB
```

### LocalRoot 约定

默认：

```text
D:\Dev\target-runtime\
├── symbols\
├── firmware\
├── scripts\
├── manifest\
└── logs\
```

`LocalRoot` 同时承担三个角色：

1. SCP 本地下载根目录；
2. Windows 调试/烧录运行时目录；
3. VS Code Local Terminal 完成同步后的当前工作目录。

因此 Hook 完成后执行：

```powershell
Set-Location $LocalRoot
```

Local Terminal 最终保持在：

```powershell
PS D:\Dev\target-runtime>
```

随后可以直接执行：

```powershell
.\scripts\debug.ps1
.\scripts\flash.ps1
.\scripts\test.ps1
```

`LocalRoot` 可按项目修改，例如：

```powershell
.\sync-build.ps1 -Mode all -LocalRoot "D:\Projects\MyBoard\runtime"
```

### 同一个 VS Code Window

Remote-SSH Window 中推荐长期保留两个 Terminal：

```text
[Remote Linux]                  [Local Windows]
dev@server:~/project$           PS D:\Dev\target-runtime>

OpenCode / build                SCP / debug / flash / test
```

Windows Local Terminal 使用 VS Code：

```text
Terminal: Create New Integrated Terminal (Local)
```

不要假设 Remote-SSH workspace 中普通 `tasks.json` 会自动在 Windows Host 执行。

### 同步原则

- manifest 必须最先同步；
- SCP 失败立即停止；
- 禁止失败后继续使用旧产物；
- symbols 与 firmware 必须对应同一 build ID / Git commit；
- 推荐根据 manifest 做 SHA-256 校验；
- SSH 密钥和密码不得进入仓库；
- Windows 默认不以 Administrator 执行；
- OpenCode 负责远程实现和生成，Windows Hook 负责同步、校验和本地执行。

### 模块文件

- [完整设计、OpenCode 实现提示词与工作流](windows-remote-script-runner/README.md)
- [Windows SCP Hook：sync-build.ps1](windows-remote-script-runner/sync-build.ps1)
- [Build Manifest 示例](windows-remote-script-runner/build-manifest.example.json)

### OpenCode 使用方式

第一次在具体项目落地时，让 OpenCode 先阅读完整设计：

```text
请按照 professional-cpp-learning 中
utils/windows-remote-script-runner/README.md
定义的 Remote Development Bridge 方案，
先检查当前项目真实构建结构、build outputs、scripts 和 VS Code 配置，
然后直接完成集成。

要求 Windows LocalRoot 同时作为：
1. SCP 下载根目录；
2. 本地 debug/flash/test 工作目录；
3. Local Terminal 同步完成后的 cwd。

sync-build.ps1 成功完成 manifest、symbols、firmware、scripts 同步和校验后，
必须执行 Set-Location $LocalRoot。

不要只给建议，完成实现并检查 diff；无法在 Linux 验证的 Windows 行为明确列为本机待验证项。
```
