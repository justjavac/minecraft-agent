import { Writable } from "node:stream";
import { Command } from "commander";
import { z } from "zod";
import { getSkillContent } from "../core/skills.js";
import { commandBlocked, normalizeError } from "../output/errors.js";
import { failure, formatDefaultText, resolveOutputMode, success, writeJson, writeText } from "../output/response.js";
import { CliHandlers } from "./handlers.js";

export interface CliIo {
  stdout: Writable;
  stderr: Writable;
  isStdoutTty?: boolean;
}

const sessionSchema = z.object({
  session: z.string().min(1).default("default"),
});

const startSchema = sessionSchema.extend({
  host: z.string().min(1).default("localhost"),
  port: z.coerce.number().int().positive().max(65535).default(25565),
  username: z.string().min(1).default("AgentBot"),
  auth: z.string().min(1).default("offline"),
  version: z.string().min(1).optional(),
  detach: z.boolean().default(false),
});

const eventsSchema = sessionSchema.extend({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

const watchSchema = sessionSchema.extend({
  since: z.coerce.number().int().min(0).default(0),
});

const chatSchema = sessionSchema.extend({
  message: z.string().min(1),
  allowCommand: z.boolean().default(false),
});

const controlTapSchema = sessionSchema.extend({
  state: z.enum(["forward", "back", "left", "right", "jump", "sprint", "sneak"]),
  durationMs: z.coerce.number().int().min(1).max(30000).default(500),
});

const lookAtSchema = sessionSchema.extend({
  x: z.coerce.number(),
  y: z.coerce.number(),
  z: z.coerce.number(),
});

const daemonRunSchema = startSchema.extend({
  controlPort: z.coerce.number().int().positive().max(65535),
});

type TextFormatter = (data: unknown) => string;

function getOutputMode(command: Command, io: CliIo) {
  return resolveOutputMode(command.optsWithGlobals().output, io.isStdoutTty);
}

function commandRunner<T>(
  command: Command,
  io: CliIo,
  action: () => Promise<T>,
  formatter: TextFormatter = formatDefaultText,
) {
  return async () => {
    const mode = getOutputMode(command, io);
    try {
      const data = await action();
      if (mode === "json") {
        writeJson(io.stdout, success(data));
      } else {
        writeText(io.stdout, formatter(data));
      }
    } catch (error) {
      const normalized = normalizeError(error);
      if (mode === "json") {
        writeJson(io.stdout, failure(normalized));
      } else {
        writeText(io.stderr, `${normalized.code}: ${normalized.message}\n${normalized.remediation}`);
      }
      throw normalized;
    }
  };
}

export function buildProgram(handlers: CliHandlers, io: CliIo): Command {
  const program = new Command();

  program
    .name("mc-agent")
    .description("Agent-friendly Minecraft CLI powered by mineflayer.")
    .version("1.0.0")
    .option("--output <mode>", "output mode: json or text")
    .showHelpAfterError();

  const session = program.command("session").description("Manage Minecraft bot sessions");

  session
    .command("start")
    .description("Start a long-running Minecraft bot session")
    .option("--session <name>", "session name", "default")
    .option("--host <host>", "Minecraft server host", "localhost")
    .option("--port <port>", "Minecraft server port", "25565")
    .option("--username <name>", "bot username", "AgentBot")
    .option("--auth <mode>", "mineflayer auth mode", "offline")
    .option("--version <version>", "Minecraft protocol version")
    .option("--detach", "keep the session daemon running in the background", false)
    .action((opts, cmd) =>
      commandRunner(
        cmd,
        io,
        () => handlers.startSession(startSchema.parse(opts)),
        (data) => `Started session ${(data as { session?: string }).session ?? "default"}`,
      )(),
    );

  session
    .command("status")
    .description("Show a Minecraft bot session status")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.sessionStatus(sessionSchema.parse(opts)))());

  session
    .command("list")
    .description("List known local Minecraft bot sessions")
    .action((_opts, cmd) => commandRunner(cmd, io, () => handlers.listSessions())());

  session
    .command("stop")
    .description("Stop a Minecraft bot session")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.stopSession(sessionSchema.parse(opts)))());

  const observe = program.command("observe").description("Observe Minecraft bot events");

  observe
    .command("events")
    .description("Fetch stored bot events")
    .option("--session <name>", "session name", "default")
    .option("--since <eventId>", "return events after this id", "0")
    .option("--limit <count>", "maximum events to return", "50")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.observeEvents(eventsSchema.parse(opts)))());

  observe
    .command("watch")
    .description("Watch new bot events as newline-delimited JSON")
    .option("--session <name>", "session name", "default")
    .option("--since <eventId>", "return events after this id", "0")
    .action(async (opts, cmd) => {
      resolveOutputMode(cmd.optsWithGlobals().output, io.isStdoutTty);
      await handlers.observeWatch(watchSchema.parse(opts));
    });

  const chat = program.command("chat").description("Send Minecraft chat");

  chat
    .command("send")
    .description("Send a chat message from the bot")
    .requiredOption("--message <text>", "chat message to send")
    .option("--session <name>", "session name", "default")
    .option("--allow-command", "allow messages beginning with /", false)
    .action((opts, cmd) =>
      commandRunner(cmd, io, () => {
        const input = chatSchema.parse(opts);
        if (input.message.startsWith("/") && !input.allowCommand) {
          throw commandBlocked("Refusing to send a server command as chat.", "Pass --allow-command if this command is intentional.");
        }
        return handlers.sendChat(input);
      })(),
    );

  const bot = program.command("bot").description("Inspect Minecraft bot state");

  bot
    .command("position")
    .description("Show the bot position")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botPosition(sessionSchema.parse(opts)))());

  bot
    .command("inventory")
    .description("Show the bot inventory")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botInventory(sessionSchema.parse(opts)))());

  const control = program.command("control").description("Control Minecraft bot movement");

  control
    .command("tap")
    .description("Set a control state briefly")
    .requiredOption("--state <state>", "forward|back|left|right|jump|sprint|sneak")
    .option("--duration-ms <ms>", "duration in milliseconds", "500")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.controlTap(controlTapSchema.parse(opts)))());

  const look = program.command("look").description("Control bot camera direction");

  look
    .command("at")
    .description("Look at a world coordinate")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.lookAt(lookAtSchema.parse(opts)))());

  const skills = program.command("skills").description("Print mc-agent skill content for AI agents");

  skills
    .command("get")
    .description("Print a bundled skill by name")
    .argument("<name>", "skill name, for example core")
    .option("--full", "include full command reference", false)
    .action((name: string, opts: { full: boolean }) => {
      writeText(io.stdout, getSkillContent(name, opts.full));
    });

  const daemon = new Command("daemon").description("Internal daemon commands");
  daemon
    .command("run")
    .requiredOption("--control-port <port>", "local control port")
    .option("--session <name>", "session name", "default")
    .option("--host <host>", "Minecraft server host", "localhost")
    .option("--port <port>", "Minecraft server port", "25565")
    .option("--username <name>", "bot username", "AgentBot")
    .option("--auth <mode>", "mineflayer auth mode", "offline")
    .option("--version <version>", "Minecraft protocol version")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.daemonRun(daemonRunSchema.parse(opts)))());
  program.addCommand(daemon, { hidden: true });

  return program;
}
