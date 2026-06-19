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
    await handlers.sendWhisper({ session: "default", username: "Steve", message: "hi" });
    await handlers.tabComplete({ session: "default", text: "/gi", assumeCommand: true, sendBlockInSight: false, timeout: 1000 });
    await handlers.botPosition({ session: "default" });
    await handlers.botInventory({ session: "default" });
    await handlers.botPlayers({ session: "default" });
    await handlers.botEntities({ session: "default", radius: 16, limit: 5 });
    await handlers.botTablist({ session: "default" });
    await handlers.botScoreboards({ session: "default" });
    await handlers.botTeams({ session: "default" });
    await handlers.botControls({ session: "default" });
    await handlers.controlTap({ session: "default", state: "forward", durationMs: 500 });
    await handlers.controlSet({ session: "default", state: "sprint", value: true });
    await handlers.controlClear({ session: "default" });
    await handlers.lookAt({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.look({ session: "default", yaw: 1, pitch: 0.5, force: true });
    await handlers.worldBlock({ session: "default", x: 4, y: 5, z: 6 });
    await handlers.worldBlockInfo({ session: "default", x: 4, y: 5, z: 6 });
    await handlers.worldBlockInSight({ session: "default", maxSteps: 256, vectorLength: 5 });
    await handlers.worldBlockAtCursor({ session: "default", maxDistance: 5 });
    await handlers.worldFindBlocks({ session: "default", name: "oak log", radius: 12, count: 2 });
    await handlers.navigateGoto({ session: "default", x: 7, y: 8, z: 9, range: 2 });
    await handlers.navigateFollow({ session: "default", player: "Steve", range: 3 });
    await handlers.navigateStop({ session: "default" });
    await handlers.navigateStatus({ session: "default" });
    await handlers.navigateConfigure({ session: "default", allowDig: false, searchRadius: 32 });
    await handlers.collectItem({ session: "default", id: 10, range: 1 });
    await handlers.inventoryEquip({ session: "default", item: "dirt", destination: "hand" });
    await handlers.inventoryUnequip({ session: "default", destination: "hand" });
    await handlers.inventoryQuickBar({ session: "default", slot: 2 });
    await handlers.inventoryToss({ session: "default", item: "dirt", count: 1 });
    await handlers.inventoryConsume({ session: "default" });
    await handlers.inventoryFish({ session: "default" });
    await handlers.inventoryActivateItem({ session: "default", offhand: false });
    await handlers.inventoryDeactivateItem({ session: "default" });
    await handlers.inventoryRecipes({ session: "default", item: "stick", count: 1 });
    await handlers.inventoryCraft({ session: "default", item: "stick", count: 1, tableX: 1, tableY: 2, tableZ: 3 });
    await handlers.worldDig({ session: "default", x: 10, y: 11, z: 12 });
    await handlers.worldStopDigging({ session: "default" });
    await handlers.worldPlace({ session: "default", x: 13, y: 14, z: 15, face: "up", item: "dirt" });
    await handlers.worldPlaceEntity({ session: "default", x: 13, y: 14, z: 15, face: "up", item: "oak_boat" });
    await handlers.worldActivate({ session: "default", x: 16, y: 17, z: 18 });
    await handlers.worldUpdateSign({ session: "default", x: 1, y: 2, z: 3, text: "hello", back: false });
    await handlers.worldSleep({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.worldWake({ session: "default" });
    await handlers.worldElytraFly({ session: "default" });
    await handlers.buildPlaceLine({ session: "default", fromX: 1, fromY: 2, fromZ: 3, toX: 3, toY: 2, toZ: 3, face: "up", item: "dirt", maxBlocks: 10 });
    await handlers.buildPlaceCuboidShell({ session: "default", fromX: 1, fromY: 2, fromZ: 3, toX: 2, toY: 3, toZ: 4, face: "up", item: "dirt", maxBlocks: 20 });
    await handlers.mineDigLine({ session: "default", fromX: 1, fromY: 2, fromZ: 3, toX: 1, toY: 4, toZ: 3, maxBlocks: 10 });
    await handlers.mineDigCuboid({ session: "default", fromX: 1, fromY: 2, fromZ: 3, toX: 2, toY: 3, toZ: 4, shell: false, maxBlocks: 20 });
    await handlers.cropInspect({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.cropPlant({ session: "default", x: 1, y: 2, z: 3, item: "wheat_seeds" });
    await handlers.cropHarvest({ session: "default", x: 1, y: 3, z: 3, onlyMature: true, replantItem: "wheat_seeds" });
    await handlers.cropFindMature({ session: "default", name: "wheat", radius: 16, count: 5 });
    await handlers.windowOpenBlock({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.windowOpenEntity({ session: "default", id: 10 });
    await handlers.windowStatus({ session: "default" });
    await handlers.windowDeposit({ session: "default", item: "dirt", count: 1 });
    await handlers.windowWithdraw({ session: "default", item: "dirt", count: 1 });
    await handlers.windowClose({ session: "default" });
    await handlers.chestOpenBlock({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.chestOpenEntity({ session: "default", id: 10 });
    await handlers.chestStatus({ session: "default" });
    await handlers.chestDeposit({ session: "default", item: "dirt", count: 1 });
    await handlers.chestWithdraw({ session: "default", item: "dirt", count: 1 });
    await handlers.chestClose({ session: "default" });
    await handlers.furnaceOpen({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.furnaceStatus({ session: "default" });
    await handlers.furnacePutInput({ session: "default", item: "dirt", count: 1 });
    await handlers.furnacePutFuel({ session: "default", item: "coal", count: 1 });
    await handlers.furnaceTakeOutput({ session: "default" });
    await handlers.anvilRename({ session: "default", x: 1, y: 2, z: 3, item: "iron_sword", name: "Sharp" });
    await handlers.anvilCombine({ session: "default", x: 1, y: 2, z: 3, firstItem: "iron_sword", secondItem: "enchanted_book", name: "Sharper" });
    await handlers.enchantOpen({ session: "default", x: 1, y: 2, z: 3 });
    await handlers.enchantStatus({ session: "default" });
    await handlers.enchantPutTarget({ session: "default", item: "iron_sword" });
    await handlers.enchantPutLapis({ session: "default", item: "lapis_lazuli" });
    await handlers.enchant({ session: "default", choice: 0 });
    await handlers.enchantTakeTarget({ session: "default" });
    await handlers.villagerOpen({ session: "default", id: 10 });
    await handlers.villagerStatus({ session: "default" });
    await handlers.villagerTrade({ session: "default", index: 0, times: 1 });
    await handlers.entityFind({ session: "default", name: "zombie", radius: 16, limit: 5, includePlayers: false, includePassive: false });
    await handlers.entityActivate({ session: "default", id: 10 });
    await handlers.entityUseOn({ session: "default", id: 10 });
    await handlers.entityAttack({ session: "default", id: 10, allowPlayers: false, allowPassive: true });
    await handlers.entitySwingArm({ session: "default", hand: "right", showHand: true });
    await handlers.entityMount({ session: "default", id: 10 });
    await handlers.entityDismount({ session: "default" });
    await handlers.entityMoveVehicle({ session: "default", left: 0.5, forward: 1 });
    await handlers.combatTargets({ session: "default", type: "mob", radius: 16, limit: 5, includePlayers: false, includePassive: false });
    await handlers.combatAttackNearest({ session: "default", name: "zombie", radius: 16, allowPlayers: false, allowPassive: false });

    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/status");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/stop", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/events?since=3&limit=10");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/chat", { method: "POST", body: JSON.stringify({ message: "hello" }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/chat/whisper", { method: "POST", body: JSON.stringify({ username: "Steve", message: "hi" }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/chat/tab-complete", {
      method: "POST",
      body: JSON.stringify({ text: "/gi", assumeCommand: true, sendBlockInSight: false, timeout: 1000 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/position");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/inventory");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/players");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/entities?radius=16&limit=5");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/tablist");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/scoreboards");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/teams");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/bot/controls");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/control/tap", {
      method: "POST",
      body: JSON.stringify({ state: "forward", durationMs: 500 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/control/set", {
      method: "POST",
      body: JSON.stringify({ state: "sprint", value: true }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/control/clear", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/look/at", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/look/yaw-pitch", {
      method: "POST",
      body: JSON.stringify({ yaw: 1, pitch: 0.5, force: true }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/block?x=4&y=5&z=6");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/block-info?x=4&y=5&z=6");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/block-in-sight?maxSteps=256&vectorLength=5");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/block-at-cursor?maxDistance=5");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/find-blocks?name=oak%20log&radius=12&count=2");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/navigate/goto", {
      method: "POST",
      body: JSON.stringify({ x: 7, y: 8, z: 9, range: 2 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/navigate/follow", {
      method: "POST",
      body: JSON.stringify({ player: "Steve", range: 3 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/navigate/stop", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/navigate/status");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/navigate/configure", {
      method: "POST",
      body: JSON.stringify({
        allowDig: false,
        allowSprinting: undefined,
        allowParkour: undefined,
        canOpenDoors: undefined,
        maxDropDown: undefined,
        searchRadius: 32,
        thinkTimeout: undefined,
        tickTimeout: undefined,
      }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/collect/item", {
      method: "POST",
      body: JSON.stringify({ id: 10, range: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/equip", {
      method: "POST",
      body: JSON.stringify({ item: "dirt", destination: "hand" }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/unequip", {
      method: "POST",
      body: JSON.stringify({ destination: "hand" }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/quickbar", {
      method: "POST",
      body: JSON.stringify({ slot: 2 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/toss", {
      method: "POST",
      body: JSON.stringify({ item: "dirt", count: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/consume", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/fish", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/activate-item", {
      method: "POST",
      body: JSON.stringify({ offhand: false }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/deactivate-item", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/recipes?item=stick&count=1");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/inventory/craft", {
      method: "POST",
      body: JSON.stringify({ item: "stick", count: 1, table: { x: 1, y: 2, z: 3 } }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/dig", {
      method: "POST",
      body: JSON.stringify({ x: 10, y: 11, z: 12 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/stop-digging", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/place", {
      method: "POST",
      body: JSON.stringify({ x: 13, y: 14, z: 15, face: "up", item: "dirt" }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/place-entity", {
      method: "POST",
      body: JSON.stringify({ x: 13, y: 14, z: 15, face: "up", item: "oak_boat" }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/activate", {
      method: "POST",
      body: JSON.stringify({ x: 16, y: 17, z: 18 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/update-sign", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3, text: "hello", back: false }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/sleep", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/wake", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/world/elytra-fly", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/build/place-line", {
      method: "POST",
      body: JSON.stringify({ from: { x: 1, y: 2, z: 3 }, to: { x: 3, y: 2, z: 3 }, face: "up", item: "dirt", maxBlocks: 10 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/mine/dig-cuboid", {
      method: "POST",
      body: JSON.stringify({ from: { x: 1, y: 2, z: 3 }, to: { x: 2, y: 3, z: 4 }, shell: false, maxBlocks: 20 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/crop/find-mature?name=wheat&radius=16&count=5");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/open-block", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/open-entity", {
      method: "POST",
      body: JSON.stringify({ id: 10 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/status");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/deposit", {
      method: "POST",
      body: JSON.stringify({ item: "dirt", count: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/withdraw", {
      method: "POST",
      body: JSON.stringify({ item: "dirt", count: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/window/close", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/chest/open-block", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/furnace/put-fuel", {
      method: "POST",
      body: JSON.stringify({ item: "coal", count: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/anvil/rename", {
      method: "POST",
      body: JSON.stringify({ x: 1, y: 2, z: 3, item: "iron_sword", name: "Sharp" }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/enchant/enchant", {
      method: "POST",
      body: JSON.stringify({ choice: 0 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/villager/trade", {
      method: "POST",
      body: JSON.stringify({ index: 0, times: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/find?radius=16&limit=5&includePlayers=false&includePassive=false&name=zombie");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/activate", { method: "POST", body: JSON.stringify({ id: 10 }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/use-on", { method: "POST", body: JSON.stringify({ id: 10 }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/attack", {
      method: "POST",
      body: JSON.stringify({ id: 10, allowPlayers: false, allowPassive: true }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/swing-arm", {
      method: "POST",
      body: JSON.stringify({ hand: "right", showHand: true }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/mount", { method: "POST", body: JSON.stringify({ id: 10 }) });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/dismount", { method: "POST", body: "{}" });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/entity/move-vehicle", {
      method: "POST",
      body: JSON.stringify({ left: 0.5, forward: 1 }),
    });
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/combat/targets?radius=16&limit=5&includePlayers=false&includePassive=false&type=mob");
    expect(mocks.daemonRequest).toHaveBeenCalledWith(record, "/combat/attack-nearest", {
      method: "POST",
      body: JSON.stringify({ name: "zombie", type: undefined, radius: 16, allowPlayers: false, allowPassive: false }),
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
