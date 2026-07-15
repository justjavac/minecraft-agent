import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const preflightScript = fileURLToPath(new URL("../skills/minecraft/scripts/mc-agent-preflight.mjs", import.meta.url));

async function createFakeCli(payload: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mc agent preflight-"));
  tempDirs.push(dir);
  const script = join(dir, "fake-mc-agent.mjs");
  await writeFile(script, `process.stdout.write(${JSON.stringify(`${JSON.stringify(payload)}\n`)});\n`);

  if (process.platform === "win32") {
    const command = join(dir, "fake-mc-agent.cmd");
    await writeFile(command, `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
    return command;
  }

  const command = join(dir, "fake-mc-agent");
  await writeFile(command, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`);
  await chmod(command, 0o755);
  return command;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("minecraft skill preflight", () => {
  it("reads connected and spawned state from the session status envelope", async () => {
    const fakeCli = await createFakeCli({
      ok: true,
      data: {
        session: "default",
        username: "AgentBot",
        status: { connected: true, spawned: true, lastEventId: 42 },
      },
    });

    const result = spawnSync(process.execPath, [preflightScript, "--session", "default", "--bin", fakeCli], { encoding: "utf8" });
    expect(result.status, JSON.stringify({ stdout: result.stdout, stderr: result.stderr, error: result.error?.message })).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      connected: true,
      spawned: true,
      username: "AgentBot",
      lastEventId: 42,
      next: expect.stringContaining("--since 42"),
    });
  });

  it("does not mark a connected but unspawned bot as ready", async () => {
    const fakeCli = await createFakeCli({
      ok: true,
      data: { session: "default", status: { connected: true, spawned: false, lastEventId: 7 } },
    });

    const result = spawnSync(process.execPath, [preflightScript, "--session", "default", "--bin", fakeCli], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, connected: true, spawned: false, lastEventId: 7 });
  });

  it("does not mark a legacy status without spawned state as ready", async () => {
    const fakeCli = await createFakeCli({
      ok: true,
      data: { session: "default", status: { connected: true, lastEventId: 9 } },
    });

    const result = spawnSync(process.execPath, [preflightScript, "--session", "default", "--bin", fakeCli], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, connected: true, lastEventId: 9 });
  });
});
