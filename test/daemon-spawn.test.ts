import { afterEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

async function loadSpawnWithMocks() {
  vi.resetModules();
  const child = { unref: vi.fn() };
  const mocks = {
    spawn: vi.fn(() => child),
    openSync: vi.fn(() => 123),
    mkdir: vi.fn(),
    getStateDir: vi.fn(() => "C:\\state"),
    readSession: vi.fn(() => ({ controlPort: 12345, token: "token" })),
    daemonRequest: vi.fn(() => Promise.resolve({ connected: true })),
  };

  vi.doMock("node:child_process", () => ({ spawn: mocks.spawn }));
  vi.doMock("node:fs", () => ({ openSync: mocks.openSync }));
  vi.doMock("node:fs/promises", () => ({ mkdir: mocks.mkdir }));
  vi.doMock("../src/session/store.js", () => ({
    getStateDir: mocks.getStateDir,
    readSession: mocks.readSession,
  }));
  vi.doMock("../src/daemon/client.js", () => ({ daemonRequest: mocks.daemonRequest }));

  const { spawnSessionDaemon } = await import("../src/daemon/spawn.js");
  return { spawnSessionDaemon, mocks, child };
}

async function loadSpawnWithNetMock(address: unknown) {
  vi.resetModules();
  const child = { unref: vi.fn() };
  const server = {
    on: vi.fn(),
    listen: vi.fn((_port: number, _host: string, callback: () => void) => callback()),
    address: vi.fn(() => address),
    close: vi.fn((callback: () => void) => callback()),
  };
  const mocks = {
    createServer: vi.fn(() => server),
    spawn: vi.fn(() => child),
    openSync: vi.fn(() => 123),
    mkdir: vi.fn(),
    getStateDir: vi.fn(() => "C:\\state"),
    readSession: vi.fn(() => ({ controlPort: 12345, token: "token" })),
    daemonRequest: vi.fn(() => Promise.resolve({ connected: true })),
  };

  vi.doMock("node:net", () => ({ createServer: mocks.createServer }));
  vi.doMock("node:child_process", () => ({ spawn: mocks.spawn }));
  vi.doMock("node:fs", () => ({ openSync: mocks.openSync }));
  vi.doMock("node:fs/promises", () => ({ mkdir: mocks.mkdir }));
  vi.doMock("../src/session/store.js", () => ({
    getStateDir: mocks.getStateDir,
    readSession: mocks.readSession,
  }));
  vi.doMock("../src/daemon/client.js", () => ({ daemonRequest: mocks.daemonRequest }));

  const { spawnSessionDaemon } = await import("../src/daemon/spawn.js");
  return { spawnSessionDaemon, mocks, child, server };
}

const input = {
  session: "default",
  host: "localhost",
  port: 25565,
  username: "AgentBot",
  auth: "offline",
  detach: true,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("daemon spawn", () => {
  it("spawns a detached daemon with local token and waits for readiness", async () => {
    const { spawnSessionDaemon, mocks, child } = await loadSpawnWithMocks();

    await expect(
      spawnSessionDaemon(
        { ...input, version: "1.20.4" },
        "entry.js",
      ),
    ).resolves.toEqual(expect.objectContaining({ controlPort: expect.any(Number) }));

    expect(mocks.mkdir).toHaveBeenCalledWith("C:\\state", { recursive: true });
    expect(mocks.openSync).toHaveBeenCalledWith(join("C:\\state", "default.log"), "a");
    expect(mocks.spawn).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(["entry.js", "daemon", "run", "--session", "default", "--version", "1.20.4"]),
      expect.objectContaining({
        detached: true,
        stdio: ["ignore", 123, 123],
        env: expect.objectContaining({ MC_AGENT_CONTROL_TOKEN: expect.any(String) }),
      }),
    );
    expect(child.unref).toHaveBeenCalled();
    expect(mocks.daemonRequest).toHaveBeenCalledWith(expect.objectContaining({ controlPort: 12345 }), "/status");
  });

  it("rejects when the OS does not return a TCP port", async () => {
    const { spawnSessionDaemon } = await loadSpawnWithNetMock("pipe");

    await expect(spawnSessionDaemon(input, "entry.js")).rejects.toThrow("Unable to allocate a local port.");
  });

  it("retries daemon readiness checks before succeeding", async () => {
    vi.useFakeTimers();
    const { spawnSessionDaemon, mocks } = await loadSpawnWithNetMock({ port: 34567 });
    mocks.daemonRequest.mockRejectedValueOnce(new Error("not ready")).mockResolvedValueOnce({ connected: true });

    const spawned = spawnSessionDaemon(input, "entry.js");
    await vi.advanceTimersByTimeAsync(100);

    await expect(spawned).resolves.toEqual({ controlPort: 34567 });
    expect(mocks.daemonRequest).toHaveBeenCalledTimes(2);
  });

  it("fails when the daemon never becomes ready", async () => {
    vi.useFakeTimers();
    const { spawnSessionDaemon, mocks } = await loadSpawnWithNetMock({ port: 45678 });
    (mocks.readSession as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const spawned = spawnSessionDaemon(input, "entry.js");
    const expectation = expect(spawned).rejects.toMatchObject({
      code: "DAEMON_ERROR",
      message: "Session daemon did not become ready in time.",
    });
    await vi.advanceTimersByTimeAsync(10_100);

    await expectation;
  });
});
