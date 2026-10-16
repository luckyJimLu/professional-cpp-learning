# Utils

面向 Professional C++ / Embedded / Systems Engineering 开发流程的实用工具与跨平台工作流。

## Modules

### Remote Development Bridge

[Remote Development Bridge](windows-remote-script-runner/README.md)

用于 Windows 本机通过 VS Code Remote-SSH 在 Linux 开发，并通过 SCP Hook 把远程产物拉回 Windows 本地执行或调试。

支持同步：

- Windows-only PowerShell / BAT 脚本
- ELF / AXF / PDB / DWARF 符号文件
- MAP / SYM
- BIN / HEX 固件
- build manifest
- OpenOCD / J-Link / TRACE32 / ADB/Fastboot 等本地调试与烧录工作流

模块提供：

- [sync-build.ps1](windows-remote-script-runner/sync-build.ps1)
- [build-manifest.example.json](windows-remote-script-runner/build-manifest.example.json)

推荐模式：

```text
Linux = build / agent / generate
Windows = execute / debug / flash
SCP = delivery boundary
```
