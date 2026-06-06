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
});
