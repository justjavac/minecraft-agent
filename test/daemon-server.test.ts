import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Vec3 } from "vec3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDaemon } from "../src/daemon/server.js";

const TOKEN_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOKEN_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TOKEN_C = "cccccccccccccccccccccccccccccccc";

class FakeBot extends EventEmitter {
  username = "AgentBot";
  entity = { position: { x: 1, y: 2, z: 3 } };
  entities = { "12": { id: 12, name: "cow", type: "mob", position: { x: 3, y: 2, z: 3 } } };
  players = { Steve: { username: "Steve", entity: { id: 13, username: "Steve", type: "player", position: { x: 4, y: 2, z: 3 } } } };
  game = { dimension: "overworld" };
  health = 20;
  food = 20;
  heldItem = { name: "dirt", displayName: "Dirt" };
  inventory = { items: () => [{ name: "dirt", displayName: "Dirt", count: 2, slot: 36 }] };
  registry = { blocksByName: { dirt: { id: 3 } } };
  currentWindow = {
    id: 1,
    type: "minecraft:chest",
    containerItems: () => [{ name: "dirt", displayName: "Dirt", count: 2, slot: 0 }],
    close: vi.fn(),
  };
  chat = vi.fn();
  quit = vi.fn();
  setControlState = vi.fn();
  lookAt = vi.fn();
  blockAt = vi.fn((position: Vec3) => ({ name: "dirt", displayName: "Dirt", type: 3, position }));
  findBlocks = vi.fn(() => [new Vec3(1, 2, 3)]);
  equip = vi.fn();
  dig = vi.fn();
  placeBlock = vi.fn();
  activateBlock = vi.fn();
  openContainer = vi.fn(async () => this.currentWindow);
  clickWindow = vi.fn();
  pathfinder = {
    setMovements: vi.fn(),
    goto: vi.fn(),
    setGoal: vi.fn(),
    stop: vi.fn(),
    isMoving: vi.fn(() => true),
    isMining: vi.fn(() => false),
    isBuilding: vi.fn(() => false),
  };
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
  it("rejects unauthorized requests, unknown routes, and handler errors", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 35180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "errors",
      controlPort: port,
      token: TOKEN_A,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    const unauthorized = await fetch(`http://127.0.0.1:${port}/status`);
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({ error: "unauthorized" });

    const missing = await fetch(`http://127.0.0.1:${port}/missing`, { headers: { Authorization: `Bearer ${TOKEN_A}` } });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not found" });

    fakeBot.chat.mockImplementationOnce(() => {
      throw new Error("chat failed");
    });
    const failed = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_A}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({
      error: "chat failed",
      code: "DAEMON_ERROR",
      remediation: expect.stringContaining("daemon log"),
    });

