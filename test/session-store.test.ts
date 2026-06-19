import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  getStateDir,
  isProcessAlive,
  listSessions,
  readSession,
  removeSession,
  sessionFilePath,
  SessionRecord,
  toPublicSession,
  writeSession,
} from "../src/session/store.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "mc-agent-session-"));
  tempDirs.push(dir);
  return dir;
}

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    session: "default",
    pid: process.pid,
    controlPort: 30123,
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
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("session store", () => {
  it("writes, reads, lists, and removes session records without exposing tokens publicly", async () => {
    const dir = await makeTempDir();
    const saved = record();
    const second = record({ session: "another" });

    await writeSession(saved, dir);
    await writeSession(second, dir);

    const stored = await readSession("default", dir);
    expect(stored?.token).toBe(saved.token);
    expect((await listSessions(dir)).map((item) => item.session)).toEqual(["another", "default"]);

    const publicRecord = toPublicSession(stored!);
    expect(publicRecord).not.toHaveProperty("token");
    expect(JSON.stringify(publicRecord)).not.toContain(saved.token);
    expect(publicRecord.alive).toBe(true);

    await removeSession("default", dir);
    expect(await readSession("default", dir)).toBeUndefined();
  });

  it("rejects traversal-shaped session names before resolving paths", async () => {
    const dir = await makeTempDir();

    expect(() => sessionFilePath("../outside", dir)).toThrow(/Session names/);
    expect(() => sessionFilePath("nested/name", dir)).toThrow(/Session names/);
    await expect(writeSession(record({ session: ".." }), dir)).rejects.toThrow(/Session names/);
  });

  it("uses private permissions for local session state files", async () => {
    const dir = await makeTempDir();
    await chmod(dir, 0o777);

    const saved = record({ session: "safe_name-1" });
    await writeSession(saved, dir);

    const file = sessionFilePath(saved.session, dir);
    const fileMode = (await stat(file)).mode & 0o777;
    const raw = await readFile(file, "utf8");

    expect(JSON.parse(raw)).toMatchObject({ session: "safe_name-1", token: saved.token });
    if (process.platform !== "win32") {
      expect(fileMode).toBe(0o600);
    }
  });

  it("removes stale sessions when their pid is no longer alive", async () => {
    const dir = await makeTempDir();

    await writeSession(record({ pid: 999_999 }), dir);

    await expect(readSession("default", dir, () => false)).resolves.toBeUndefined();
    await expect(stat(sessionFilePath("default", dir))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(listSessions(dir, () => false)).resolves.toEqual([]);
  });

  it("rejects missing or weak local control tokens", async () => {
    const dir = await makeTempDir();

    await expect(writeSession(record({ token: "" }), dir)).rejects.toThrow(/token/i);
    await expect(writeSession(record({ token: "x" }), dir)).rejects.toThrow(/token/i);
  });

  it("covers state defaults, token validation, and process liveness branches", () => {
    const previous = process.env.MC_AGENT_STATE_DIR;
    delete process.env.MC_AGENT_STATE_DIR;
    expect(getStateDir()).toContain(".minecraft-agent");
    process.env.MC_AGENT_STATE_DIR = "custom-state";
    expect(getStateDir()).toBe("custom-state");
    if (previous === undefined) {
      delete process.env.MC_AGENT_STATE_DIR;
    } else {
      process.env.MC_AGENT_STATE_DIR = previous;
    }

    expect(() => createSessionToken(31)).toThrow(/32 random bytes/);
    expect(isProcessAlive(0)).toBe(false);

    const kill = vi.spyOn(process, "kill").mockImplementation((() => {
      const error = new Error("permission") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    }) as typeof process.kill);
    expect(isProcessAlive(123)).toBe(true);
    kill.mockImplementation((() => {
      const error = new Error("missing") as NodeJS.ErrnoException;
      error.code = "ESRCH";
      throw error;
    }) as typeof process.kill);
    expect(isProcessAlive(123)).toBe(false);
    kill.mockRestore();
  });

  it("surfaces corrupt session files and state directory read errors", async () => {
    const dir = await makeTempDir();
    const file = sessionFilePath("bad", dir);
    await writeSession(record({ session: "bad" }), dir);
    await writeFile(file, "{not json");

    await expect(readSession("bad", dir)).rejects.toThrow();
    await expect(listSessions(file)).rejects.toThrow();
  });

  it("returns an empty list for a missing state directory", async () => {
    const dir = join(await makeTempDir(), "missing");
    await expect(listSessions(dir)).resolves.toEqual([]);
  });
});
