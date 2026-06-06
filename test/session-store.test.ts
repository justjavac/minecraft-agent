import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
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

    await writeSession(saved, dir);

    const stored = await readSession("default", dir);
    expect(stored?.token).toBe(saved.token);
    expect(await listSessions(dir)).toHaveLength(1);

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
});
