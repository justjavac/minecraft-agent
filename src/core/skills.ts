export function getSkillContent(name: string, full: boolean): string {
  if (name !== "core") {
    throw new Error(`Unknown skill '${name}'. Available skills: core.`);
  }

  return full ? `${CORE_SKILL}\n\n${FULL_REFERENCE}` : CORE_SKILL;
}

const CORE_SKILL = `---
name: minecraft-agent-core
description: Core mc-agent usage guide. Read this before running Minecraft agent commands. Covers session startup, the observe-decide-act loop, chat reactions, basic movement, inventory and position inspection, JSON output, safety rules, and troubleshooting common local daemon failures.
---

# mc-agent core

Agent-friendly Minecraft CLI powered by mineflayer. The CLI keeps a bot session running across commands, exposes Minecraft chat as structured events, and lets the agent act through explicit commands.

## The core loop

\`\`\`bash
mc-agent --output json session status --session default
mc-agent --output json observe events --session default --since 0 --limit 50
mc-agent --output json chat send --session default --message "hello"
mc-agent --output json observe events --session default --since <lastEventId>
\`\`\`

Events are the agent's perception. Commands are the agent's actions. Re-read events after any action that could change world or chat state.

## Start or reuse a session

\`\`\`bash
mc-agent --output json session status --session default
\`\`\`

If the session is missing and the task requires a bot, start a local/offline session:

\`\`\`bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
\`\`\`

The first version targets local/offline servers. Do not assume Microsoft account auth is configured unless the user says so.

## Observe Minecraft

Fetch stored events:

\`\`\`bash
mc-agent --output json observe events --session default --since 0 --limit 50
\`\`\`

Stream new events as newline-delimited JSON:

\`\`\`bash
mc-agent observe watch --session default --since 0 --output json
\`\`\`

Relevant chat event types are \`chat\`, \`whisper\`, and \`message\`. Track the largest \`id\` seen and pass it as \`--since\` next time.

## Act

Send chat:

\`\`\`bash
mc-agent --output json chat send --session default --message "hello"
\`\`\`

Messages beginning with \`/\` are blocked by default. Only pass \`--allow-command\` when the user explicitly asked for a server command.

Inspect state:

\`\`\`bash
mc-agent --output json bot position --session default
mc-agent --output json bot inventory --session default
\`\`\`

Move or look:

\`\`\`bash
mc-agent --output json control tap --session default --state forward --duration-ms 500
mc-agent --output json look at --session default --x 10 --y 65 --z -3
\`\`\`

## Chat reaction workflow

1. Read events with \`observe events\` or \`observe watch\`.
2. Filter chat-like events.
3. Decide whether to reply, move, look, or inspect state.
4. Execute one explicit action command.
5. Re-observe from the latest event id.

Keep agent reasoning outside the daemon. The daemon provides perception and actions; it does not decide what to say.

## Troubleshooting

- \`SESSION_NOT_FOUND\`: start a session or choose one from \`session list\`.
- \`SESSION_ALREADY_RUNNING\`: reuse it or stop it before restarting.
- \`COMMAND_BLOCKED\`: the message starts with \`/\`; add \`--allow-command\` only when intentional.
- \`DAEMON_ERROR\`: restart the session and inspect the state-directory log.
- No chat events: confirm the bot is connected, the server is local/offline compatible, and read \`session status\`.
`;

const FULL_REFERENCE = `## Full command reference

Session:

\`\`\`bash
mc-agent --output json session start --session default --host localhost --port 25565 --username AgentBot --auth offline --detach
mc-agent --output json session status --session default
mc-agent --output json session list
mc-agent --output json session stop --session default
\`\`\`

Observe:

\`\`\`bash
mc-agent --output json observe events --session default --since 0 --limit 50
mc-agent observe watch --session default --since 0 --output json
\`\`\`

Chat and control:

\`\`\`bash
mc-agent --output json chat send --session default --message "hello"
mc-agent --output json chat send --session default --message "/say hello" --allow-command
mc-agent --output json bot position --session default
mc-agent --output json bot inventory --session default
mc-agent --output json control tap --session default --state forward --duration-ms 500
mc-agent --output json look at --session default --x 10 --y 65 --z -3
\`\`\`

Response contract:

\`\`\`json
{"ok":true,"data":{}}
\`\`\`

\`\`\`json
{"ok":false,"error":{"code":"SESSION_NOT_FOUND","message":"Session 'default' is not running.","remediation":"Start it with 'mc-agent session start --session <name>'."}}
\`\`\`
`;
