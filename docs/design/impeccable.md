# Impeccable integration

Source: https://github.com/pbakaus/impeccable
Version: **4.8.0**
Pinned commit: **414603bf14c7a344edb466bb1f85690c77ce8b7d**
License: Apache 2.0, retained as LICENSE in both provider copies.

## Provider copies

- OpenCode: `.opencode/skills/impeccable/`, copied from the matching upstream provider directory.
- Codex: `.agents/skills/impeccable/`, copied from the matching upstream provider directory, including its nested agents.

These are complete official provider distributions, not a rewritten SKILL.md. Launchers, reference documents, engine version and checksums are preserved. The platform engine is cached by the official launcher; it is not a web runtime dependency. No global skills, project hooks or harness trust settings are installed. Shared config explicitly disables hooks and telemetry.

## Usage

OpenCode: `/impeccable polish <target>` or `/impeccable audit <target>`.
Codex: `$impeccable` with the desired command and target; reload the harness if needed.

```bash
.agents/skills/impeccable/scripts/impeccable context --target src/App.tsx
.agents/skills/impeccable/scripts/impeccable detect --json src/
```

The context command runs once per session. This project uses **Read** for learning documents and **Operate** for players, editors and simulators. The existing design and behavioral contracts take precedence over generic recommendations. Task refinement is code-first; no default for future marketing/image workflows is set.

## Updates

Fetch the desired upstream commit into a temporary checkout. Review its changelog, scripts and provider distribution diff; replace only the two `skills/impeccable` directories with their matching upstream copies and retain the Apache license. Update this source/version record. Do not run a broad installer that adds automatic hooks or unrelated providers. Verify both launcher versions and context loading after updating.
