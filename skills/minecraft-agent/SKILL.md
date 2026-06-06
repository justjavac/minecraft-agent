---
name: minecraft-agent
description: Control Minecraft bots through the mc-agent CLI built on PrismarineJS mineflayer. Use when Codex needs to connect an AI agent to a Minecraft server, manage a bot session, observe server chat or bot events, send chat replies, inspect position or inventory, or perform basic movement/camera actions in Minecraft.
---

# Minecraft Agent

## Workflow

Use `mc-agent` as the stable interface. Prefer JSON for automation:

```bash
mc-agent --output json session status --session default
```

If no session exists, start one for a local/offline server:

```bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
```

For detailed command shapes and response examples, read `references/cli.md`.

## Operating Rules

- Use `mc-agent --help` or the relevant subcommand help before assuming flags.
- Use `--output json` for non-interactive control and parse `ok`, `data`, and `error`.
- Check `session status` before sending chat or movement commands.
- Read chat and bot events with `observe events`; use `observe watch` when continuous reaction is needed.
- Send replies with `chat send --message <text>`.
- Do not send messages beginning with `/` unless the user explicitly asked for a server command; then pass `--allow-command`.
- On errors, follow `error.remediation` before retrying.
- Stop sessions with `session stop` when the task is finished and the user did not ask to keep the bot online.

## Chat Reaction Loop

To react to Minecraft chat, keep the decision in the agent and use CLI events as input:

1. Call `mc-agent --output json observe events --session default --since <lastEventId>`.
2. Filter events with `type` of `chat`, `whisper`, or `message`.
3. Decide the response or action.
4. Call `chat send`, `control tap`, `look at`, or another command.
5. Store the latest event id and continue.

For streaming, run `mc-agent observe watch --session default --output json`; it emits newline-delimited JSON events.
