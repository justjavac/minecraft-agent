import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDaemon } from "../src/daemon/server.js";

const TOKEN_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOKEN_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TOKEN_C = "cccccccccccccccccccccccccccccccc";

class FakeBot extends EventEmitter {
  username = "AgentBot";
  entity = { position: { x: 1, y: 2, z: 3 } };
  game = { dimension: "overworld" };
  health = 20;
  food = 20;
  inventory = { items: () => [{ name: "dirt", displayName: "Dirt", count: 2, slot: 36 }] };
  chat = vi.fn();
  quit = vi.fn();
  setControlState = vi.fn();
  lookAt = vi.fn();
}

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "mc-agent-daemon-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  delete process.env.MC_AGENT_STATE_DIR;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("daemon server", () => {
  it("serves status and stored chat events over authorized local HTTP", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 32180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "test",
      controlPort: port,
      token: TOKEN_A,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    fakeBot.emit("login");
    fakeBot.emit("chat", "Steve", "hello", undefined, { text: "hello" });

    const status = await fetch(`http://127.0.0.1:${port}/status`, { headers: { Authorization: `Bearer ${TOKEN_A}` } });
    expect(status.ok).toBe(true);
    expect(await status.json()).toMatchObject({ connected: true, username: "AgentBot", lastEventId: 2 });

    const events = await fetch(`http://127.0.0.1:${port}/events?since=0&limit=10`, {
      headers: { Authorization: `Bearer ${TOKEN_A}` },
    });
    expect(await events.json()).toMatchObject({
      events: [expect.objectContaining({ type: "login" }), expect.objectContaining({ type: "chat", sender: "Steve", text: "hello" })],
    });

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_A}` } });
  });

  it("streams watch events as NDJSON", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 33180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "watch",
      controlPort: port,
      token: TOKEN_B,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    const response = await fetch(`http://127.0.0.1:${port}/watch?since=0`, {
      headers: { Authorization: `Bearer ${TOKEN_B}` },
    });
    const reader = response.body!.getReader();
    fakeBot.emit("chat", "Alex", "ping", undefined, { text: "ping" });

    const { value } = await reader.read();
    const line = Buffer.from(value!).toString("utf8").trim();
    expect(JSON.parse(line)).toMatchObject({ type: "chat", sender: "Alex", text: "ping" });
    await reader.cancel();
    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_B}` } });
  });

  it("supports chat, position, inventory, control tap, and look at endpoints", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 34180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "actions",
      controlPort: port,
      token: TOKEN_C,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(fakeBot.chat).toHaveBeenCalledWith("hello");

    const position = await fetch(`http://127.0.0.1:${port}/bot/position`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await position.json()).toMatchObject({ position: { x: 1, y: 2, z: 3 }, dimension: "overworld" });

    const inventory = await fetch(`http://127.0.0.1:${port}/bot/inventory`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await inventory.json()).toMatchObject({ items: [expect.objectContaining({ name: "dirt", count: 2 })] });

    await fetch(`http://127.0.0.1:${port}/control/tap`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state: "forward", durationMs: 1 }),
    });
    expect(fakeBot.setControlState).toHaveBeenCalledWith("forward", true);
    expect(fakeBot.setControlState).toHaveBeenCalledWith("forward", false);

    await fetch(`http://127.0.0.1:${port}/look/at`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 4, y: 5, z: 6 }),
    });
    expect(fakeBot.lookAt).toHaveBeenCalledWith(expect.objectContaining({ x: 4, y: 5, z: 6 }));

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_C}` } });
  });
});
