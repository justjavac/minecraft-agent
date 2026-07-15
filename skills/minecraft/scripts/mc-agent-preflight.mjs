#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const sessionNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

if (options.help) {
  print({
    ok: true,
    usage: "node scripts/mc-agent-preflight.mjs [--session default] [--bin mc-agent]",
    description: "Check whether mc-agent is available and whether the target session is ready before taking Minecraft actions.",
  });
  process.exit(0);
}

if (!sessionNamePattern.test(options.session)) {
  fail("Session names must be 1-64 characters and contain only letters, numbers, dot, underscore, or hyphen.");
}

const status = run(options.bin, ["--output", "json", "session", "status", "--session", options.session]);

if (status.spawnError) {
  print({
    ok: false,
    available: false,
    session: options.session,
    code: "MC_AGENT_UNAVAILABLE",
    message: status.spawnError,
    install: "npm install -g minecraft-agent",
    next: "Install minecraft-agent, verify 'mc-agent --help', then rerun preflight. If global installs are not appropriate, provide the CLI path with --bin.",
  });
  process.exit(2);
}

const parsed = parseJson(status.stdout);

if (status.exitCode === 0 && parsed?.ok === true) {
  const data = parsed.data ?? {};
  const sessionStatus = data.status && typeof data.status === "object" ? data.status : data;
  const connected = sessionStatus.connected === true;
  const spawned = typeof sessionStatus.spawned === "boolean" ? sessionStatus.spawned : undefined;
  const ready = connected && spawned === true;
  print({
    ok: ready,
    available: true,
    session: options.session,
    connected,
    spawned,
    lastEventId: sessionStatus.lastEventId,
    username: sessionStatus.username ?? data.username,
    next: ready
      ? `Read events with '${options.bin} --output json observe events --session ${options.session} --since ${sessionStatus.lastEventId ?? 0} --limit 50'.`
      : `Start or inspect the session before acting: '${options.bin} --output json session start --session ${options.session}'.`,
    status: sessionStatus,
  });
  process.exit(ready ? 0 : 1);
}

const error = parsed?.error;
print({
  ok: false,
  available: true,
  session: options.session,
  code: error?.code ?? "MC_AGENT_STATUS_FAILED",
  message: error?.message ?? status.stderr.trim() ?? status.stdout.trim() ?? "mc-agent session status failed.",
  remediation: error?.remediation,
  next:
    error?.code === "SESSION_NOT_FOUND"
      ? `${options.bin} --output json session start --session ${options.session} --host localhost --port 25565 --username AgentBot --auth offline`
      : "Stop and surface the remediation before taking Minecraft actions.",
});
process.exit(status.exitCode === 0 ? 1 : status.exitCode);

function parseArgs(args) {
  const parsed = { session: "default", bin: "mc-agent", help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--session") {
      parsed.session = requireValue(args, ++index, "--session");
    } else if (arg === "--bin") {
      parsed.bin = requireValue(args, ++index, "--bin");
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    fail(`Missing value for ${flag}.`);
  }
  return value;
}

function run(command, args) {
  if (process.platform === "win32" && /[\r\n"&|<>^%!]/.test(command)) {
    fail("The --bin path contains characters that are unsafe for the Windows command shell.");
  }
  const executable = process.platform === "win32" ? `"${command}"` : command;
  const result = spawnSync(executable, args, { encoding: "utf8", shell: process.platform === "win32" });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    spawnError: result.error?.message,
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message) {
  print({ ok: false, code: "BAD_ARGS", message });
  process.exit(3);
}
