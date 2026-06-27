import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { buildProgram } from "../src/cli/program.js";
import type { CliHandlers } from "../src/cli/handlers.js";

class MemoryStream extends Writable {
  value = "";

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.value += chunk.toString();
    callback();
  }
}

function createMockHandlers(): CliHandlers {
  const target: Record<string, unknown> = {};

  return new Proxy(target, {
    get(object, property) {
      if (typeof property !== "string") {
        return undefined;
      }
      object[property] ??= vi.fn(async () => ({}));
      return object[property];
    },
    getOwnPropertyDescriptor(object, property) {
      if (typeof property !== "string") {
        return undefined;
      }
      object[property] ??= vi.fn(async () => ({}));
      return {
        configurable: true,
        enumerable: true,
        value: object[property],
        writable: true,
      };
    },
    has(_object, property) {
      return typeof property === "string";
    },
  }) as unknown as CliHandlers;
}

function makeProgram(version = "0.0.0") {
  const stdout = new MemoryStream();
  const stderr = new MemoryStream();
  const handlers = createMockHandlers();
  const program = buildProgram(handlers, { stdout, stderr, isStdoutTty: false }, version);
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
    });
    expect(JSON.parse(stdout.value)).toEqual({ ok: true, data: { session: "default" } });
  });

  it("uses default text formatter fallback for start sessions without names", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const handlers = createMockHandlers();
    const program = buildProgram(handlers, { stdout, stderr, isStdoutTty: true });
    program.exitOverride();
    vi.spyOn(handlers, "startSession").mockResolvedValue({});

    await program.parseAsync(["node", "mc-agent", "session", "start"]);

    expect(stdout.value).toBe("Started session default\n");
  });

  it("uses the provided CLI version", () => {
    const { program } = makeProgram("9.8.7");

    expect(program.version()).toBe("9.8.7");
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
    expect(names).toEqual(["session", "observe", "chat", "bot", "control", "look", "navigate", "collect", "inventory", "world", "window", "entity", "skills", "daemon"]);
  });

  it("prints bundled skill content directly", async () => {
    const { program, stdout } = makeProgram();

    await program.parseAsync(["node", "mc-agent", "skills", "get", "core"]);

    expect(stdout.value).toContain("# mc-agent core");
    expect(stdout.value).toContain("The observe-decide-act loop");
    expect(stdout.value).toContain("Waiting and refreshing");
  });

  it("maps negated navigation configuration flags", async () => {
    const { program, handlers } = makeProgram();
    vi.spyOn(handlers, "navigateConfigure").mockResolvedValue({});

    await program.parseAsync([
      "node",
      "mc-agent",
      "navigate",
      "configure",
      "--session",
      "s",
      "--no-dig",
      "--no-sprinting",
      "--no-parkour",
      "--can-open-doors",
      "--max-drop-down",
      "8",
      "--search-radius",
      "64",
    ]);

    expect(handlers.navigateConfigure).toHaveBeenCalledWith({
      session: "s",
      allowDig: false,
      allowSprinting: false,
      allowParkour: false,
      canOpenDoors: true,
      maxDropDown: 8,
      searchRadius: 64,
      thinkTimeout: undefined,
      tickTimeout: undefined,
    });
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
    vi.spyOn(handlers, "botPlayers").mockResolvedValue({});
    vi.spyOn(handlers, "botEntities").mockResolvedValue({});
    vi.spyOn(handlers, "controlTap").mockResolvedValue({});
    vi.spyOn(handlers, "lookAt").mockResolvedValue({});
    vi.spyOn(handlers, "worldBlock").mockResolvedValue({});
    vi.spyOn(handlers, "worldFindBlocks").mockResolvedValue({});
    vi.spyOn(handlers, "navigateGoto").mockResolvedValue({});
    vi.spyOn(handlers, "navigateFollow").mockResolvedValue({});
    vi.spyOn(handlers, "navigateStop").mockResolvedValue({});
    vi.spyOn(handlers, "navigateStatus").mockResolvedValue({});
    vi.spyOn(handlers, "inventoryEquip").mockResolvedValue({});
    vi.spyOn(handlers, "worldDig").mockResolvedValue({});
    vi.spyOn(handlers, "worldPlace").mockResolvedValue({});
    vi.spyOn(handlers, "worldActivate").mockResolvedValue({});
    vi.spyOn(handlers, "windowClick").mockResolvedValue({});
    vi.spyOn(handlers, "daemonRun").mockResolvedValue({});

    await program.parseAsync(["node", "mc-agent", "session", "status", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "session", "list"]);
    await program.parseAsync(["node", "mc-agent", "session", "stop", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "observe", "events", "--session", "s", "--since", "2", "--limit", "3"]);
    await program.parseAsync(["node", "mc-agent", "observe", "watch", "--session", "s", "--since", "4"]);
    await program.parseAsync(["node", "mc-agent", "chat", "send", "--session", "s", "--message", "/say hi", "--allow-command"]);
    await program.parseAsync(["node", "mc-agent", "bot", "position", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "bot", "inventory", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "bot", "players", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "bot", "entities", "--session", "s", "--radius", "16", "--limit", "4"]);
    await program.parseAsync(["node", "mc-agent", "control", "tap", "--session", "s", "--state", "jump", "--duration-ms", "25"]);
    await program.parseAsync(["node", "mc-agent", "look", "at", "--session", "s", "--x", "1", "--y", "2", "--z", "3"]);
    await program.parseAsync(["node", "mc-agent", "world", "block", "--session", "s", "--x", "4", "--y", "5", "--z", "6"]);
    await program.parseAsync(["node", "mc-agent", "world", "find-blocks", "--session", "s", "--name", "farmland", "--radius", "12", "--count", "3"]);
    await program.parseAsync(["node", "mc-agent", "navigate", "goto", "--session", "s", "--x", "7", "--y", "8", "--z", "9", "--range", "2"]);
    await program.parseAsync(["node", "mc-agent", "navigate", "follow", "--session", "s", "--player", "Steve", "--range", "3"]);
    await program.parseAsync(["node", "mc-agent", "navigate", "stop", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "navigate", "status", "--session", "s"]);
    await program.parseAsync(["node", "mc-agent", "inventory", "equip", "--session", "s", "--item", "dirt", "--destination", "hand"]);
    await program.parseAsync(["node", "mc-agent", "world", "dig", "--session", "s", "--x", "10", "--y", "11", "--z", "12"]);
    await program.parseAsync([
      "node",
      "mc-agent",
      "world",
      "place",
      "--session",
      "s",
      "--x",
      "13",
      "--y",
      "14",
      "--z",
      "15",
      "--face",
      "east",
      "--item",
      "dirt",
    ]);
    await program.parseAsync(["node", "mc-agent", "world", "activate", "--session", "s", "--x", "16", "--y", "17", "--z", "18"]);
    await program.parseAsync(["node", "mc-agent", "window", "click", "--session", "s", "--slot", "5", "--mouse-button", "1", "--mode", "0"]);
    await program.parseAsync(["node", "mc-agent", "daemon", "run", "--control-port", "4567"]);

    expect(handlers.sessionStatus).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.listSessions).toHaveBeenCalledWith();
    expect(handlers.stopSession).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.observeEvents).toHaveBeenCalledWith({ session: "s", since: 2, limit: 3, types: [] });
    expect(handlers.observeWatch).toHaveBeenCalledWith({ session: "s", since: 4, types: [] });
    expect(handlers.sendChat).toHaveBeenCalledWith({ session: "s", message: "/say hi", allowCommand: true });
    expect(handlers.botPosition).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.botInventory).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.botPlayers).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.botEntities).toHaveBeenCalledWith({ session: "s", radius: 16, limit: 4 });
    expect(handlers.controlTap).toHaveBeenCalledWith({ session: "s", state: "jump", durationMs: 25 });
    expect(handlers.lookAt).toHaveBeenCalledWith({ session: "s", x: 1, y: 2, z: 3 });
    expect(handlers.worldBlock).toHaveBeenCalledWith({ session: "s", x: 4, y: 5, z: 6 });
    expect(handlers.worldFindBlocks).toHaveBeenCalledWith({ session: "s", name: "farmland", radius: 12, count: 3 });
    expect(handlers.navigateGoto).toHaveBeenCalledWith({ session: "s", x: 7, y: 8, z: 9, range: 2 });
    expect(handlers.navigateFollow).toHaveBeenCalledWith({ session: "s", player: "Steve", range: 3 });
    expect(handlers.navigateStop).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.navigateStatus).toHaveBeenCalledWith({ session: "s" });
    expect(handlers.inventoryEquip).toHaveBeenCalledWith({ session: "s", item: "dirt", destination: "hand" });
    expect(handlers.worldDig).toHaveBeenCalledWith({ session: "s", x: 10, y: 11, z: 12 });
    expect(handlers.worldPlace).toHaveBeenCalledWith({ session: "s", x: 13, y: 14, z: 15, face: "east", item: "dirt" });
    expect(handlers.worldActivate).toHaveBeenCalledWith({ session: "s", x: 16, y: 17, z: 18 });
    expect(handlers.windowClick).toHaveBeenCalledWith({ session: "s", slot: 5, mouseButton: 1, mode: 0 });
    expect(handlers.daemonRun).toHaveBeenCalledWith({
      session: "default",
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      controlPort: 4567,
    });
  });

  it("parses observe event type filters", async () => {
    const { program, handlers } = makeProgram();
    vi.spyOn(handlers, "observeEvents").mockResolvedValue({});
    vi.spyOn(handlers, "observeWatch").mockResolvedValue(undefined);

    await program.parseAsync([
      "node",
      "mc-agent",
      "observe",
      "events",
      "--type",
      "chat,whisper",
      "--type",
      "message",
    ]);
    await program.parseAsync(["node", "mc-agent", "observe", "watch", "--type", "chat"]);

    expect(handlers.observeEvents).toHaveBeenCalledWith({
      session: "default",
      since: 0,
      limit: 50,
      types: ["chat", "whisper", "message"],
    });
    expect(handlers.observeWatch).toHaveBeenCalledWith({
      session: "default",
      since: 0,
      types: ["chat"],
    });
  });

  it("writes text output and text errors for tty-style commands", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const handlers = createMockHandlers();
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
