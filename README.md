# minecraft-agent

[![coverage](https://img.shields.io/codecov/c/github/justjavac/minecraft-agent/main?label=coverage)](https://codecov.io/gh/justjavac/minecraft-agent)

Minecraft Agent is an agent-ready command-line interface for controlling long-lived [PrismarineJS mineflayer](https://github.com/PrismarineJS/mineflayer) bots from AI coding agents, local automation, and shell workflows.

The `minecraft-agent` package installs the `mcagent` binary. `mcagent` connects a bot to a local/offline Minecraft server, observes chat and world events, replies in chat, inspects bot/world state, pathfinds or follows visible players, and performs inventory, item-use, crafting, container, farming, building, mining, entity, and block actions through a stable JSON-first interface.

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
mcagent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
```

Check status:

```bash
mcagent --output json session status --session default
```

Read recent events:

```bash
mcagent --output json observe events --session default --since 0 --limit 50
```

Send chat:

```bash
mcagent --output json chat send --session default --message "hello"
```

Stop the session:

```bash
mcagent --output json session stop --session default
```

## Chat Reaction Loop

`mcagent` does not include an embedded LLM. It exposes Minecraft chat as structured events so an AI agent can decide what to do.

Typical loop:

1. Read events with `observe events` or stream them with `observe watch`.
2. Filter for `chat`, `whisper`, or `message`.
3. Decide whether to reply or act.
4. Use `chat send`, `control tap`, `look at`, or another command.
5. Track the latest event id and continue.

Streaming mode emits newline-delimited JSON:

```bash
mcagent observe watch --session default --since 0 --output json
```

## Command Reference

Session commands:

```bash
mcagent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
mcagent --output json session status --session default
mcagent --output json session list
mcagent --output json session stop --session default
```

Observe events:

```bash
mcagent --output json observe events --session default --since 0 --limit 50
mcagent observe watch --session default --since 0 --output json
```

Chat:

```bash
mcagent --output json chat send --session default --message "hello"
```

Messages beginning with `/` are blocked by default. Only allow server commands when intentional:

```bash
mcagent --output json chat send --session default --message "/say hello" --allow-command
```

Bot state and control:

```bash
mcagent --output json bot position --session default
mcagent --output json bot inventory --session default
mcagent --output json bot players --session default
mcagent --output json bot entities --session default --radius 32 --limit 50
mcagent --output json bot tablist --session default
mcagent --output json bot scoreboards --session default
mcagent --output json bot teams --session default
mcagent --output json bot controls --session default
mcagent --output json control tap --session default --state forward --duration-ms 500
mcagent --output json control set --session default --state sprint
mcagent --output json control clear --session default
mcagent --output json look at --session default --x 10 --y 65 --z -3
mcagent --output json look yaw-pitch --session default --yaw 1.57 --pitch 0
mcagent --output json navigate goto --session default --x 10 --y 64 --z -3 --range 1
mcagent --output json navigate follow --session default --player Steve --range 2
mcagent --output json navigate status --session default
mcagent --output json navigate configure --session default --no-dig --search-radius 64
mcagent --output json navigate stop --session default
mcagent --output json collect item --session default --id 12 --range 1
mcagent --output json inventory equip --session default --item dirt --destination hand
mcagent --output json inventory quickbar --session default --slot 0
mcagent --output json inventory toss --session default --item dirt --count 1
mcagent --output json inventory activate-item --session default
mcagent --output json inventory consume --session default
mcagent --output json inventory fish --session default
mcagent --output json inventory recipes --session default --item stick --count 1
mcagent --output json inventory craft --session default --item stick --count 1 --recipe-index 0
mcagent --output json world block --session default --x 10 --y 64 --z -3
mcagent --output json world block-info --session default --x 10 --y 64 --z -3
mcagent --output json world find-blocks --session default --name farmland --radius 32 --count 20
mcagent --output json world dig --session default --x 10 --y 64 --z -3
mcagent --output json world place --session default --x 10 --y 63 --z -3 --face up --item dirt
mcagent --output json world activate --session default --x 10 --y 64 --z -3
mcagent --output json build place-line --session default --from-x 10 --from-y 63 --from-z -3 --to-x 14 --to-y 63 --to-z -3 --face up --item dirt
mcagent --output json build place-cuboid-shell --session default --from-x 10 --from-y 63 --from-z -3 --to-x 14 --to-y 66 --to-z 1 --face up --item dirt --max-blocks 128
mcagent --output json mine dig-line --session default --from-x 10 --from-y 64 --from-z -3 --to-x 10 --to-y 68 --to-z -3
mcagent --output json mine dig-cuboid --session default --from-x 10 --from-y 64 --from-z -3 --to-x 12 --to-y 66 --to-z -1 --max-blocks 64
mcagent --output json crop inspect --session default --x 10 --y 64 --z -3
mcagent --output json crop find-mature --session default --name wheat --radius 32 --count 20
mcagent --output json crop plant --session default --x 10 --y 63 --z -3 --item wheat_seeds
mcagent --output json crop harvest --session default --x 10 --y 64 --z -3 --replant-item wheat_seeds
mcagent --output json window open-block --session default --x 10 --y 64 --z -3
mcagent --output json window status --session default
mcagent --output json window deposit --session default --item dirt --count 64
mcagent --output json window withdraw --session default --item dirt --count 64
mcagent --output json window close --session default
mcagent --output json chest open-block --session default --x 10 --y 64 --z -3
mcagent --output json furnace open --session default --x 10 --y 64 --z -3
mcagent --output json furnace put-input --session default --item raw_iron --count 1
mcagent --output json furnace put-fuel --session default --item coal --count 1
mcagent --output json furnace take-output --session default
mcagent --output json anvil rename --session default --x 10 --y 64 --z -3 --item iron_sword --name "Sharp"
mcagent --output json enchant open --session default --x 10 --y 64 --z -3
mcagent --output json villager open --session default --id 12
mcagent --output json villager trade --session default --index 0 --times 1
mcagent --output json entity find --session default --type mob --radius 16 --limit 20
mcagent --output json combat targets --session default --type mob --radius 16 --limit 20
mcagent --output json entity attack --session default --id 12 --allow-passive
mcagent --output json entity activate --session default --id 12
```

These primitives are enough for agent-driven loops such as following a visible player, placing blocks from a blueprint, planting and harvesting crops, fishing, selected-recipe crafting, moving items through chests/furnaces/villagers, collecting dropped items, riding vehicles, and interacting with mobs or objects. Complex construction and farming still require the agent to plan, verify each step, and handle missing inventory or unreachable targets.

The detailed capability requirements and review notes live in:

```text
docs/capability-requirements.md
```

## JSON Contract

Successful commands write only the result to stdout:

```json
{"ok":true,"data":{}}
```

Failures keep the same shape:

```json
{"ok":false,"error":{"code":"SESSION_NOT_FOUND","message":"Session 'default' is not running.","remediation":"Start it with 'mcagent session start --session <name>'."}}
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
- Attacking players or passive mobs requires explicit allow flags such as `--allow-players` or `--allow-passive`.

## Codex Skill

The repository includes a Codex skill named `minecraft` at:

```text
skills/minecraft/
```

The installed skill is a compact entry guide for Minecraft chat reactions and bot control. It is invoked as `$minecraft` and tells the agent to load the current runtime workflow from `mcagent` so usage stays aligned with the installed package version.

```bash
mcagent skills get core
mcagent skills get core --full
```

The repository fallback reference is `skills/minecraft/references/mcagent-cli.md`.

Validate the repository skill with:

```bash
python C:\Users\justj\.codex\skills\.system\skill-creator\scripts\quick_validate.py .\skills\minecraft
```

## Manual Acceptance

With a local/offline Minecraft server running:

```bash
mcagent --output json session start --detach
mcagent --output json session status
mcagent --output json observe events --since 0 --limit 50
mcagent --output json chat send --message "hello"
mcagent --output json control tap --state forward --duration-ms 500
mcagent --output json session stop
```

The automated test suite uses mocks and does not require a real Minecraft server.
