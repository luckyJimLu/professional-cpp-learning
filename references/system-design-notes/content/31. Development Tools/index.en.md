---
id: development-tools-opencode-codex
title: OpenCode and Codex Advanced Engineering Practice
titleEn: Advanced Engineering with OpenCode and Codex
order: 31
category: developer-tools
description: An engineering playbook for AI coding agents, tools, permissions, skills, MCP, subagents, GitHub, and CI/CD.
tags: [Developer Tools, OpenCode, Codex, AI Coding Agent, MCP, Skills, GitHub, CI/CD]
---

# OpenCode and Codex Advanced Engineering Practice

> A practical guide for integrating AI coding agents into real repositories with explicit scope, permissions, verification, rollback, and delivery evidence.
>
> Updated: 2026-09-28

## C++ architecture practice

- [C++ System Architecture in Practice](#/chapter/content-cpp-system-architecture-practice): ownership, templates, futures, synchronization, scheduling and Java comparisons.

## Jev and AI Gateway

- [Jev with Cloudflare AI Gateway SOP](#/chapter/content-jev-cloudflare-ai-gateway): API smoke test, acceptance checks, and browser agent integration boundary.

## 1. Core operating model

Treat OpenCode and Codex as constrained software engineers, not chatbots.

![Engineering delivery loop](images/engineering-loop-en.svg)

The shared principles are:

- Define “done” before editing.
- Read `AGENTS.md`, repository guidance, and linked issues first.
- Use Plan before Build for cross-module or high-risk work.
- Parallelize read-only investigations; isolate concurrent writes with worktrees.
- Claim verification only when a real command or reproducible evidence supports it.
- Keep sandbox and approval boundaries tight by default.
- Put generated code, docs, CI, and configuration through the same review process.

## 2. OpenCode and Codex at a glance

| Dimension | OpenCode | Codex |
| --- | --- | --- |
| Focus | Open, deeply configurable coding agent | OpenAI engineering agent |
| Surfaces | TUI, CLI, IDE, desktop | CLI, IDE, desktop, cloud |
| Project guidance | `AGENTS.md`, `opencode.json/jsonc` | `AGENTS.md`, `.codex/config.toml`, `~/.codex/config.toml` |
| Extensions | Agents, Commands, Skills, MCP, Custom Tools, Plugins | Skills, Plugins, MCP, Subagents, `codex exec` |
| Best fit | Local customization and embedded/C/C++ workflows | Local loops, reviews, cloud delegation, GitHub workflows |
| Shared boundary | Git diff, tests, permissions, rollback | Git diff, tests, permissions, rollback |

A productive combination is OpenCode for long-lived local engineering and custom tooling, and Codex for cross-device work, cloud delegation, PR review, and connected workflows.

## 3. Project control plane

Use four layers:

1. Project rules: `AGENTS.md`, architecture and build docs.
2. Task contract: goal, scope, constraints, acceptance, rollback.
3. Tools and agents: Skills, MCP, commands, scripts, plugins, subagents.
4. Delivery evidence: tests, logs, diff, CI, PR, release record.

A useful `AGENTS.md` includes the repository map, real commands, language and dependency constraints, forbidden changes, secrets boundaries, and required verification.

## 4. OpenCode advanced practice

Use Plan → human confirmation → Build → Test → Review for medium and large changes.

Use the right abstraction:

| Capability | Purpose |
| --- | --- |
| Agent | Responsible role for a class of work |
| Command | Repeatable action exposed as a command |
| Skill | Reusable multi-step method |
| Custom Tool | Deterministic project-specific operation |
| Plugin | Lifecycle and distribution extension |
| MCP | External tools and context |

Do not build deterministic parsers, release helpers, or validators from scratch in every conversation. Package them as scripts or Custom Tools and keep reasoning-heavy policy in Skills.

For embedded projects, useful tools include firmware size, map analysis, stack usage, symbol lookup, pcap summaries, log parsing, register decoding, and board configuration lookup.

Keep MCP minimal and audited. Define what each server can read, write, and execute; inject secrets only through a secure credential boundary.

## 5. Codex advanced practice

Codex CLI supports a focused terminal loop:

```bash
codex
```

Useful surfaces include:

- `/init`: create project instructions;
- `/status`: inspect session configuration;
- `/permissions`: set execution boundaries;
- `/model`: choose model and reasoning effort;
- `/plan`: investigate before editing;
- `/review`: review changes;
- `codex exec`: repeatable non-interactive work;
- `codex mcp`: connect external tools;
- `codex resume`: return to saved work;
- `codex cloud`: delegate to an isolated cloud environment.

Keep personal defaults in `~/.codex/config.toml`, repository behavior in trusted project `.codex/config.toml`, and one-off overrides on the command line. Approval and sandbox are separate controls: one governs consent, the other governs access.

Skills package instructions, references, optional scripts, and assets. Plugins distribute reusable skills and connectors. Subagents help with bounded parallel investigation, but they cost more tokens and should not write to the same files concurrently.

## 6. Prompt as an engineering contract

A strong task prompt names:

```text
Goal
Scope
Reproduction or current behavior
Constraints
Reference files
Implementation order
Verification commands
Output format
```

Example:

```text
Goal: fix stale daily market data.

Scope: data adapters, cache, and chart loading only.

Constraints:
- prefer the primary data source;
- preserve the existing API;
- fall back to the local store on timeout;
- do not change layout.

Process:
1. inspect the current refresh path;
2. propose a minimal plan;
3. wait for confirmation;
4. implement and add regression coverage;
5. run the real checks.

Report changed files, root cause, commands, results, skipped checks, and remaining risks.
```

## 7. Real engineering workflows

### New feature

Read repository guidance and issue context; map the code; define acceptance and out-of-scope items; plan; implement minimally; test; review the diff; commit with evidence.

### Bug fix

Use:

![Bug fix workflow](images/bugfix-loop-en.svg)

### Large refactor

Freeze the dependency map, define schemas and compatibility, run old and new paths in parallel, migrate, observe, then remove the old path only after coverage is demonstrated.

### CI/CD

Check least-privilege permissions, pinned third-party actions, secret and artifact hygiene, concurrency, environment protection, traceable artifacts, retry behavior, and rollback.

### Documentation

Record audience, prerequisites, version/date, official links, verified versus inferred behavior, and commands that actually work in the current repository.

## 8. Recommended mapping for this workspace

| Project | Recommended focus |
| --- | --- |
| `system-design-notes` | Content front matter, content validation, diagram rendering checks |
| StockAnalysis / TradingView | Data-source contracts, rate limits, fallback behavior, production checks |
| RT-Thread / RIL / modem | clangd, firmware/map/pcap/log tools, concurrency and resource rules |
| HomeTutor multi-repo | Schemas, fixtures, simulators, subagent boundaries, integration evidence |
| `aihome-skills` | Skill metadata, triggers, provenance, version audits |
| `aihome-agent` | Agent routing, task contracts, permissions, delivery templates |

## 9. Common failure patterns

| Pattern | Root cause | Fix |
| --- | --- | --- |
| Agent modifies unrelated files | Scope not defined | Specify allowed directories and forbidden changes |
| Claims "tests passed" with no output | No real verification required | Require command, exit code, and summary |
| MCP servers keep growing | Treating tool count as capability | Enable per task, isolate by permission |
| Subagents overwrite each other | Shared workspace writes | Read-only in parallel; use worktrees for writes |
| Uses stale platform APIs | Treating old docs as truth | Current official docs and a small PoC |
| Agent loops indefinitely | No stopping condition | Set milestones, budget, max retries, and escalation |
| Docs drift from code | Docs not in CI | Validate links, examples, commands, and front matter |
| Production access granted directly | Trust boundary unclear | Default sandbox and approval; separate approval for production |

## 10. Definition of done

A task is complete only when scope is clear, project guidance was read, the change is explainable, at least one real verification was run, important paths have regression coverage or an explicit reason, the diff contains no unrelated changes, secrets were not exposed, and remaining risks are documented.

## 11. References

### OpenCode

- [OpenCode documentation](https://opencode.ai/docs)
- [Config](https://opencode.ai/docs/config)
- [Agents](https://opencode.ai/docs/agents)
- [Commands](https://opencode.ai/docs/commands)
- [Skills](https://opencode.ai/docs/skills)
- [Tools](https://opencode.ai/docs/tools)
- [Custom Tools](https://opencode.ai/docs/custom-tools)
- [MCP Servers](https://opencode.ai/docs/mcp-servers)
- [Plugins](https://opencode.ai/docs/plugins)
- [CLI](https://opencode.ai/docs/cli)

### Codex

- [Codex CLI](https://developers.openai.com/codex/cli)
- [Codex prompting and workflows](https://learn.chatgpt.com/docs/prompting)
- [Codex best practices](https://learn.chatgpt.com/guides/best-practices)
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Skills](https://learn.chatgpt.com/docs/build-skills)
- [MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

> Platform commands and configuration may change with new versions. For current behavior, refer to the official documentation and the current CLI `--help` output.
