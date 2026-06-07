import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daemon spawn", () => {
  it("spawns a detached daemon with local token and waits for readiness", async () => {
    const { spawnSessionDaemon, mocks, child } = await loadSpawnWithMocks();

    await expect(
      spawnSessionDaemon(
        {
          session: "default",
          host: "localhost",
          port: 25565,
          username: "AgentBot",
          auth: "offline",
          version: "1.20.4",
          detach: true,
        },
        "entry.js",
      ),
    ).resolves.toEqual(expect.objectContaining({ controlPort: expect.any(Number) }));

    expect(mocks.mkdir).toHaveBeenCalledWith("C:\\state", { recursive: true });
    expect(mocks.openSync).toHaveBeenCalledWith("C:\\state\\default.log", "a");
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
});
