# Remote Development Bridge

用于 **Windows 本机 + VS Code Remote-SSH + Linux 开发环境** 的跨主机脚本与构建产物同步。

核心原则：**Linux 负责开发/编译/生成，Windows 负责本地执行/调试，SCP 作为清晰的单向交付边界。**

## 适用场景

- VS Code Remote-SSH 打开远程 Linux 工程。
- Codex / OpenCode / CMake / Ninja / GCC/Clang 在 Linux 上运行。
- Windows 本机需要执行 PowerShell、烧录工具、TRACE32、J-Link、OpenOCD、ADB/Fastboot、串口/USB/驱动工具。
- 需要把 Linux 生成的脚本、符号表、固件和调试产物同步到 Windows。
- 不希望用 SSHFS 映射整个远程工程。

## 推荐结构

### Remote Linux

```text
~/project/
├── src/
├── build/
│   ├── app.elf
│   ├── app.map
│   ├── app.bin
│   ├── app.hex
│   └── build-manifest.json
└── scripts/
    └── windows/
        ├── flash.ps1
        ├── debug.ps1
        └── test.ps1
```

### Windows Local Runtime

```text
D:\Dev\target-runtime\
├── symbols/
│   ├── app.elf
│   └── app.map
├── firmware/
│   ├── app.bin
│   └── app.hex
├── scripts/
│   ├── flash.ps1
│   ├── debug.ps1
│   └── test.ps1
├── manifest/
│   └── build-manifest.json
└── logs/
```

## SCP Hook

本模块提供：

- `sync-build.ps1`：Windows 本地 Hook Runner。
- `build-manifest.example.json`：构建产物版本绑定示例。

复制 `sync-build.ps1` 到 Windows 本地后执行：

```powershell
.\sync-build.ps1 -Mode all
.\sync-build.ps1 -Mode symbols
.\sync-build.ps1 -Mode firmware
.\sync-build.ps1 -Mode scripts
```

也可以指定环境：

```powershell
.\sync-build.ps1 `
  -Mode all `
  -RemoteHost cpp-dev `
  -RemoteBuild "~/project/build" `
  -RemoteScripts "~/project/scripts/windows" `
  -LocalRoot "D:\Dev\target-runtime"
```

## 同一个 VS Code Window

Remote-SSH Window 中保留两个终端：

```text
[Remote Linux]             [Local Windows]
dev@cpp-dev:~/project$     PS D:\Dev\target-runtime>
```

Remote Terminal：

- 编译 C/C++
- 运行 Codex / OpenCode
- 生成 Windows 调试/烧录脚本
- 生成 ELF / MAP / BIN / HEX

Local Terminal：

- 运行 `sync-build.ps1`
- SCP 拉取产物
- 调用 Windows-only 工具
- 查看本地调试/烧录输出

在 Command Palette 中：

```text
Terminal: Create New Integrated Terminal (Local)
```

## Terminal Hook

建议挂一个专用 Windows Terminal Profile，而不是污染全局 PowerShell Profile：

```json
{
  "terminal.integrated.profiles.windows": {
    "Remote Dev Bridge": {
      "path": "powershell.exe",
      "args": [
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "D:\\Dev\\target-runtime\\sync-build.ps1",
        "-Mode",
        "all"
      ]
    }
  }
}
```

启动流程：

```text
Local Terminal starts
        ↓
sync-build.ps1
        ↓
sync build-manifest.json
        ↓
sync symbols / firmware / scripts
        ↓
Windows local debug / flash / test
```

## Build Manifest

符号表和固件必须成套同步，避免：

```text
app.elf = Build A
app.bin = Build B
```

导致调试符号与实际固件不一致。

推荐远程构建时生成：

```json
{
  "build_id": "2026-10-16T00:00:00Z",
  "commit": "abc123",
  "toolchain": "arm-none-eabi-gcc",
  "artifacts": {
    "elf": "app.elf",
    "map": "app.map",
    "bin": "app.bin",
    "hex": "app.hex"
  }
}
```

Windows Hook 先同步 manifest，再同步对应产物。

推荐进一步扩展校验：

- Git commit
- build ID
- SHA-256
- toolchain version
- board/target
- build type

## 为什么不用 SSHFS

这里的目标不是把整个 Linux Workspace 映射给 Windows，而是交付少量 Windows 运行时需要的文件。

SCP Hook 更适合：

- ELF / AXF / PDB / DWARF
- MAP / SYM
- BIN / HEX
- PowerShell / BAT
- OpenOCD / J-Link / TRACE32 配置
- 测试数据和日志

优势：

- 开发环境与运行环境边界清晰；
- 避免网络文件系统拖慢 CMake / Ninja / Git / node_modules；
- Windows 本机 USB/COM/Driver 能力保持本地；
- Agent 可继续完全运行在 Linux；
- 同步失败点明确；
- 便于增加版本和完整性校验。

## 安全约束

自动执行远程生成脚本意味着远程开发环境能影响 Windows Host，因此：

1. 只允许固定远程目录；
2. SSH 使用 key authentication；
3. 默认不要以 Administrator 运行；
4. 高权限动作单独确认；
5. SCP 失败时禁止执行旧脚本；
6. 固件与符号文件使用同一 manifest；
7. 敏感环境可增加 SHA-256 / Git commit / 签名验证。

## 推荐工作流

```text
Remote Linux
    ↓
Build C++ target
    ↓
Generate app.elf / app.map / app.bin / app.hex
    ↓
Generate build-manifest.json
    ↓
Agent generates Windows scripts
    ↓
Windows Local Terminal Hook
    ↓
sync-build.ps1
    ↓
SCP manifest + symbols + firmware + scripts
    ↓
TRACE32 / J-Link / OpenOCD / vendor tool / PowerShell
```

这使整个流程从“Remote Script Runner”升级为一个可复用的 **Remote Development Bridge**。
