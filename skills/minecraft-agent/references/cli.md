# mc-agent CLI Reference

## Defaults

- Session: `default`
- Host: `localhost`
- Port: `25565`
- Username: `AgentBot`
- Auth: `offline`
- Automation output: pass `--output json`

## Response Contract

Success:

```json
{"ok":true,"data":{}}
```

Failure:

```json
{"ok":false,"error":{"code":"BAD_INPUT","message":"...","remediation":"..."}}
```

Exit codes:

- `0`: success
- `1`: daemon or unknown error
- `2`: reserved for connection/auth failures
- `3`: bad input or blocked command
- `4`: session missing or not running

## Commands

Start a session:

```bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
```

Inspect sessions:

```bash
mc-agent --output json session status --session default
mc-agent --output json session list
mc-agent --output json session stop --session default
```

Observe events:

```bash
mc-agent --output json observe events --session default --since 0 --limit 50
mc-agent observe watch --session default --since 0 --output json
```

Event shape:

```json
{"id":1,"type":"chat","timestamp":"2026-06-06T00:00:00.000Z","sender":"Steve","text":"hello","raw":{}}
```

Send chat:

```bash
mc-agent --output json chat send --session default --message "hello"
```

Server commands are blocked by default:

```bash
mc-agent --output json chat send --session default --message "/say hello" --allow-command
```

Inspect and control the bot:

```bash
mc-agent --output json bot position --session default
mc-agent --output json bot inventory --session default
mc-agent --output json control tap --session default --state forward --duration-ms 500
mc-agent --output json look at --session default --x 10 --y 65 --z -3
```

## Common Failures

- `SESSION_NOT_FOUND`: start the session or use `session list` to find the right name.
- `SESSION_ALREADY_RUNNING`: reuse the existing session or stop it before restarting.
- `COMMAND_BLOCKED`: the message starts with `/`; add `--allow-command` only when the user asked for a server command.
- `DAEMON_ERROR`: restart the session and inspect the session log in the state directory.
