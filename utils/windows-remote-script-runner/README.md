# Windows Remote Script Runner

用于 **Windows 本机 + VS Code Remote-SSH + Linux 开发环境** 的跨主机脚本工作流。

## 场景

- VS Code Workspace 通过 Remote-SSH 打开远程 Linux 项目。
- Codex / OpenCode / 编译与主要开发工作运行在 Linux。
- Agent 在 Linux 仓库中生成 `.ps1` / `.bat` 等 Windows-only 脚本。
- 脚本必须访问 Windows 本机能力，例如 USB、串口、ADB/Fastboot、驱动、本地 GUI 工具或 Windows API。
- 不希望用 SSHFS 映射整个远程项目。

## 架构

```text
VS Code (same window)
├── Remote Linux Terminal
│   └── ~/project/scripts/windows/*.ps1
│       └── Codex / OpenCode generates scripts
│
└── Local Windows Terminal
    └── bootstrap.ps1
        ├── scp latest script from Linux
        ├── save to C:\Dev\host-scripts
        └── execute locally with PowerShell
```

核心原则：**Linux 是开发/生成环境，Windows 是执行环境，SCP 是明确的单向交付边界。**

## 1. 远程项目目录约定

```text
project/
├── src/
└── scripts/
    └── windows/
        ├── test.ps1
        ├── flash.ps1
        └── setup.ps1
```

## 2. Windows 本地目录

```powershell
New-Item -ItemType Directory -Force C:\Dev\host-scripts
```

推荐结构：

```text
C:\Dev\host-scripts\
├── bootstrap.ps1       # 固定启动器
├── test.ps1            # SCP 拉取
├── flash.ps1           # SCP 拉取
└── setup.ps1           # SCP 拉取
```

## 3. Bootstrap SCP Hook

将 `bootstrap.ps1` 放到 Windows 本机 `C:\Dev\host-scripts\bootstrap.ps1`：

```powershell
param(
    [string]$Script = "test.ps1",
    [string]$RemoteHost = "dev@server",
    [string]$RemoteRoot = "~/project/scripts/windows",
    [string]$LocalDir = "C:\Dev\host-scripts"
)

$ErrorActionPreference = "Stop"
$localScript = Join-Path $LocalDir $Script
$remoteScript = "${RemoteHost}:${RemoteRoot}/${Script}"

Write-Host "[host-runner] Syncing $remoteScript -> $localScript"

& scp $remoteScript $localScript
if ($LASTEXITCODE -ne 0) {
    throw "SCP failed with exit code $LASTEXITCODE"
}

Write-Host "[host-runner] Running $localScript"
& $localScript

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Windows script exited with code $LASTEXITCODE"
}
```

使用：

```powershell
.\bootstrap.ps1 test.ps1
.\bootstrap.ps1 flash.ps1
.\bootstrap.ps1 setup.ps1
```

## 4. 同一个 VS Code Window 中使用

Remote-SSH 窗口中保留两个 Terminal：

```text
[Remote Linux]       [Local Windows]
dev@server:~$        PS C:\>
```

Remote Terminal 负责生成/修改脚本；Local Terminal 负责 SCP 和 Windows 执行。

在 Command Palette 中创建本地 Terminal：

```text
Terminal: Create New Integrated Terminal (Local)
```

## 5. Terminal 启动 Hook

可为 Windows 本地 VS Code 配置专用 Terminal Profile：

```json
{
  "terminal.integrated.profiles.windows": {
    "Windows Host Runner": {
      "path": "powershell.exe",
      "args": [
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "C:\\Dev\\host-scripts\\bootstrap.ps1"
      ]
    }
  }
}
```

启动 `Windows Host Runner` 后：

```text
Terminal starts
    ↓
bootstrap.ps1
    ↓
scp latest Windows script
    ↓
C:\Dev\host-scripts\test.ps1
    ↓
execute on Windows host
```

> 不建议把 SCP hook 放入全局 PowerShell Profile，否则所有 PowerShell 会话都会产生不必要的远程同步。

## 6. SSH 配置建议

Windows `%USERPROFILE%\.ssh\config` 可定义稳定 alias：

```sshconfig
Host cpp-dev
    HostName 192.168.1.100
    User dev
    IdentityFile ~/.ssh/id_ed25519
```

Bootstrap 中即可使用：

```powershell
.\bootstrap.ps1 -Script test.ps1 -RemoteHost cpp-dev
```

避免脚本中散落 IP、用户名和密钥路径。

## 7. 为什么不用 SSHFS

此场景的目标不是让 Windows 构建整个 Linux Workspace，而是把少量 **Windows-only 执行产物** 从 Linux 交付给 Windows。

SCP hook 的优势：

- 开发环境与执行环境边界清晰；
- 不把 `node_modules`、CMake build tree 等大量文件跨网络文件系统访问；
- Windows USB/COM/Driver/ADB 等本机资源保持本地执行；
- Agent 可以继续完全运行在 Linux；
- 失败点明确，容易记录日志和自动化。

## 8. 安全约束

自动执行远程生成的脚本意味着远程开发环境拥有影响 Windows Host 的能力，因此建议：

1. 只允许从固定仓库目录拉取脚本；
2. SSH 使用 key authentication；
3. 不以 Administrator 身份默认运行 Host Runner；
4. 涉及驱动安装、系统配置等高权限动作时单独确认；
5. `scp` 失败时禁止继续执行旧脚本；
6. 对生产/敏感机器可增加 hash、签名或 Git commit 校验。

## 9. 推荐工作流

```text
Remote Linux
    ↓
Codex / OpenCode modifies scripts/windows/test.ps1
    ↓
open/restart Windows Host Runner
    ↓
bootstrap.ps1
    ↓
SCP latest script
    ↓
Windows local execution
    ↓
inspect output in the same VS Code terminal panel
```

该模式可以继续扩展成 VS Code Task，使 `SCP → Execute → Capture Output` 通过一个快捷键完成。
