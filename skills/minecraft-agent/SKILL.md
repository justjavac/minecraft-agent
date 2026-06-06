---
name: minecraft-agent
description: Minecraft automation CLI for AI agents. Use when Codex needs to connect a mineflayer bot to a Minecraft server, manage bot sessions, observe server chat or bot events, send chat replies, inspect position or inventory, or perform basic movement and camera actions. Start by loading the current workflow with `mc-agent skills get core`.
---

# minecraft-agent

Minecraft automation CLI for AI agents. Built on mineflayer with persistent local sessions and structured event output.

This file is a discovery stub. Before running task commands, load the actual workflow content from the installed CLI so instructions match the current version:

```bash
mc-agent skills get core
mc-agent skills get core --full
```

## Why mc-agent

- Persistent Minecraft bot sessions across commands.
- Structured chat and bot events for observe-decide-act workflows.
- JSON output for agent parsing.
- Local-only daemon control with session tokens.
- Explicit safety guard for server commands beginning with `/`.
