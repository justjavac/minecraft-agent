import { EventEmitter } from "node:events";
import { Vec3 } from "vec3";
import { describe, expect, it, vi } from "vitest";
import { EventStore } from "../src/core/events.js";
import { BotController } from "../src/daemon/bot.js";

class FakeBot extends EventEmitter {
  username: string | undefined = "AgentBot";
  entity = { position: { x: 1, y: 2, z: 3 } };
  entities = {
    "10": { id: 10, name: "cow", type: "mob", position: { x: 3, y: 2, z: 3 } },
  };
  players = {
    Steve: { username: "Steve", entity: { id: 11, username: "Steve", type: "player", position: { x: 4, y: 2, z: 3 } } },
  };
  tablist = { header: "Welcome", footer: "Bye" };
  scoreboards = { main: { name: "main" } };
  scoreboard = { sidebar: { name: "main" } };
  teams = { red: { name: "red" } };
  teamMap = { Steve: "red" };
  game = { dimension: "overworld" };
  health = 20;
  food = 20;
  quickBarSlot = 0;
  controlState = { forward: false };
  heldItem = { name: "dirt", displayName: "Dirt" };
  inventory = {
    items: () => [
      { name: "dirt", displayName: "Dirt", count: 2, slot: 36 },
      { name: "coal", displayName: "Coal", count: 2, slot: 37 },
      { name: "lapis_lazuli", displayName: "Lapis Lazuli", count: 3, slot: 38 },
      { name: "iron_sword", displayName: "Iron Sword", count: 1, slot: 39 },
    ],
  };
  registry = {
    blocksByName: { dirt: { id: 3 }, wheat: { id: 59 } },
    itemsByName: { dirt: { id: 3 }, stick: { id: 280 }, coal: { id: 263 }, lapis_lazuli: { id: 351 }, iron_sword: { id: 267 } },
  };
  currentWindow = {
    id: 1,
    type: "minecraft:chest",
    title: { toString: () => "Chest" },
    fuel: 10,
    progress: 5,
    containerItems: () => [{ name: "dirt", displayName: "Dirt", count: 4, slot: 0 }],
    deposit: vi.fn(),
    withdraw: vi.fn(),
    inputItem: vi.fn(() => ({ name: "dirt", displayName: "Dirt", count: 1, slot: 0 })),
    fuelItem: vi.fn(() => ({ name: "coal", displayName: "Coal", count: 1, slot: 1 })),
    outputItem: vi.fn(() => ({ name: "stick", displayName: "Stick", count: 1, slot: 2 })),
    putInput: vi.fn(),
    putFuel: vi.fn(),
    takeInput: vi.fn(async () => ({ name: "dirt", displayName: "Dirt", count: 1, slot: 0 })),
    takeFuel: vi.fn(async () => ({ name: "coal", displayName: "Coal", count: 1, slot: 1 })),
    takeOutput: vi.fn(async () => ({ name: "stick", displayName: "Stick", count: 1, slot: 2 })),
    enchantments: [{ level: 1, expected: { enchant: 1, level: 1 } }],
    targetItem: vi.fn(() => ({ name: "iron_sword", displayName: "Iron Sword", count: 1, slot: 36 })),
    putTargetItem: vi.fn(async (item) => item),
    putLapis: vi.fn(async (item) => item),
    enchant: vi.fn(async () => ({ name: "iron_sword", displayName: "Iron Sword", count: 1, slot: 36 })),
    takeTargetItem: vi.fn(async () => ({ name: "iron_sword", displayName: "Iron Sword", count: 1, slot: 36 })),
    trades: [{ inputItem1: { name: "dirt", count: 1, slot: 0 }, outputItem: { name: "stick", count: 1, slot: 1 }, tradeDisabled: false }],
    close: vi.fn(),
  };
  chat = vi.fn();
  whisper = vi.fn();
  tabComplete = vi.fn(async () => ["hello"]);
  quit = vi.fn();
  setControlState = vi.fn();
  clearControlStates = vi.fn();
  lookAt = vi.fn();
  look = vi.fn();
  blockAt = vi.fn((position: Vec3) =>
    position.x === 20
      ? { name: "wheat", displayName: "Wheat", type: 59, position, getProperties: () => ({ age: 7 }) }
      : { name: "dirt", displayName: "Dirt", type: 3, position },
  );
  blockInSight = vi.fn(() => ({ name: "dirt", displayName: "Dirt", type: 3, position: new Vec3(2, 2, 2) }));
  blockAtCursor = vi.fn(() => ({ name: "dirt", displayName: "Dirt", type: 3, position: new Vec3(3, 3, 3) }));
  canDigBlock = vi.fn(() => true);
  digTime = vi.fn(() => 250);
  findBlocks = vi.fn((options?: any) => (options?.matching === 59 ? [new Vec3(20, 64, 20)] : [new Vec3(1, 2, 3)]));
  equip = vi.fn();
  unequip = vi.fn();
  setQuickBarSlot = vi.fn();
  toss = vi.fn();
  consume = vi.fn();
  fish = vi.fn();
  activateItem = vi.fn();
  deactivateItem = vi.fn();
  recipesFor = vi.fn(() => [{ id: "recipe" }]);
  craft = vi.fn();
  openChest = vi.fn(async () => this.currentWindow);
  openFurnace = vi.fn(async () => this.currentWindow);
  openAnvil = vi.fn(async () => ({ rename: vi.fn(), combine: vi.fn() }));
  openEnchantmentTable = vi.fn(async () => this.currentWindow);
  openVillager = vi.fn(async () => this.currentWindow);
  trade = vi.fn();
  dig = vi.fn();
  stopDigging = vi.fn();
  placeBlock = vi.fn();
  placeEntity = vi.fn(async () => ({ id: 12, name: "boat", type: "object", position: { x: 1, y: 2, z: 3 } }));
  activateBlock = vi.fn();
  updateSign = vi.fn();
  sleep = vi.fn();
  wake = vi.fn();
  elytraFly = vi.fn();
  activateEntity = vi.fn();
  useOn = vi.fn();
  attack = vi.fn();
  swingArm = vi.fn();
  mount = vi.fn();
  dismount = vi.fn();
  moveVehicle = vi.fn();
  openContainer = vi.fn(async () => this.currentWindow);
  pathfinder = {
    searchRadius: -1,
    thinkTimeout: 5000,
    tickTimeout: 40,
    movements: { canDig: true, allowSprinting: true, allowParkour: true, canOpenDoors: false, maxDropDown: 4 } as never,
    setMovements: vi.fn(),
    goto: vi.fn(),
    setGoal: vi.fn(),
    stop: vi.fn(),
    isMoving: vi.fn(() => false),
    isMining: vi.fn(() => false),
    isBuilding: vi.fn(() => false),
  };
}

