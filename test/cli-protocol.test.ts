import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { buildProgram } from "../src/cli/program.js";
import { createPlaceholderHandlers } from "../src/cli/handlers.js";

class MemoryStream extends Writable {
  value = "";

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.value += chunk.toString();
    callback();
  }
}

function makeProgram() {
  const stdout = new MemoryStream();
  const stderr = new MemoryStream();
  const handlers = createPlaceholderHandlers();
  const program = buildProgram(handlers, { stdout, stderr, isStdoutTty: false });
  program.exitOverride();
  return { program, handlers, stdout, stderr };
}

describe("CLI protocol", () => {
  it("parses session start defaults and writes JSON success", async () => {
    const { program, handlers, stdout } = makeProgram();
    vi.spyOn(handlers, "startSession").mockResolvedValue({ session: "default" });

    await program.parseAsync(["node", "mc-agent", "session", "start"]);

    expect(handlers.startSession).toHaveBeenCalledWith({
      session: "default",
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      detach: false,
    });
    expect(JSON.parse(stdout.value)).toEqual({ ok: true, data: { session: "default" } });
  });

  it("uses default text formatter fallback for start sessions without names", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const handlers = createPlaceholderHandlers();
    const program = buildProgram(handlers, { stdout, stderr, isStdoutTty: true });
    program.exitOverride();
    vi.spyOn(handlers, "startSession").mockResolvedValue({});

    await program.parseAsync(["node", "mc-agent", "session", "start"]);

    expect(stdout.value).toBe("Started session default\n");
  });

  it("blocks slash commands unless explicitly allowed", async () => {
    const { program, stdout } = makeProgram();

    await expect(program.parseAsync(["node", "mc-agent", "chat", "send", "--message", "/op me"])).rejects.toMatchObject({
      code: "COMMAND_BLOCKED",
      exitCode: 3,
    });

    expect(JSON.parse(stdout.value)).toEqual({
      ok: false,
      error: {
        code: "COMMAND_BLOCKED",
        message: "Refusing to send a server command as chat.",
        remediation: "Pass --allow-command if this command is intentional.",
      },
    });
  });

  it("exposes all planned top-level command groups", () => {
    const { program } = makeProgram();
    const names = program.commands.map((command) => command.name());
    expect(names).toEqual(expect.arrayContaining(["session", "observe", "chat", "bot", "control", "look", "skills", "daemon"]));
  });

  it("prints bundled skill content directly", async () => {
    const { program, stdout } = makeProgram();

    await program.parseAsync(["node", "mc-agent", "skills", "get", "core"]);

    expect(stdout.value).toContain("# mc-agent core");
    expect(stdout.value).toContain("The observe-decide-act loop");
    expect(stdout.value).toContain("Waiting and refreshing");
  });

  it("routes every command action through the correct handler", async () => {
    const { program, handlers } = makeProgram();
    vi.spyOn(handlers, "sessionStatus").mockResolvedValue({});
    vi.spyOn(handlers, "listSessions").mockResolvedValue({});
    vi.spyOn(handlers, "stopSession").mockResolvedValue({});
    vi.spyOn(handlers, "observeEvents").mockResolvedValue({});
    vi.spyOn(handlers, "observeWatch").mockResolvedValue(undefined);
    vi.spyOn(handlers, "sendChat").mockResolvedValue({});
    vi.spyOn(handlers, "botPosition").mockResolvedValue({});
    vi.spyOn(handlers, "botInventory").mockResolvedValue({});
    vi.spyOn(handlers, "controlTap").mockResolvedValue({});
    vi.spyOn(handlers, "lookAt").mockResolvedValue({});
    vi.spyOn(handlers, "daemonRun").mockResolvedValue({});

    await program.parseAsync(["node", "mc-agent", "session", "status", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "session", "list"]);
    await program.parseAsync(["node", "mc-agent", "session", "stop", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "observe", "events", "--session", "s", "--since", "2", "--limit", "3"]);
    await program.parseAsync(["node", "mc-agent", "observe", "watch", "--session", "s", "--since", "4"]);
    await program.parseAsync(["node", "mc-agent", "chat", "send", "--session", "s", "--message", "/say hi", "--allow-command"]);
    await program.parseAsync(["node", "mc-agent", "bot", "position", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "bot", "inventory", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "control", "tap", "--session", "s", "--state", "jump", "--duration-ms", "25"]);
    await program.parseAsync(["node", "mc-agent", "look", "at", "--session", "s", "--x", "1", "--y", "2", "--z", "3"]);
    await program.parseAsync(["node", "mc-agent", "daemon", "run", "--control-port", "4567"]);

    expect(handlers.sessionStatus).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.listSessions).toHaveBeenCalledWith();
    expect(handlers.stopSession).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.observeEvents).toHaveBeenCalledWith({ session: "s", since: 2, limit: 3 });
    expect(handlers.observeWatch).toHaveBeenCalledWith({ session: "s", since: 4 });
    expect(handlers.sendChat).toHaveBeenCalledWith({ session: "s", message: "/say hi", allowCommand: true });
    expect(handlers.botPosition).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.botInventory).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.controlTap).toHaveBeenCalledWith({ session: "s", state: "jump", durationMs: 25 });
    expect(handlers.lookAt).toHaveBeenCalledWith({ session: "s", x: 1, y: 2, z: 3 });
    expect(handlers.daemonRun).toHaveBeenCalledWith({
      session: "default",
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      detach: false,
      controlPort: 4567,
    });
  });

  it("writes text output and text errors for tty-style commands", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const handlers = createPlaceholderHandlers();
    const program = buildProgram(handlers, { stdout, stderr, isStdoutTty: true });
    program.exitOverride();
    vi.spyOn(handlers, "startSession").mockResolvedValue({ session: "named" });
    vi.spyOn(handlers, "sessionStatus").mockRejectedValue(new Error("plain failure"));

    await program.parseAsync(["node", "mc-agent", "session", "start"]);
    await expect(program.parseAsync(["node", "mc-agent", "session", "status"])).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
    });

    expect(stdout.value).toContain("Started session named");
    expect(stderr.value).toContain("UNKNOWN_ERROR: plain failure");
  });
});
