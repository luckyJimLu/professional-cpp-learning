# Remote Development Bridge

用于 **Windows 本机 + VS Code Remote-SSH + Linux 开发环境** 的跨主机脚本与构建产物同步。

核心原则：**Linux 负责开发/编译/生成；Windows 负责本地执行/调试；SCP 是单向交付边界；Local Terminal 启动 Hook 必须保持轻量。**

## 最终架构

```text
VS Code Remote-SSH Window
├── Remote Linux Terminal
│   ├── OpenCode
│   ├── CMake / Ninja / GCC / Clang
│   ├── build-manifest.json
│   ├── symbols: ELF / MAP / SYM
│   ├── firmware: BIN / HEX
│   └── scripts/windows/*.ps1
│
└── Local Windows Terminal
    └── startup hook: sync-build.ps1 -Mode init
        ├── manifest     -> 每次检查
        ├── scripts      -> 默认同步
        ├── symbols      -> 默认不下载，按需同步
        ├── firmware     -> 默认不下载，按需同步
        └── Set-Location $LocalRoot
```

## Windows 本地工作目录

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

1. SCP 下载根目录；
2. Windows 调试/烧录 Runtime；
3. Local Terminal 当前工作目录。

Hook 完成后执行：

```powershell
Set-Location $LocalRoot
```

最终终端位于：

```text
PS D:\Dev\target-runtime>
```

## 为什么 Terminal Hook 不再使用 Mode all

Local Terminal 可能被频繁创建，而 ELF/AXF/PDB/DWARF 等符号文件可能很大。如果 Terminal Profile 每次运行 `-Mode all`，会产生没有必要的网络传输。

因此默认 Hook 使用：

```powershell
.\sync-build.ps1 -Mode init
```

`init` 只做轻量初始化：

```text
Local Terminal Start
        ↓
create LocalRoot directories
        ↓
sync remote build-manifest.json
        ↓
compare build_id + commit
        ↓
sync Windows scripts
        ↓
DO NOT download symbols
        ↓
DO NOT download firmware
        ↓
Set-Location LocalRoot
        ↓
PS D:\Dev\target-runtime>
```

如果检测到远程 build 已变化，Hook 只提示本地符号/固件可能过期，不自动下载大文件。

## 按需同步

```powershell
# Terminal 启动默认模式
.\sync-build.ps1 -Mode init

# 需要调试时才同步符号
.\sync-build.ps1 -Mode symbols

# 需要烧录时才同步固件
.\sync-build.ps1 -Mode firmware

# 只刷新 Windows 脚本
.\sync-build.ps1 -Mode scripts

# 明确需要全部产物时
.\sync-build.ps1 -Mode all

# 强制重新下载，即使 build_id / commit 未变化
.\sync-build.ps1 -Mode symbols -Force
.\sync-build.ps1 -Mode firmware -Force
```

对于 symbols / firmware，脚本会比较上一份 manifest 的 `build_id + commit`。构建未变化且本地已有对应文件时可以跳过下载；`-Force` 可以覆盖该行为。

> 不能只根据“文件存在”判断是否可用。最终应以 manifest 中的 build_id、commit 和 SHA-256 为准，避免旧符号调试新固件。

## VS Code Local Terminal Profile

推荐专用 Windows Terminal Profile：

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
        "init"
      ]
    }
  }
}
```

Remote-SSH Window 中需要 Windows 本地执行时使用：

```text
Terminal: Create New Integrated Terminal (Local)
```

不要假设 Remote-SSH workspace 中普通 `tasks.json` 一定在 Windows Host 执行。

## Build Manifest

远程构建推荐生成：

```json
{
  "build_id": "2026-10-16T00:00:00Z",
  "commit": "abc123",
  "branch": "main",
  "target": "app",
  "build_type": "Debug",
  "toolchain": "arm-none-eabi-gcc",
  "artifacts": {
    "elf": { "file": "app.elf", "sha256": "..." },
    "map": { "file": "app.map", "sha256": "..." },
    "bin": { "file": "app.bin", "sha256": "..." },
    "hex": { "file": "app.hex", "sha256": "..." }
  }
}
```

目标是确保：

```text
firmware build_id
      ==