function controller() {
  const events = new EventStore();
  const bot = new FakeBot();
  const subject = new BotController(
    { host: "localhost", port: 25565, username: "AgentBot", auth: "offline" },
    events,
    () => bot,
  );
  subject.start();
  return { subject, bot, events };
}

describe("BotController", () => {
  it("records lifecycle and message events", () => {
    const { subject, bot, events } = controller();
    bot.emit("spawn");
    bot.emit("whisper", "Alex", "secret", undefined, { text: "secret" });
    bot.emit("message", { toString: () => "server says hi" }, "system", "Server");
    bot.emit("death");
    bot.emit("health");
    bot.emit("entitySpawn", bot.entities["10"]);
    bot.emit("itemDrop", bot.entities["10"]);
    bot.emit("blockUpdate", undefined, { name: "dirt", type: 3, position: new Vec3(1, 2, 3) });
    bot.emit("kicked", "bye");
    bot.emit("error", new Error("bad"));
    bot.emit("end");

    expect(subject.status()).toMatchObject({ connected: false, lastError: "bad", lastEventId: 11 });
    expect(events.list(0, 20)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "spawn" }),
        expect.objectContaining({ type: "whisper", sender: "Alex", text: "secret" }),
        expect.objectContaining({ type: "message", sender: "Server", text: "server says hi" }),
        expect.objectContaining({ type: "death" }),
        expect.objectContaining({ type: "health" }),
        expect.objectContaining({ type: "entitySpawn" }),
        expect.objectContaining({ type: "itemDrop" }),
        expect.objectContaining({ type: "blockUpdate" }),
        expect.objectContaining({ type: "kicked", text: "bye" }),
        expect.objectContaining({ type: "error", text: "bad" }),
        expect.objectContaining({ type: "end", text: "Connection ended." }),
      ]),
    );
  });

  it("throws when actions are used before start and quits when stopped", () => {
    const events = new EventStore();
    const subject = new BotController({ host: "localhost", port: 25565, username: "AgentBot", auth: "offline" }, events, () => new FakeBot());

    expect(() => subject.sendChat("hello")).toThrow("Bot is not started.");

    const { subject: started, bot } = controller();
    started.stop();
    expect(bot.quit).toHaveBeenCalledWith("mc-agent session stop");
  });

  it("handles missing optional bot fields and non-Error event payloads", () => {
    const events = new EventStore();
    const bot = new FakeBot();
    bot.username = undefined;
    const subject = new BotController(
      { host: "localhost", port: 25565, username: "FallbackBot", auth: "offline" },
      events,
      () => bot,
    );
    subject.start();
    bot.emit("error", "plain-error");
    bot.emit("message", undefined, "system", undefined);

    expect(subject.status()).toMatchObject({ username: "FallbackBot", lastError: "plain-error" });
    bot.entity = undefined as unknown as FakeBot["entity"];
    bot.game = undefined as unknown as FakeBot["game"];
    bot.inventory = undefined as unknown as FakeBot["inventory"];
    bot.heldItem = null as unknown as FakeBot["heldItem"];
    expect(subject.position()).toEqual({ position: undefined, dimension: undefined });
    expect(subject.inventory()).toMatchObject({ items: [] });
    expect(events.list(0, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "message", sender: undefined, text: "undefined" }),
        expect.objectContaining({ type: "error", text: "plain-error" }),
      ]),
    );
  });

  it("exposes world observations and pathfinding state", async () => {
    const { subject, bot } = controller();

    expect(subject.players()).toMatchObject({
      players: [expect.objectContaining({ username: "Steve", entityId: 11, distance: 3 })],
    });
    expect(subject.entities(10, 5)).toMatchObject({
      entities: [expect.objectContaining({ id: 10, name: "cow", distance: 2 })],
    });
    expect(subject.tablist()).toMatchObject({ tablist: { header: "Welcome" } });
    expect(subject.scoreboards()).toMatchObject({ scoreboards: { main: { name: "main" } } });
    expect(subject.teams()).toMatchObject({ teams: { red: { name: "red" } } });
    expect(subject.controls()).toEqual({ controlState: { forward: false } });
    expect(subject.blockAt(4, 5, 6)).toMatchObject({ block: { name: "dirt", position: { x: 4, y: 5, z: 6 } } });
    expect(subject.blockInfo(4, 5, 6)).toMatchObject({ canDig: true, digTimeMs: 250 });
    expect(subject.blockInSight(256, 5)).toMatchObject({ block: { name: "dirt", position: { x: 2, y: 2, z: 2 } } });
    expect(subject.blockAtCursor(5)).toMatchObject({ block: { name: "dirt", position: { x: 3, y: 3, z: 3 } } });
    expect(subject.findBlocks("dirt", 16, 3)).toMatchObject({ blocks: [{ name: "dirt", position: { x: 1, y: 2, z: 3 } }] });

    await subject.goto(10, 64, -2, 1);
    expect(bot.pathfinder.goto).toHaveBeenCalledWith(expect.objectContaining({ x: 10, y: 64, z: -2 }));

    expect(subject.follow("Steve", 2)).toMatchObject({ following: "Steve", range: 2, targetPosition: { x: 4, y: 2, z: 3 } });
    expect(bot.pathfinder.setGoal).toHaveBeenCalledWith(expect.objectContaining({ entity: bot.players.Steve.entity }), true);
    expect(subject.navigationStatus()).toEqual({ moving: false, mining: false, building: false });
    expect(subject.configureNavigation({ allowDig: false, searchRadius: 32 })).toMatchObject({
      configured: true,
      searchRadius: 32,
      movements: { canDig: false },
    });
    await expect(subject.collectItem(10, 1)).resolves.toMatchObject({ collectedTarget: { id: 10 } });
    expect(subject.stopNavigation()).toEqual({ stopped: true });
    expect(bot.pathfinder.stop).toHaveBeenCalled();
  });

  it("equips items and interacts with blocks", async () => {
    const { subject, bot } = controller();

    subject.sendWhisper("Steve", "hi");
    expect(bot.whisper).toHaveBeenCalledWith("Steve", "hi");
    await expect(subject.tabComplete("/gi", true, false, 1000)).resolves.toEqual({ matches: ["hello"] });
    subject.setControl("forward", true);
    expect(bot.setControlState).toHaveBeenCalledWith("forward", true);
    expect(subject.controls()).toEqual({ controlState: { forward: true } });
    expect(subject.clearControls()).toEqual({ cleared: true });
    expect(bot.clearControlStates).toHaveBeenCalled();
    expect(subject.controls()).toEqual({ controlState: { forward: false } });
    await subject.look(1, 0.5, true);
    expect(bot.look).toHaveBeenCalledWith(1, 0.5, true);

    await expect(subject.equip("dirt", "hand")).resolves.toMatchObject({ equipped: "dirt", destination: "hand" });
    expect(bot.equip).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), "hand");
    await expect(subject.unequip("hand")).resolves.toEqual({ unequipped: true, destination: "hand" });
    expect(subject.setQuickBarSlot(2)).toEqual({ quickBarSlot: 2 });
    expect(bot.setQuickBarSlot).toHaveBeenCalledWith(2);
    await expect(subject.toss("dirt", 1)).resolves.toEqual({ tossed: "dirt", count: 1 });
    expect(bot.toss).toHaveBeenCalledWith(3, null, 1);
    await expect(subject.consume()).resolves.toEqual({ consumed: true });
    bot.heldItem = { name: "fishing_rod", displayName: "Fishing Rod" };
    await expect(subject.fish()).resolves.toEqual({ fished: true });
    bot.heldItem = null as unknown as FakeBot["heldItem"];
    await expect(subject.consume()).rejects.toThrow("No held item is equipped to consume.");
    await expect(subject.fish()).rejects.toThrow("A fishing_rod must be equipped before fishing.");
    expect(subject.activateItem(false)).toEqual({ activated: true, offhand: false });
    expect(subject.deactivateItem()).toEqual({ deactivated: true });
    expect(subject.recipes("stick", 1)).toMatchObject({ item: "stick", recipes: [{ id: "recipe" }] });
    await expect(subject.craft("stick", 1)).resolves.toMatchObject({ crafted: "stick", count: 1, recipeIndex: 0, recipeId: "recipe" });
    await expect(subject.craft("stick", 1, undefined, 0)).resolves.toMatchObject({ recipeIndex: 0 });
    await expect(subject.craft("stick", 1, undefined, undefined, "recipe")).resolves.toMatchObject({ recipeId: "recipe" });

    await expect(subject.dig(1, 2, 3)).resolves.toMatchObject({ dug: true, block: { name: "dirt" } });
    expect(bot.dig).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), true);
    expect(subject.stopDigging()).toEqual({ stopped: true });

    await expect(subject.place(1, 2, 3, "east", "dirt")).resolves.toMatchObject({ placed: true, face: "east" });
    expect(bot.placeBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }), expect.objectContaining({ x: 1, y: 0, z: 0 }));
    await expect(subject.placeEntity(1, 2, 3, "up", "dirt")).resolves.toMatchObject({ placed: true, entity: { id: 12 } });
    await expect(
      subject.placeLine({ from: { x: 1, y: 2, z: 3 }, to: { x: 3, y: 2, z: 3 }, face: "up", item: "dirt", maxBlocks: 10 }),
    ).resolves.toMatchObject({ placed: 3 });
    await expect(
      subject.placeCuboidShell({ from: { x: 1, y: 2, z: 3 }, to: { x: 2, y: 3, z: 4 }, face: "up", item: "dirt", maxBlocks: 20 }),
    ).resolves.toMatchObject({ placed: 8 });

    await expect(subject.activate(1, 2, 3)).resolves.toMatchObject({ activated: true, block: { name: "dirt" } });
    expect(bot.activateBlock).toHaveBeenCalledWith(expect.objectContaining({ name: "dirt" }));
    expect(subject.updateSign(1, 2, 3, "hello", false)).toMatchObject({ updated: true });
    await expect(subject.sleep(1, 2, 3)).resolves.toMatchObject({ sleeping: true });
    await expect(subject.wake()).resolves.toEqual({ awake: true });
    await expect(subject.elytraFly()).resolves.toEqual({ flying: true });
    await expect(subject.digLine({ from: { x: 1, y: 2, z: 3 }, to: { x: 1, y: 4, z: 3 }, maxBlocks: 10 })).resolves.toMatchObject({ dug: 3 });
    await expect(subject.digCuboid({ from: { x: 1, y: 2, z: 3 }, to: { x: 2, y: 3, z: 4 }, shell: false, maxBlocks: 20 })).resolves.toMatchObject({
      dug: 8,
      shell: false,
    });
    expect(subject.inspectCrop(20, 64, 20)).toMatchObject({ crop: { age: 7, mature: true } });
    expect(subject.findMatureCrops("wheat", 32, 5)).toMatchObject({ crops: [expect.objectContaining({ mature: true })] });
    await expect(subject.plantCrop(1, 2, 3, "dirt")).resolves.toMatchObject({ planted: true });
    await expect(subject.harvestCrop(20, 64, 20, true, "dirt")).resolves.toMatchObject({ harvested: true, replantItem: "dirt" });

    await expect(subject.openWindowAt(1, 2, 3)).resolves.toMatchObject({ opened: true, window: { id: 1, items: [{ name: "dirt" }] } });
    await expect(subject.openEntityWindow(10)).resolves.toMatchObject({ opened: true, entity: { id: 10 }, window: { id: 1 } });
    expect(subject.windowStatus()).toMatchObject({ window: { id: 1, type: "minecraft:chest" } });
    await expect(subject.windowDeposit("dirt", 1)).resolves.toMatchObject({ deposited: "dirt", count: 1 });
    await expect(subject.windowWithdraw("dirt", 1)).resolves.toMatchObject({ withdrew: "dirt", count: 1 });
    expect(subject.closeWindow()).toEqual({ closed: true });
    await expect(subject.openChestAt(1, 2, 3)).resolves.toMatchObject({ opened: true, chest: { id: 1 } });
    await expect(subject.openEntityChest(10)).resolves.toMatchObject({ opened: true, chest: { id: 1 } });
    expect(subject.chestStatus()).toMatchObject({ chest: { id: 1 } });
    await expect(subject.openFurnaceAt(1, 2, 3)).resolves.toMatchObject({ opened: true, furnace: { fuel: 10, inputItem: { name: "dirt" } } });
    expect(subject.furnaceStatus()).toMatchObject({ furnace: { progress: 5, outputItem: { name: "stick" } } });
    await expect(subject.furnacePutInput("dirt", 1)).resolves.toMatchObject({ putInput: "dirt" });
    await expect(subject.furnacePutFuel("coal", 1)).resolves.toMatchObject({ putFuel: "coal" });
    await expect(subject.furnaceTake("output")).resolves.toMatchObject({ took: "output", item: { name: "stick" } });
    await expect(subject.anvilRename(1, 2, 3, "dirt", "Named Dirt")).resolves.toMatchObject({ renamed: "dirt", name: "Named Dirt" });
    await expect(subject.anvilCombine(1, 2, 3, "dirt", "coal")).resolves.toMatchObject({ combined: ["dirt", "coal"] });
    await expect(subject.openEnchantmentAt(1, 2, 3)).resolves.toMatchObject({ opened: true, enchantmentTable: { targetItem: { name: "iron_sword" } } });
    expect(subject.enchantmentStatus()).toMatchObject({ enchantmentTable: { enchantments: [expect.objectContaining({ level: 1 })] } });
    await expect(subject.enchantmentPutTarget("iron_sword")).resolves.toMatchObject({ putTarget: { name: "iron_sword" } });
    await expect(subject.enchantmentPutLapis("lapis_lazuli")).resolves.toMatchObject({ putLapis: { name: "lapis_lazuli" } });
    await expect(subject.enchant(0)).resolves.toMatchObject({ enchanted: { name: "iron_sword" } });
    await expect(subject.enchantmentTakeTarget()).resolves.toMatchObject({ tookTarget: { name: "iron_sword" } });
    await expect(subject.openVillagerWindow(10)).resolves.toMatchObject({ opened: true, villager: { trades: [expect.objectContaining({ index: 0 })] } });
    expect((subject.villagerStatus().villager?.trades as Array<{ outputItem?: { name?: string } }>)[0].outputItem?.name).toBe("stick");
    await expect(subject.villagerTrade(0, 1)).resolves.toMatchObject({ traded: true, index: 0, times: 1 });

    await expect(subject.activateEntity(10)).resolves.toMatchObject({ activated: true, entity: { id: 10 } });
    expect(subject.useOnEntity(10)).toMatchObject({ usedOn: true, entity: { id: 10 } });
    expect(subject.findEntities({ name: "cow", radius: 16, limit: 5, includePassive: true })).toMatchObject({ entities: [expect.objectContaining({ id: 10 })] });
    expect(() => subject.attackEntity(10)).toThrow("Refusing to attack a passive mob");
    expect(subject.attackEntity(10, { allowPassive: true })).toMatchObject({ attacked: true, entity: { id: 10 } });
    expect(subject.attackNearest({ name: "cow", radius: 16, allowPassive: true })).toMatchObject({ attacked: true, entity: { id: 10 } });
    expect(subject.swingArm("right", true)).toEqual({ swung: true, hand: "right", showHand: true });
    expect(subject.mountEntity(10)).toMatchObject({ mounted: true, entity: { id: 10 } });
    expect(subject.dismount()).toEqual({ dismounted: true });
    expect(subject.moveVehicle(0.5, 1)).toEqual({ moved: true, left: 0.5, forward: 1 });
  });
});
