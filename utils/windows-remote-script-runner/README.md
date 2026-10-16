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


## OpenCode 实现指南

这个模块默认以 **OpenCode** 作为主要 Coding Agent。推荐做法不是让 OpenCode 直接在 Windows 上改动本地系统，而是：

```text
OpenCode @ Remote Linux
        ↓
理解当前仓库 / 构建系统
        ↓
实现 build manifest / Windows scripts / hook integration
        ↓
提交到 Git
        ↓
Windows Local Terminal
        ↓
SCP 拉取最新脚本 + 符号 + 固件
        ↓
本地执行 / 调试 / 烧录
```

### 推荐让 OpenCode 先做的事情

OpenCode 开始实现前，应先检查：

1. 当前项目实际构建系统：CMake / Ninja / Make / 自定义脚本；
2. 实际产物名称与路径，而不是假设一定叫 `app.elf`；
3. 是否已有 post-build / custom target；
4. 是否已有 scripts / tools / utils 目录约定；
5. 是否已有 VS Code 配置；
6. 是否已有 firmware / debug / flash 工作流；
7. 是否已有 Git commit / version / build metadata 生成机制；
8. 不破坏现有 CI 和 build。

### OpenCode 推荐实现顺序

```text
Phase 1
  inspect repository
      ↓
Phase 2
  identify build outputs
      ↓
Phase 3
  generate build-manifest.json
      ↓
Phase 4
  implement/refine sync-build.ps1
      ↓
Phase 5
  add hash/build-id verification
      ↓
Phase 6
  add optional VS Code Local Terminal profile
      ↓
Phase 7
  validate commands + docs
```

### OpenCode 主提示词

下面这段可以直接在远程 Linux 项目根目录中交给 OpenCode。

```text
请实现当前仓库中的 Remote Development Bridge。

先不要直接修改代码。

第一步：
完整检查当前仓库结构、构建系统、实际 build output、VS Code 配置、scripts/tools/utils 目录和现有调试/烧录流程。

然后阅读：
utils/windows-remote-script-runner/README.md

目标环境：

- 我的本机是 Windows。
- VS Code 使用 Remote-SSH 打开当前 Linux 工程。
- OpenCode 运行在远程 Linux。
- C/C++ 编译主要运行在 Linux。
- Windows 本机负责运行 Windows-only 脚本、调试器、烧录工具和访问 USB/COM/Driver。
- Linux 与 Windows 之间通过 SCP 同步必要产物。
- 不使用 SSHFS 映射整个远程工程。

总体架构：

Remote Linux:
  build / OpenCode / generate artifacts
        |
        | SCP
        v
Windows Local:
  symbols / firmware / scripts / manifest
        |
        v
  debug / flash / test

请基于“当前仓库真实结构”实现，不要机械照抄 README 中的示例文件名。

功能要求：

1. 识别当前项目实际构建输出。

   典型但非强制：
   - ELF / AXF
   - MAP / SYM
   - BIN
   - HEX

   如果当前项目名称不是 app.elf/app.bin，请使用实际 target。

2. Linux 构建后生成 build-manifest.json。

   至少包含：
   - build_id
   - git commit
   - branch
   - target
   - build_type
   - toolchain
   - artifact filename
   - SHA-256

3. 优先复用当前构建系统。

   如果是 CMake：
   - 优先使用 add_custom_command(POST_BUILD)、
     custom target 或独立 cmake/script；
   - 不破坏原有 build；
   - 不硬编码不必要的 target；
   - 保持 CI 可运行。

4. 完善：
   utils/windows-remote-script-runner/sync-build.ps1

   它运行在 Windows 本机。

   参数至少支持：
   - Mode
   - RemoteHost
   - RemoteBuild
   - RemoteScripts
   - LocalRoot

   Mode 至少支持：
   - symbols
   - firmware
   - scripts
   - all

5. Windows 本地默认布局：

   D:\Dev\target-runtime\
     symbols\
     firmware\
     scripts\
     manifest\
     logs\

   但 LocalRoot 必须可配置。

6. SCP 同步规则：

   - manifest 必须先同步；
   - 任意 scp 失败立即退出；
   - 不允许同步失败后继续执行旧文件；
   - 日志明确显示 remote -> local；
   - 返回正确 exit code；
   - 避免重复 scp 实现，封装函数。

7. 校验：

   - 根据 manifest 校验 SHA-256；
   - hash 不匹配立即退出；
   - symbols 与 firmware 必须来自相同 build_id / commit；
   - manifest 缺失时禁止继续；
   - 不能默默 fallback 到旧文件。

8. Windows scripts：

   支持从类似以下目录同步：

   scripts/windows/

   例如：
   - flash.ps1
   - debug.ps1
   - test.ps1

   但请根据当前仓库实际结构调整。

9. VS Code：

   当前窗口是 Remote-SSH Window。

   目标是在同一个 VS Code Window 中保留：

   Remote Terminal:
     Linux build / OpenCode

   Local Terminal:
     Windows SCP / debug / flash

   请提供可选 Windows Local Terminal Profile 配置。

   重要：
   不要假设普通 Remote-SSH tasks.json 一定会在 Windows 本机执行。
   需要 Windows 本地执行时，优先使用：
   Terminal: Create New Integrated Terminal (Local)
   + Windows terminal profile/hook。

10. Hook：

   Local Windows Terminal 启动后可以调用：

   sync-build.ps1 -Mode all

   流程：

   Local Terminal Start
        ↓
   sync manifest
        ↓
   verify metadata
        ↓
   sync symbols
        ↓
   sync firmware
        ↓
   sync Windows scripts
        ↓
   verify SHA-256
        ↓
   ready for local debug/flash/test

11. 安全：

   - 默认不需要 Administrator；
   - 不写 Windows 系统目录；
   - 不保存 SSH 密码或私钥到仓库；
   - RemoteHost/RemoteRoot/LocalRoot 可配置；
   - 不自动运行未知路径的远程脚本；
   - SCP/校验失败后停止。

12. 可扩展性：

   后续要容易增加：
   - TRACE32
   - J-Link
   - OpenOCD
   - vendor flash tools
   - ADB/Fastboot
   - serial test
   - test logs

13. 文档：

   完成实现后更新：
   utils/windows-remote-script-runner/README.md

   必须记录：
   - architecture
   - setup
   - configuration
   - commands
   - troubleshooting
   - security
   - VS Code usage
   - example workflow

14. 验证：

   实现结束后自行检查：
   - shell/PowerShell syntax
   - repository diff
   - build integration
   - existing CI impact
   - example command correctness

   如果当前环境无法运行 Windows PowerShell，
   不要伪造验证结果。
   明确区分：
   已静态验证
   与
   需要 Windows 本机验证。

最后给我输出：
1. 你发现的当前仓库构建结构；
2. 你做了哪些修改；
3. 新增/修改文件列表；
4. Linux 端如何生成产物；
5. Windows 端如何运行；
6. 仍需要我在 Windows 上验证的项目。

不要只给建议，请直接实现。
```

