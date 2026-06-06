# minecraft-cli

Agent-friendly Minecraft CLI powered by [PrismarineJS mineflayer](https://github.com/PrismarineJS/mineflayer).

`mc-agent` lets an AI agent connect a bot to a local/offline Minecraft server, observe chat events, send replies, inspect bot state, and perform basic movement/camera actions through a stable command-line interface.

## Requirements

- Node.js `>=22`
- npm
- A Minecraft server for manual testing. The first version targets local/offline servers by default.

## Install And Build

```bash
npm install
npm run build
npm run typecheck
npm test
```

Run the source CLI during development:

```bash
npm run dev -- --help
```

On Windows PowerShell, direct script execution is often clearer:

```powershell
.\node_modules\.bin\tsx.cmd src/cli/index.ts --help
```

Run the built CLI:

```bash
node dist/cli/index.js --help
```

## Quick Start

Start a default local/offline bot session:

```bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
```

Check status:

```bash
mc-agent --output json session status --session default
```

Read recent events:

```bash
mc-agent --output json observe events --session default --since 0 --limit 50
```

Send chat:

```bash
mc-agent --output json chat send --session default --message "hello"
```

Stop the session:

```bash
mc-agent --output json session stop --session default
```

## Chat Reaction Loop

`mc-agent` does not include an embedded LLM. It exposes Minecraft chat as structured events so an AI agent can decide what to do.

Typical loop:

1. Read events with `observe events` or stream them with `observe watch`.
2. Filter for `chat`, `whisper`, or `message`.
3. Decide whether to reply or act.
4. Use `chat send`, `control tap`, `look at`, or another command.
5. Track the latest event id and continue.

Streaming mode emits newline-delimited JSON:

```bash
mc-agent observe watch --session default --since 0 --output json
```

## Command Reference

Session commands:

```bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
mc-agent --output json session status --session default
mc-agent --output json session list
mc-agent --output json session stop --session default
```

Observe events:

```bash
mc-agent --output json observe events --session default --since 0 --limit 50
mc-agent observe watch --session default --since 0 --output json
```

Chat:

```bash
mc-agent --output json chat send --session default --message "hello"
```

Messages beginning with `/` are blocked by default. Only allow server commands when intentional:

```bash
mc-agent --output json chat send --session default --message "/say hello" --allow-command
```

Bot state and control:

```bash
mc-agent --output json bot position --session default
mc-agent --output json bot inventory --session default
mc-agent --output json control tap --session default --state forward --duration-ms 500
mc-agent --output json look at --session default --x 10 --y 65 --z -3
```

## JSON Contract

Successful commands write only the result to stdout:

```json
{"ok":true,"data":{}}
```

Failures keep the same shape:

```json
{"ok":false,"error":{"code":"SESSION_NOT_FOUND","message":"Session 'default' is not running.","remediation":"Start it with 'mc-agent session start --session <name>'."}}
```

Exit codes:

- `0`: success
- `1`: daemon or unknown error
- `2`: reserved for connection/auth failures
- `3`: bad input or blocked command
- `4`: missing or stopped session

## Local State And Security

- Daemon control HTTP binds only to `127.0.0.1`.
- Each session gets a strong random local token.
- Tokens are stored in the local session state file and are not included in public session output.
- Override the state directory with `MC_AGENT_STATE_DIR`.
- Server commands that start with `/` are blocked unless `--allow-command` is passed.

## Codex Skill

The repository includes a Codex skill at:

```text
skills/minecraft-agent/
```

The installed skill is a discovery stub modeled after `agent-browser`: it tells the agent to load the current workflow from the CLI so usage stays aligned with the installed `mc-agent` version.

```bash
mc-agent skills get core
mc-agent skills get core --full
```

Validate the repository skill with:

```bash
python C:\Users\justj\.codex\skills\.system\skill-creator\scripts\quick_validate.py D:\Code\minecraft-cli\skills\minecraft-agent
```

## Manual Acceptance

With a local/offline Minecraft server running:

```bash
mc-agent --output json session start --detach
mc-agent --output json session status
mc-agent --output json observe events --since 0 --limit 50
mc-agent --output json chat send --message "hello"
mc-agent --output json control tap --state forward --duration-ms 500
mc-agent --output json session stop
```

The automated test suite uses mocks and does not require a real Minecraft server.
