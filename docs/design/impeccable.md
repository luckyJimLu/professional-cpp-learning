# Impeccable 集成

来源：https://github.com/pbakaus/impeccable
版本：**4.8.0**
锁定提交：**414603bf14c7a344edb466bb1f85690c77ce8b7d**
许可证：Apache 2.0，在两份供应商副本中均以 LICENSE 文件保留。

## 供应商副本

- OpenCode：`.opencode/skills/impeccable/`，从上游对应的 provider 目录复制。
- Codex：`.agents/skills/impeccable/`，从上游对应的 provider 目录复制，包含其嵌套的 agents。

这两份都是完整的官方 provider 发行版，不是重写过的 SKILL.md。启动器、参考文档、引擎版本与校验和均保持原样。平台引擎由官方启动器缓存，不是 Web 运行时依赖。没有安装全局 skill、项目 hook 或 harness 信任设置；共享配置显式关闭了 hook 与遥测。

## 用法

OpenCode：`/impeccable polish <target>` 或 `/impeccable audit <target>`。
Codex：使用 `$impeccable` 加上所需命令与目标；必要时重新加载 harness。

```bash
.agents/skills/impeccable/scripts/impeccable context --target src/App.tsx
.agents/skills/impeccable/scripts/impeccable detect --json src/
```

context 命令每个会话运行一次。本项目在学习文档上使用 **Read** 模式，在播放器、编辑器和模拟器上使用 **Operate** 模式。现有设计与行为契约优先于通用建议。任务细化以代码优先；不为将来的营销／图片工作流设定默认模式。

## 更新

把所需的上游提交取到临时检出目录，检查其变更日志、脚本与 provider 发行差异；只把两个 `skills/impeccable` 目录替换为对应的上游副本，并保留 Apache 许可证。同步更新本文件的来源与版本记录。不要运行会添加自动 hook 或无关 provider 的宽泛安装器。更新后验证两个启动器版本与 context 加载是否正常。