### OpenCode 日常短提示词

完成第一次集成之后，平时不需要重复上面的完整提示词，可以使用：

```text
检查当前 Remote Development Bridge。

重新读取：
utils/windows-remote-script-runner/README.md

根据当前 build output 更新 manifest 和 Windows SCP hook，
确保 symbols、firmware、scripts 属于同一个 build_id/commit，
然后检查 diff 和现有 build/CI 是否受影响。

有问题直接修复，不要只给建议。
```

如果只是新增一个 Windows-only 工具脚本：

```text
按照 Remote Development Bridge 约定，
为当前任务新增 Windows-only 脚本。

要求：
- 放入现有 Windows scripts 目录；
- 不硬编码密码/私钥；
- 可通过 sync-build.ps1 同步；
- 使用 LocalRoot 下的标准目录；
- 错误返回非 0；
- 更新 README 使用方法；
- 检查 diff 后直接完成实现。
```

## 推荐完整工作流

```text
Windows VS Code
    |
    +-- Remote-SSH Window --------------------------------------+
    |                                                          |
    |   Remote Linux Terminal                                  |
    |       |                                                  |
    |       +-- OpenCode                                       |
    |       +-- CMake / Ninja / GCC / Clang                    |
    |       +-- generate symbols / firmware                    |
    |       +-- generate build-manifest.json                   |
    |       +-- generate Windows scripts                       |
    |                                                          |
    |   Local Windows Terminal                                 |
    |       |                                                  |
    |       +-- sync-build.ps1                                 |
    |              |                                           |
    |              +-- SCP manifest                            |
    |              +-- SCP symbols                             |
    |              +-- SCP firmware                            |
    |              +-- SCP scripts                             |
    |              +-- SHA-256 verification                    |
    |              +-- build-id / commit verification          |
    |                                                          |
    +----------------------------------------------------------+
                    |
                    v
             Windows local tools
             TRACE32 / J-Link
             OpenOCD / vendor tools
             USB / COM / ADB
```

这里的关键边界保持不变：

**OpenCode 在 Linux 端负责“实现和生成”，Windows Hook 负责“同步、校验和本地执行”。**
