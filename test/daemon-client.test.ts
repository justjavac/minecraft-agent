import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { daemonRequest, loadSessionForClient } from "../src/daemon/client.js";
import { CliError } from "../src/output/errors.js";
import { createSessionToken, SessionRecord, writeSession } from "../src/session/store.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "mc-agent-client-"));
  tempDirs.push(dir);
  return dir;
}

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    session: "default",
    pid: process.pid,
    controlPort: 39123,
    token: createSessionToken(),
    host: "localhost",
    port: 25565,
    username: "AgentBot",
    auth: "offline",
    startedAt: "2026-06-06T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.MC_AGENT_STATE_DIR;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("daemon client", () => {
  it("loads an existing session or throws SESSION_NOT_FOUND", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const saved = record({ session: "loaded" });
    await writeSession(saved, dir);

    await expect(loadSessionForClient("loaded")).resolves.toMatchObject({ session: "loaded", token: saved.token });
    await expect(loadSessionForClient("missing")).rejects.toMatchObject({ code: "SESSION_NOT_FOUND", exitCode: 4 });
  });

  it("sends authorized local daemon requests and parses JSON responses", async () => {
    const saved = record({ controlPort: 39234, token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ connected: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(daemonRequest(saved, "/status", { method: "GET", headers: { "X-Test": "1" } })).resolves.toEqual({
      connected: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:39234/status", {
      method: "GET",
      headers: {
        Authorization: "Bearer aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "Content-Type": "application/json",
        "X-Test": "1",
      },
    });
  });

  it("maps daemon HTTP failures to CliError", async () => {
    const saved = record({ token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "boom" }), { status: 500 })));

    const request = daemonRequest(saved, "/status");
    await expect(request).rejects.toBeInstanceOf(CliError);
    await expect(request).rejects.toMatchObject({
      code: "DAEMON_ERROR",
      message: "boom",
      exitCode: 1,
    });
  });

  it("handles empty success bodies and fallback daemon error messages", async () => {
    const saved = record({ token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("", { status: 200 })));
    await expect(daemonRequest(saved, "/empty")).resolves.toEqual({});

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })));
    await expect(daemonRequest(saved, "/down")).rejects.toMatchObject({
      code: "DAEMON_ERROR",
      message: "Daemon returned HTTP 503.",
    });
  });
});