symbols build_id
      ==
manifest build_id
      ==
Git commit
```

## OpenCode 工作方式

OpenCode 主要运行在 Remote Linux：

```text
OpenCode @ Linux
      ↓
inspect real repository/build system
      ↓
build C/C++
      ↓
generate manifest
      ↓
generate Windows-only scripts
      ↓
Windows Local Terminal Hook
      ↓
init = metadata + scripts only
      ↓
on-demand symbols / firmware
```

### 给 OpenCode 的实现提示词

```text
请按照 Remote Development Bridge 方案实现当前项目。

首先检查当前仓库真实构建系统、target、build output、scripts/tools/utils、VS Code 配置和调试/烧录流程，不要假设产物固定叫 app.elf/app.bin。

环境：
- Windows 是本机；
- VS Code Remote-SSH 打开 Linux 工程；
- OpenCode 运行在 Linux；
- C/C++ 在 Linux 编译；
- Windows 负责 Windows-only 调试、烧录、USB/COM/Driver；
- Linux -> Windows 使用 SCP；
- 不使用 SSHFS 映射整个 workspace。

实现要求：

1. Linux 构建后生成 build-manifest.json，至少包含 build_id、git commit、branch、target、build_type、toolchain、artifact filename 和 SHA-256。

2. Windows 使用 sync-build.ps1，支持：
   -Mode init
   -Mode symbols
   -Mode firmware
   -Mode scripts
   -Mode all
   -Force

3. Local Terminal startup hook 必须使用 -Mode init，绝对不要默认使用 -Mode all。

4. init 是轻量模式：
   - 每次同步/检查 manifest；
   - 默认同步 Windows scripts；
   - 不下载 symbols；
   - 不下载 firmware；
   - 检查 build_id + commit 是否变化；
   - 如果变化，只提示 symbols/firmware outdated；
   - 最后 Set-Location $LocalRoot。

5. symbols / firmware 必须按需同步。
   构建未变化且本地文件与 manifest 一致时跳过下载。
   -Force 强制重新下载。

6. 不允许仅使用“文件存在”判断是否最新；最终使用 manifest + build_id + commit + SHA-256 校验。

7. SCP 或校验失败必须立即停止，不能继续使用旧文件冒充当前 build。

8. 默认 Windows LocalRoot：
   D:\Dev\target-runtime
   但必须可配置。

9. LocalRoot 同时是：
   - SCP download root
   - Windows runtime/debug root
   - Local Terminal working directory

10. Local Terminal Hook 完成后必须进入 LocalRoot。

11. 不保存 SSH 密码/私钥，不默认要求 Administrator，不自动执行未知来源脚本。

12. 保持对 TRACE32、J-Link、OpenOCD、vendor flash tools、ADB/Fastboot、serial test 的扩展能力。

13. 如果当前环境无法真正执行 Windows PowerShell，只做静态验证并明确说明，不要伪造 Windows 运行结果。

完成后直接实现并检查 diff/build/CI，不要只给建议。
```

## 推荐日常流程

```text
1. VS Code Remote-SSH 打开 Linux 项目
                 ↓
2. Remote Terminal 运行 OpenCode / build
                 ↓
3. 创建 Windows Local Terminal
                 ↓
4. Hook 自动执行 -Mode init
                 ↓
5. manifest + scripts 轻量刷新
                 ↓
6. Local Terminal 进入 D:\Dev\target-runtime
                 ↓
7. 需要调试？
       YES -> -Mode symbols
                 ↓
8. 需要烧录？
       YES -> -Mode firmware
                 ↓
9. Windows local debug / flash / test
```

这套设计的关键是：**创建 Local Terminal 只负责快速建立 Windows Runtime 上下文，大文件同步变成显式、按需、可校验的动作。**
