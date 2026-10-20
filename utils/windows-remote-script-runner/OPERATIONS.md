# Remote Development Bridge：操作与失败验收清单

前置：阅读 [模块设计](README.md)，具备可访问的 Remote Linux、Windows PowerShell 和 OpenSSH。本文是操作手册；本轮没有 Windows／探头／烧录实测记录。返回 [工具首页](../README.md)。

## 1. 当前脚本能力与约束

- 默认 `-Mode init`：下载 manifest 和 Windows 脚本，不自动下载大型符号／固件。
- `symbols`、`firmware`、`scripts` 和 `all` 按需执行；`-Force` 用于显式重新下载。
- 现有脚本检查 SCP 退出码、比较 build_id／commit，并使用 `app.elf/app.map/app.bin/app.hex` 固定文件名。
- **现有脚本没有实施 SHA-256 校验，也没有维护每类产物独立的同步版本账本。** 因而 `ready`、文件存在或 manifest 已刷新，都不能证明本地符号／固件与远端一致。

例如 init 已更新 manifest，但旧 ELF 仍在本地，随后 symbols 的“未变化”判断可能跳过下载。实际操作使用 `-Force` 并独立核对 hash；在补齐同步账本前不要将此优化当成一致性保证。本轮不修改 PowerShell 的生产行为。

## 2. 干净环境首次操作

1. 在 Linux 成功构建，记录 commit、build_id、产品配置、工具链；在本次输出上计算 SHA-256。
2. 用 manifest 的 `artifacts` 明确每个文件名与 hash。示例 JSON 中占位值不是有效校验结果；现有固定文件名应与脚本一致。
3. Windows 先手工测试 SSH／SCP 和 LocalRoot 权限，不依赖未声明的 VS Code profile、管理员权限或当前目录。
4. 保存日志，先运行 `init`，确认它没有自动下载大型产物。
5. 明确执行 `symbols -Force`／`firmware -Force`，再逐个校验下载文件；只有校验通过才调用 debugger／flash。

```powershell
# 工作目录为保存 sync-build.ps1 的目录；主机和目录替换为真实配置。
.\sync-build.ps1 -Mode init -RemoteHost cpp-dev -RemoteBuild '~/project/build'
.\sync-build.ps1 -Mode symbols -Force
.\sync-build.ps1 -Mode firmware -Force
Get-FileHash 'D:\Dev\target-runtime\symbols\app.elf' -Algorithm SHA256
Get-FileHash 'D:\Dev\target-runtime\firmware\app.bin' -Algorithm SHA256
```

后两次同步也要传入与首次相同的非默认参数，不能误连另一个 build 目录。将实际 hash 与构建端记录逐字比较；不匹配立即停止。上述命令是目标环境待执行步骤，不是本轮运行记录。

## 3. 失败分支

| 场景 | 应做的动作 | 不应做的动作 |
| --- | --- | --- |
| SCP 非零退出／连接中断 | 停止、保留日志；重新同步需要的类别并核对全部 hash | 继续使用已存在的旧文件 |
| 新 manifest + 旧本地产物 | 强制同步相应类别，按 hash 核对 | 认为 buildChanged=false 即可跳过验证 |
| 只同步了符号或只同步了固件 | 分别记录两个版本，补齐缺失类别 | 将一次同步的 manifest 当所有本地产物的凭证 |
| hash 不符 | 隔离该产物，重新下载并确认构建端未继续变化 | 烧录／调试后再解释异常 |
| 文件名／产品不同 | 先适配脚本、manifest 和操作清单 | 假设脚本自动读取任意 artifact 名称 |
| 本地脚本下载失败 | 不调用新旧混合脚本 | 根据终端目录切换成功宣布整条流程成功 |

## 4. 验收记录

分别执行：干净首次同步、无变化同步、新 build、传输中断、缺文件、hash 不匹配和只同步一个类别。每项保存命令、退出码、manifest、实际文件 hash、采取的恢复动作及 Windows／OpenSSH 版本。

调试时保留固件、符号和配置的同一构建证据。参考 [TRACE32 案例包](../../frameworks/trace32/08-case-study.md)，避免用符号不匹配产生的假现场解释 C++ 缺陷。
