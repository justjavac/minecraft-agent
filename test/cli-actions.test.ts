import { describe, expect, it, vi, afterEach } from "vitest";
import { CliError } from "../src/output/errors.js";

function startInput() {
  return {
    session: "default",
    host: "localhost",
    port: 25565,
    username: "AgentBot",
    auth: "offline",
    detach: true,
  };
}

async function loadActionsWithMocks() {
  vi.resetModules();
  const mocks = {
    daemonRequest: vi.fn(),
    loadSessionForClient: vi.fn(),
    runDaemon: vi.fn(),
    spawnSessionDaemon: vi.fn(),
    listSessions: vi.fn(),
    readSession: vi.fn(),
    removeSession: vi.fn(),
    toPublicSession: vi.fn(),
  };

  vi.doMock("../src/daemon/client.js", () => ({
    daemonRequest: mocks.daemonRequest,
    loadSessionForClient: mocks.loadSessionForClient,
  }));
  vi.doMock("../src/daemon/server.js", () => ({ runDaemon: mocks.runDaemon }));
  vi.doMock("../src/daemon/spawn.js", () => ({ spawnSessionDaemon: mocks.spawnSessionDaemon }));
  vi.doMock("../src/session/store.js", () => ({
    listSessions: mocks.listSessions,
    readSession: mocks.readSession,
    removeSession: mocks.removeSession,
    toPublicSession: mocks.toPublicSession,
  }));

  const { createCliHandlers } = await import("../src/cli/actions.js");
  return { handlers: createCliHandlers("entry.js"), mocks };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.MC_AGENT_CONTROL_TOKEN;
});

describe("CLI actions", () => {
  it("starts a new session by spawning the daemon", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    mocks.readSession.mockResolvedValue(undefined);
    mocks.spawnSessionDaemon.mockResolvedValue({ controlPort: 45678 });

    await expect(handlers.startSession(startInput())).resolves.toMatchObject({
      session: "default",
      controlPort: 45678,
      username: "AgentBot",
    });

    expect(mocks.spawnSessionDaemon).toHaveBeenCalledWith(startInput(), "entry.js");
  });

  it("rejects already-running sessions and removes stale sessions before restart", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    mocks.readSession.mockResolvedValueOnce({ session: "default" });
    mocks.toPublicSession.mockReturnValueOnce({ alive: true });

    await expect(handlers.startSession(startInput())).rejects.toMatchObject({ code: "SESSION_ALREADY_RUNNING" });

    mocks.readSession.mockResolvedValueOnce({ session: "default" });
    mocks.toPublicSession.mockReturnValueOnce({ alive: false });
    mocks.spawnSessionDaemon.mockResolvedValueOnce({ controlPort: 11111 });

    await handlers.startSession(startInput());
    expect(mocks.removeSession).toHaveBeenCalledWith("default");
    expect(mocks.spawnSessionDaemon).toHaveBeenCalled();
  });

  it("maps session commands and bot actions to daemon endpoints", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    const record = { session: "default", token: "token", controlPort: 3000 };
    mocks.loadSessionForClient.mockResolvedValue(record);
    mocks.daemonRequest.mockResolvedValue({ ok: true });
    mocks.toPublicSession.mockReturnValue({ session: "default", alive: true });

    await handlers.sessionStatus({ session: "default" });
    await handlers.stopSession({ session: "default" });
    await handlers.observeEvents({ session: "default", since: 3, limit: 10 });
    await handlers.sendChat({ session: "default", message: "hello", allowCommand: false });
    await handlers.botPosition({ session: "default" });
    await handlers.botInventory({ session: "default" });
    await handlers.controlTap({ session: "default", state: "forward", durationMs: 500 });
    await handlers.lookAt({ session: "default", x: 1, y: 2, z: 3 });

    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/status");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/stop", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/events?since=3&limit=10");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/chat", { method: "POST", body: JSON.stringify({ message: "hello" }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/position");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/inventory");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/control/tap", {
      method: "POST",
      body: JSON.stringify({ state: "forward", durationMs: 500 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/look/at", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
  });

  it("streams observe watch chunks to stdout and handles watch failures", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    const record = { session: "default", token: "secret", controlPort: 3000 };
    mocks.loadSessionForClient.mockResolvedValue(record);
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"id":1}\n'));
            controller.close();
          },
        })),
      ),
    );

    await handlers.observeWatch({ session: "default", since: 7 });
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:3000/watch?since=7", {
      headers: { Authorization: "Bearer secret" },
    });
    expect(write).toHaveBeenCalledWith(Buffer.from('{"id":1}\n'));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(handlers.observeWatch({ session: "default", since: 0 })).rejects.toMatchObject({ code: "DAEMON_ERROR" });
  });

  it("requires a daemon token before running the daemon command", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    await expect(handlers.daemonRun({ ...startInput(), controlPort: 3000 })).rejects.toMatchObject({ code: "BAD_INPUT" });

    process.env.MC_AGENT_CONTROL_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    mocks.runDaemon.mockResolvedValue(undefined);
    await expect(handlers.daemonRun({ ...startInput(), controlPort: 3000 })).resolves.toEqual({
      session: "default",
      running: true,
    });
    expect(mocks.runDaemon).toHaveBeenCalledWith(expect.objectContaining({ token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }));
  });

  it("lists sessions using public session records", async () => {
    const { handlers, mocks } = await loadActionsWithMocks();
    mocks.listSessions.mockResolvedValue([{ session: "a" }]);
    mocks.toPublicSession.mockReturnValue({ session: "a", alive: true });

    await expect(handlers.listSessions()).resolves.toEqual({ sessions: [{ session: "a", alive: true }] });
  });

  it("keeps CliError class import exercised", () => {
    expect(new CliError("BAD_INPUT", "bad", "fix", 3).exitCode).toBe(3);
  });
});