    fakeBot.chat.mockImplementationOnce(() => {
      throw "string failure";
    });
    const stringFailure = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_A}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(await stringFailure.json()).toMatchObject({ error: "string failure", code: "DAEMON_ERROR" });

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_A}` } });
  });

  it("uses default event query parameters and exits on stop by default", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 36180 + Math.floor(Math.random() * 1000);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined as never) as typeof process.exit);

    await runDaemon({
      session: "exit-default",
      controlPort: port,
      token: TOKEN_B,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
    });
    fakeBot.emit("chat", "Steve", "hello", undefined, { text: "hello" });

    const events = await fetch(`http://127.0.0.1:${port}/events`, { headers: { Authorization: `Bearer ${TOKEN_B}` } });
    expect(await events.json()).toMatchObject({ events: [expect.objectContaining({ text: "hello" })] });

    const stop = await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_B}` } });
    await stop.text();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(exit).toHaveBeenCalledWith(0);
    exit.mockRestore();
  });

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

    Object.assign(fakeBot, { experience: { level: 1n }, time: { age: 2n } });
    fakeBot.emit("login");
    fakeBot.emit("chat", "Steve", "hello", undefined, { text: "hello", big: 3n });

    const status = await fetch(`http://127.0.0.1:${port}/status`, { headers: { Authorization: `Bearer ${TOKEN_A}` } });
    expect(status.ok).toBe(true);
    expect(await status.json()).toMatchObject({
      connected: true,
      username: "AgentBot",
      experience: { level: "1" },
      time: { age: "2" },
      lastEventId: 2,
    });

    const events = await fetch(`http://127.0.0.1:${port}/events?since=0&limit=10`, {
      headers: { Authorization: `Bearer ${TOKEN_A}` },
    });
    expect(await events.json()).toMatchObject({
      events: [
        expect.objectContaining({ type: "login" }),
        expect.objectContaining({ type: "chat", sender: "Steve", text: "hello", raw: { jsonMsg: { text: "hello", big: "3" } } }),
      ],
    });

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_A}` } });
  });

  it("filters stored events before applying the response limit", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    const port = 37180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "filtered-events",
      controlPort: port,
      token: TOKEN_A,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    fakeBot.emit("entityMoved", fakeBot.entities["12"]);
    fakeBot.emit("chat", "Alex", "keep", undefined, { text: "keep" });
    fakeBot.emit("whisper", "Alex", "also keep", undefined, { text: "also keep" });

    const events = await fetch(`http://127.0.0.1:${port}/events?since=0&limit=1&type=chat&type=whisper`, {
      headers: { Authorization: `Bearer ${TOKEN_A}` },
    });
    expect(await events.json()).toMatchObject({
      events: [expect.objectContaining({ type: "chat", text: "keep" })],
      lastEventId: 3,
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
    fakeBot.emit("entityMoved", fakeBot.entities["12"]);
    fakeBot.emit("chat", "Alex", "old", undefined, { text: "old" });

    const response = await fetch(`http://127.0.0.1:${port}/watch?type=chat`, {
      headers: { Authorization: `Bearer ${TOKEN_B}` },
    });
    const reader = response.body!.getReader();

    const { value } = await reader.read();
    const line = Buffer.from(value!).toString("utf8").trim();
    expect(JSON.parse(line)).toMatchObject({ type: "chat", sender: "Alex", text: "old" });
    fakeBot.emit("entityMoved", fakeBot.entities["12"]);
    fakeBot.emit("chat", "Alex", "ping", undefined, { text: "ping" });
    const next = await reader.read();
    expect(JSON.parse(Buffer.from(next.value!).toString("utf8").trim())).toMatchObject({ text: "ping" });
    await reader.cancel();
    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_B}` } });
  });

  it("returns structured navigation failures", async () => {
    const dir = await makeTempDir();
    process.env.MC_AGENT_STATE_DIR = dir;
    const fakeBot = new FakeBot();
    fakeBot.pathfinder.goto.mockRejectedValueOnce(new Error("Took to long to decide path to goal!"));
    const port = 38180 + Math.floor(Math.random() * 1000);

    await runDaemon({
      session: "navigation-failure",
      controlPort: port,
      token: TOKEN_C,
      host: "localhost",
      port: 25565,
      username: "AgentBot",
      auth: "offline",
      createBotFn: () => fakeBot,
      exitOnStop: false,
    });

    const failed = await fetch(`http://127.0.0.1:${port}/navigate/goto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 10, y: 64, z: 10, range: 2 }),
    });

    expect(failed.status).toBe(409);
    expect(await failed.json()).toMatchObject({
      error: "Took to long to decide path to goal!",
      code: "NAVIGATION_FAILED",
      remediation: expect.stringContaining("closer reachable goal"),
    });

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_C}` } });
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

    await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}` },
    });
    expect(fakeBot.chat).toHaveBeenCalledWith("");

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

    const players = await fetch(`http://127.0.0.1:${port}/bot/players`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await players.json()).toMatchObject({ players: [expect.objectContaining({ username: "Steve", distance: 3 })] });

    const entities = await fetch(`http://127.0.0.1:${port}/bot/entities?radius=10&limit=5`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await entities.json()).toMatchObject({ entities: [expect.objectContaining({ name: "cow", distance: 2 })] });

    const block = await fetch(`http://127.0.0.1:${port}/world/block?x=7&y=8&z=9`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await block.json()).toMatchObject({ block: { name: "dirt", position: { x: 7, y: 8, z: 9 } } });

    const found = await fetch(`http://127.0.0.1:${port}/world/find-blocks?name=dirt&radius=16&count=2`, {
      headers: { Authorization: `Bearer ${TOKEN_C}` },
    });
    expect(await found.json()).toMatchObject({ blocks: [{ name: "dirt", position: { x: 1, y: 2, z: 3 } }] });

    await fetch(`http://127.0.0.1:${port}/navigate/goto`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 10, y: 64, z: 10, range: 2 }),
    });
    expect(fakeBot.pathfinder.goto).toHaveBeenCalledWith(expect.objectContaining({ x: 10, y: 64, z: 10 }));

    const follow = await fetch(`http://127.0.0.1:${port}/navigate/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ player: "Steve", range: 3 }),
    });
    expect(await follow.json()).toMatchObject({ following: "Steve", range: 3 });
    expect(fakeBot.pathfinder.setGoal).toHaveBeenCalledWith(expect.objectContaining({ entity: fakeBot.players.Steve.entity }), true);

    const navigateStatus = await fetch(`http://127.0.0.1:${port}/navigate/status`, { headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(await navigateStatus.json()).toEqual({ moving: true, mining: false, building: false });

    await fetch(`http://127.0.0.1:${port}/navigate/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_C}` } });
    expect(fakeBot.pathfinder.stop).toHaveBeenCalled();

    await fetch(`http://127.0.0.1:${port}/inventory/equip`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ item: "dirt", destination: "hand" }),
    });
    expect(fakeBot.equip).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), "hand");

    await fetch(`http://127.0.0.1:${port}/world/dig`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(fakeBot.dig).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), true);

    await fetch(`http://127.0.0.1:${port}/world/place`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 1, y: 2, z: 3, face: "up", item: "dirt" }),
    });
    expect(fakeBot.placeBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), expect.objectContaining({ x: 0, y: 1, z: 0 }));

    await fetch(`http://127.0.0.1:${port}/world/activate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(fakeBot.activateBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }));

    const opened = await fetch(`http://127.0.0.1:${port}/window/open-block`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(await opened.json()).toMatchObject({ opened: true, window: { id: 1, items: [expect.objectContaining({ name: "dirt" })] } });

    const clicked = await fetch(`http://127.0.0.1:${port}/window/click`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN_C}`, "Content-Type": "application/json" },
      body: JSON.stringify({ slot: 5, mouseButton: 1, mode: 0 }),
    });
    expect(await clicked.json()).toMatchObject({ clicked: true, slot: 5, mouseButton: 1, mode: 0 });
    expect(fakeBot.clickWindow).toHaveBeenCalledWith(5, 1, 0);

    await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN_C}` } });
  });
});
