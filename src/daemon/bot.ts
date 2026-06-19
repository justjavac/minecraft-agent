import { EventEmitter } from "node:events";
import { createBot } from "mineflayer";
import pathfinderPackage from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { EventStore } from "../core/events.js";

const { goals, Movements, pathfinder } = pathfinderPackage;

type PathfinderMovements = InstanceType<typeof Movements>;
type PathfinderGoal = InstanceType<(typeof goals)["GoalNear"]> | InstanceType<(typeof goals)["GoalFollow"]>;

export interface BotOptions {
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
}

type MineflayerBot = EventEmitter & {
  username?: string;
  entity?: { position?: { x: number; y: number; z: number } };
  entities?: Record<string, MineflayerEntity>;
  players?: Record<string, { username?: string; entity?: MineflayerEntity }>;
  tablist?: unknown;
  scoreboards?: Record<string, unknown>;
  scoreboard?: Record<string, unknown>;
  teams?: Record<string, unknown>;
  teamMap?: Record<string, unknown>;
  game?: { dimension?: string };
  health?: number;
  food?: number;
  foodSaturation?: number;
  oxygenLevel?: number;
  experience?: unknown;
  time?: unknown;
  isRaining?: boolean;
  thunderState?: number;
  quickBarSlot?: number;
  isSleeping?: boolean;
  usingHeldItem?: boolean;
  controlState?: Record<string, boolean>;
  heldItem?: { name: string; displayName?: string } | null;
  currentWindow?: MineflayerWindow | null;
  inventory?: { items(): MineflayerItem[] };
  registry?: { blocksByName?: Record<string, { id: number }>; blocksArray?: unknown[]; itemsByName?: Record<string, { id: number }> };
  world?: unknown;
  chat(message: string): void;
  whisper?(username: string, message: string): void;
  tabComplete?(text: string, assumeCommand?: boolean, sendBlockInSight?: boolean, timeout?: number): Promise<string[]>;
  quit(reason?: string): void;
  loadPlugin?(plugin: (bot: unknown) => void): void;
  setControlState(state: string, value: boolean): void;
  clearControlStates?(): void;
  lookAt(position: Vec3): Promise<void> | void;
  look?(yaw: number, pitch: number, force?: boolean): Promise<void>;
  blockAt?(position: Vec3): MineflayerBlock | null;
  blockInSight?(maxSteps: number, vectorLength: number): MineflayerBlock | null;
  blockAtCursor?(maxDistance?: number): MineflayerBlock | null;
  findBlock?(options: { matching: number | number[] | ((block: MineflayerBlock) => boolean); maxDistance: number }): MineflayerBlock | null;
  findBlocks?(options: { matching: number | number[] | ((block: MineflayerBlock) => boolean); maxDistance: number; count: number }): Vec3[];
  canDigBlock?(block: MineflayerBlock): boolean;
  digTime?(block: MineflayerBlock): number;
  equip?(item: MineflayerItem | number, destination: string | null): Promise<void>;
  unequip?(destination: string | null): Promise<void>;
  toss?(itemType: number, metadata: number | null, count: number | null): Promise<void>;
  consume?(): Promise<void>;
  fish?(): Promise<void>;
  activateItem?(offhand?: boolean): void;
  deactivateItem?(): void;
  dig?(block: MineflayerBlock, forceLook?: boolean | "ignore"): Promise<void>;
  stopDigging?(): void;
  placeBlock?(referenceBlock: MineflayerBlock, faceVector: Vec3): Promise<void>;
  placeEntity?(referenceBlock: MineflayerBlock, faceVector: Vec3): Promise<MineflayerEntity>;
  activateBlock?(block: MineflayerBlock): Promise<void>;
  updateSign?(block: MineflayerBlock, text: string, back?: boolean): void;
  activateEntity?(entity: MineflayerEntity): Promise<void>;
  useOn?(entity: MineflayerEntity): void;
  attack?(entity: MineflayerEntity): void;
  swingArm?(hand: "left" | "right" | undefined, showHand?: boolean): void;
  mount?(entity: MineflayerEntity): void;
  dismount?(): void;
  moveVehicle?(left: number, forward: number): void;
  setQuickBarSlot?(slot: number): void;
  sleep?(bedBlock: MineflayerBlock): Promise<void>;
  wake?(): Promise<void>;
  elytraFly?(): Promise<void>;
  recipesFor?(itemType: number, metadata: number | null, minResultCount: number | null, craftingTable: MineflayerBlock | boolean | null): unknown[];
  craft?(recipe: unknown, count?: number, craftingTable?: MineflayerBlock): Promise<void>;
  openChest?(chest: MineflayerBlock | MineflayerEntity, direction?: number, cursorPos?: Vec3): Promise<MineflayerWindow>;
  openFurnace?(furnace: MineflayerBlock): Promise<MineflayerFurnace>;
  openAnvil?(anvil: MineflayerBlock): Promise<MineflayerAnvil>;
  openEnchantmentTable?(enchantmentTable: MineflayerBlock): Promise<MineflayerEnchantmentTable>;
  openVillager?(villager: MineflayerEntity): Promise<MineflayerVillager>;
  trade?(villagerInstance: MineflayerVillager, tradeIndex: string | number, times?: number): Promise<void>;
  openContainer?(target: MineflayerBlock | MineflayerEntity, direction?: Vec3, cursorPos?: Vec3): Promise<MineflayerWindow>;
  closeWindow?(window: MineflayerWindow): void;
  pathfinder?: {
    thinkTimeout?: number;
    tickTimeout?: number;
    searchRadius?: number;
    readonly movements?: PathfinderMovements;
    setMovements(movements: PathfinderMovements): void;
    goto(goal: PathfinderGoal): Promise<void>;
    setGoal(goal: PathfinderGoal | null, dynamic?: boolean): void;
    stop(): void;
    isMoving(): boolean;
    isMining(): boolean;
    isBuilding(): boolean;
  };
};

export type CreateBotFn = (options: Record<string, unknown>) => MineflayerBot;

type MineflayerItem = { name: string; count: number; slot: number; displayName?: string };
type MineflayerBlock = {
  name: string;
  displayName?: string;
  type: number;
  stateId?: number;
  metadata?: number;
  position: Vec3;
  getProperties?(): Record<string, unknown>;
};
type MineflayerEntity = { id?: number; username?: string; name?: string; type?: string; position?: { x: number; y: number; z: number } };
type MineflayerWindow = {
  id?: number;
  type?: string;
  title?: unknown;
  inventoryStart?: number;
  inventoryEnd?: number;
  hotbarStart?: number;
  hotbarEnd?: number;
  close?(): void;
  deposit?(itemType: number, metadata: number | null, count: number | null): Promise<void>;
  withdraw?(itemType: number, metadata: number | null, count: number | null): Promise<void>;
  containerItems?(): MineflayerItem[];
  items?(): MineflayerItem[];
};
type MineflayerFurnace = MineflayerWindow & {
  fuel?: number;
  progress?: number;
  takeInput?(): Promise<MineflayerItem>;
  takeFuel?(): Promise<MineflayerItem>;
  takeOutput?(): Promise<MineflayerItem>;
  putInput?(itemType: number, metadata: number | null, count: number): Promise<void>;
  putFuel?(itemType: number, metadata: number | null, count: number): Promise<void>;
  inputItem?(): MineflayerItem | null;
  fuelItem?(): MineflayerItem | null;
  outputItem?(): MineflayerItem | null;
};
type MineflayerEnchantment = { level?: number; expected?: unknown };
type MineflayerEnchantmentTable = MineflayerWindow & {
  enchantments?: MineflayerEnchantment[];
  targetItem?(): MineflayerItem | null;
  enchant?(choice: string | number): Promise<MineflayerItem>;
  takeTargetItem?(): Promise<MineflayerItem>;
  putTargetItem?(item: MineflayerItem): Promise<MineflayerItem>;
  putLapis?(item: MineflayerItem): Promise<MineflayerItem>;
};
type MineflayerAnvil = {
  combine?(itemOne: MineflayerItem, itemTwo: MineflayerItem, name?: string): Promise<void>;
  rename?(item: MineflayerItem, name?: string): Promise<void>;
};
type MineflayerVillagerTrade = {
  inputItem1?: MineflayerItem;
  inputItem2?: MineflayerItem | null;
  outputItem?: MineflayerItem;
  hasItem2?: boolean;
  tradeDisabled?: boolean;
  nbTradeUses?: number;
  maximumNbTradeUses?: number;
  xp?: number;
  specialPrice?: number;
  priceMultiplier?: number;
  demand?: number;
  realPrice?: number;
};
type MineflayerVillager = MineflayerWindow & { trades?: MineflayerVillagerTrade[] };

const passiveEntityNames = new Set([
  "allay",
  "armadillo",
  "axolotl",
  "bat",
  "bee",
  "camel",
  "cat",
  "chicken",
  "cod",
  "cow",
  "donkey",
  "fox",
  "frog",
  "glow_squid",
  "goat",
  "horse",
  "llama",
  "mooshroom",
  "mule",
  "ocelot",
  "panda",
  "parrot",
  "pig",
  "rabbit",
  "salmon",
  "sheep",
  "squid",
  "strider",
  "tadpole",
  "tropical_fish",
  "turtle",
  "villager",
  "wandering_trader",
]);

const matureAges: Record<string, number> = {
  beetroots: 3,
  carrots: 7,
  nether_wart: 3,
  potatoes: 7,
  wheat: 7,
};

function distance(a?: { x: number; y: number; z: number }, b?: { x: number; y: number; z: number }): number | undefined {
  if (!a || !b) {
    return undefined;
  }
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function serializePosition(position?: { x: number; y: number; z: number }) {
  return position ? { x: position.x, y: position.y, z: position.z } : undefined;
}

function serializeItem(item: MineflayerItem | null | undefined) {
  return item ? { name: item.name, displayName: item.displayName, count: item.count, slot: item.slot } : undefined;
}

function serializeBlock(block: MineflayerBlock | null | undefined) {
  return block
    ? {
        name: block.name,
        displayName: block.displayName,
        type: block.type,
        stateId: block.stateId,
        metadata: block.metadata,
        properties: block.getProperties?.(),
        position: serializePosition(block.position),
      }
    : undefined;
}

function serializeEntity(entity: MineflayerEntity | null | undefined, origin?: { x: number; y: number; z: number }) {
  return entity
    ? {
        id: entity.id,
        name: entity.name,
        username: entity.username,
        type: entity.type,
        position: serializePosition(entity.position),
        distance: distance(origin, entity.position),
      }
    : undefined;
}

function safePlain(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (depth > 2) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => safePlain(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item !== "function") {
        output[key] = safePlain(item, depth + 1);
      }
    }
    return output;
  }
  return String(value);
}

function serializeWindow(window: MineflayerWindow | null | undefined) {
  if (!window) {
    return undefined;
  }
  const items = typeof window.containerItems === "function" ? window.containerItems() : typeof window.items === "function" ? window.items() : [];
  return {
    id: window.id,
    type: window.type,
    title: typeof window.title?.toString === "function" ? window.title.toString() : window.title,
    inventoryStart: window.inventoryStart,
    inventoryEnd: window.inventoryEnd,
    hotbarStart: window.hotbarStart,
    hotbarEnd: window.hotbarEnd,
    items: items.map(serializeItem),
  };
}

function serializeFurnace(furnace: MineflayerFurnace | null | undefined) {
  return furnace
    ? {
        ...serializeWindow(furnace),
        fuel: furnace.fuel,
        progress: furnace.progress,
        inputItem: serializeItem(furnace.inputItem?.()),
        fuelItem: serializeItem(furnace.fuelItem?.()),
        outputItem: serializeItem(furnace.outputItem?.()),
      }
    : undefined;
}

function serializeEnchantmentTable(table: MineflayerEnchantmentTable | null | undefined) {
  return table
    ? {
        ...serializeWindow(table),
        targetItem: serializeItem(table.targetItem?.()),
        enchantments: safePlain(table.enchantments ?? []),
      }
    : undefined;
}

function serializeTrade(trade: MineflayerVillagerTrade, index: number) {
  return {
    index,
    inputItem1: serializeItem(trade.inputItem1),
    inputItem2: serializeItem(trade.inputItem2),
    outputItem: serializeItem(trade.outputItem),
    hasItem2: trade.hasItem2,
    tradeDisabled: trade.tradeDisabled,
    nbTradeUses: trade.nbTradeUses,
    maximumNbTradeUses: trade.maximumNbTradeUses,
    xp: trade.xp,
    specialPrice: trade.specialPrice,
    priceMultiplier: trade.priceMultiplier,
    demand: trade.demand,
    realPrice: trade.realPrice,
  };
}

function serializeVillager(villager: MineflayerVillager | null | undefined) {
  return villager
    ? {
        ...serializeWindow(villager),
        trades: (villager.trades ?? []).map((trade, index) => serializeTrade(trade, index)),
      }
    : undefined;
}

function faceVector(face: string): Vec3 {
  switch (face) {
    case "down":
      return new Vec3(0, -1, 0);
    case "north":
      return new Vec3(0, 0, -1);
    case "south":
      return new Vec3(0, 0, 1);
    case "west":
      return new Vec3(-1, 0, 0);
    case "east":
      return new Vec3(1, 0, 0);
    case "up":
    default:
      return new Vec3(0, 1, 0);
  }
}

function axisAlignedLine(from: Vec3, to: Vec3): Vec3[] {
  const changed = [from.x !== to.x, from.y !== to.y, from.z !== to.z].filter(Boolean).length;
  if (changed > 1) {
    throw new Error("Line commands require an axis-aligned line.");
  }
  const step = new Vec3(Math.sign(to.x - from.x), Math.sign(to.y - from.y), Math.sign(to.z - from.z));
  const length = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), Math.abs(to.z - from.z));
  return Array.from({ length: length + 1 }, (_, index) => new Vec3(from.x + step.x * index, from.y + step.y * index, from.z + step.z * index));
}

function cuboidPositions(from: Vec3, to: Vec3, shellOnly: boolean): Vec3[] {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  const minZ = Math.min(from.z, to.z);
  const maxZ = Math.max(from.z, to.z);
  const positions: Vec3[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const boundary = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
        if (!shellOnly || boundary) {
          positions.push(new Vec3(x, y, z));
        }
      }
    }
  }
  return positions;
}

function recipeStringField(recipe: unknown, field: string): string | undefined {
  if (!recipe || typeof recipe !== "object") {
    return undefined;
  }
  const value = (recipe as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

export class BotController {
  private bot?: MineflayerBot;
  private connected = false;
  private lastError?: string;

  constructor(
    private readonly options: BotOptions,
    private readonly events: EventStore,
    private readonly createBotFn: CreateBotFn = createBot as unknown as CreateBotFn,
  ) {}

  start(): void {
    this.bot = this.createBotFn({
      host: this.options.host,
      port: this.options.port,
      username: this.options.username,
      auth: this.options.auth,
      version: this.options.version,
    });
    this.bot.loadPlugin?.(pathfinder as unknown as (bot: unknown) => void);
    this.configurePathfinderMovements();

    this.bot.on("login", () => {
      this.connected = true;
      this.events.add({ type: "login", text: "Bot logged in." });
    });
    this.bot.on("spawn", () => {
      this.connected = true;
      this.events.add({ type: "spawn", text: "Bot spawned." });
    });
    this.bot.on("end", (reason) => {
      this.connected = false;
      this.events.add({ type: "end", text: String(reason ?? "Connection ended."), raw: reason });
    });
    this.bot.on("kicked", (reason) => {
      this.connected = false;
      this.events.add({ type: "kicked", text: String(reason), raw: reason });
    });
    this.bot.on("error", (error) => {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.events.add({ type: "error", text: this.lastError, raw: this.lastError });
    });
    this.bot.on("death", () => {
      this.events.add({ type: "death", text: "Bot died." });
    });
    this.bot.on("health", () => {
      this.events.add({ type: "health", text: "Bot health changed.", raw: { health: this.bot?.health, food: this.bot?.food, foodSaturation: this.bot?.foodSaturation } });
    });
    this.bot.on("breath", () => {
      this.events.add({ type: "breath", text: "Bot oxygen changed.", raw: { oxygenLevel: this.bot?.oxygenLevel } });
    });
    this.bot.on("experience", () => {
      this.events.add({ type: "experience", text: "Bot experience changed.", raw: safePlain(this.bot?.experience) });
    });
    this.bot.on("rain", () => {
      this.events.add({ type: "rain", text: "Weather changed.", raw: { isRaining: this.bot?.isRaining, thunderState: this.bot?.thunderState } });
    });
    this.bot.on("time", () => {
      this.events.add({ type: "time", text: "World time changed.", raw: safePlain(this.bot?.time) });
    });
    this.bot.on("heldItemChanged", (item) => {
      this.events.add({ type: "heldItemChanged", text: "Held item changed.", raw: safePlain(item) });
    });
    this.bot.on("entitySpawn", (entity) => {
      this.events.add({ type: "entitySpawn", text: "Entity spawned.", raw: serializeEntity(entity, this.bot?.entity?.position) });
    });
    this.bot.on("entityGone", (entity) => {
      this.events.add({ type: "entityGone", text: "Entity left view.", raw: serializeEntity(entity, this.bot?.entity?.position) });
    });
    this.bot.on("entityMoved", (entity) => {
      this.events.add({ type: "entityMoved", text: "Entity moved.", raw: serializeEntity(entity, this.bot?.entity?.position) });
    });
    this.bot.on("itemDrop", (entity) => {
      this.events.add({ type: "itemDrop", text: "Item dropped.", raw: serializeEntity(entity, this.bot?.entity?.position) });
    });
    this.bot.on("playerCollect", (collector, collected) => {
      this.events.add({
        type: "playerCollect",
        text: "Entity collected item.",
        raw: { collector: serializeEntity(collector, this.bot?.entity?.position), collected: serializeEntity(collected, this.bot?.entity?.position) },
      });
    });
    this.bot.on("blockUpdate", (oldBlock, newBlock) => {
      this.events.add({ type: "blockUpdate", text: "Block updated.", raw: { oldBlock: serializeBlock(oldBlock), newBlock: serializeBlock(newBlock) } });
    });
    this.bot.on("windowOpen", (window) => {
      this.events.add({ type: "windowOpen", text: "Window opened.", raw: serializeWindow(window) });
    });
    this.bot.on("windowClose", (window) => {
      this.events.add({ type: "windowClose", text: "Window closed.", raw: serializeWindow(window) });
    });
    this.bot.on("scoreboardCreated", (scoreboard) => {
      this.events.add({ type: "scoreboardCreated", text: "Scoreboard created.", raw: safePlain(scoreboard) });
    });
    this.bot.on("scoreUpdated", (scoreboard, item) => {
      this.events.add({ type: "scoreUpdated", text: "Score updated.", raw: { scoreboard: safePlain(scoreboard), item } });
    });
    this.bot.on("teamCreated", (team) => {
      this.events.add({ type: "teamCreated", text: "Team created.", raw: safePlain(team) });
    });
    this.bot.on("teamUpdated", (team) => {
      this.events.add({ type: "teamUpdated", text: "Team updated.", raw: safePlain(team) });
    });
    this.bot.on("chat", (sender, text, translate, jsonMsg) => {
      this.events.add({ type: "chat", sender: String(sender), text: String(text), raw: { translate, jsonMsg } });
    });
    this.bot.on("whisper", (sender, text, translate, jsonMsg) => {
      this.events.add({ type: "whisper", sender: String(sender), text: String(text), raw: { translate, jsonMsg } });
    });
    this.bot.on("message", (jsonMsg, position, sender) => {
      const text = typeof jsonMsg?.toString === "function" ? jsonMsg.toString() : String(jsonMsg);
      this.events.add({ type: "message", sender: sender ? String(sender) : undefined, text, raw: { jsonMsg, position } });
    });
  }

  status() {
    return {
      connected: this.connected,
      username: this.bot?.username ?? this.options.username,
      host: this.options.host,
      port: this.options.port,
      auth: this.options.auth,
      version: this.options.version,
      health: this.bot?.health,
      food: this.bot?.food,
      foodSaturation: this.bot?.foodSaturation,
      oxygenLevel: this.bot?.oxygenLevel,
      experience: this.bot?.experience,
      time: this.bot?.time,
      isRaining: this.bot?.isRaining,
      thunderState: this.bot?.thunderState,
      quickBarSlot: this.bot?.quickBarSlot,
      isSleeping: this.bot?.isSleeping,
      usingHeldItem: this.bot?.usingHeldItem,
      heldItem: this.bot?.heldItem ? { name: this.bot.heldItem.name, displayName: this.bot.heldItem.displayName } : undefined,
      controlState: this.bot?.controlState,
      lastError: this.lastError,
      lastEventId: this.events.getLastEventId(),
    };
  }

  sendChat(message: string): void {
    this.requireBot().chat(message);
  }

  sendWhisper(username: string, message: string): void {
    this.requireMethod("whisper").call(this.requireBot(), username, message);
  }

  async tabComplete(text: string, assumeCommand: boolean, sendBlockInSight: boolean, timeout: number) {
    const matches = await this.requireMethod("tabComplete").call(this.requireBot(), text, assumeCommand, sendBlockInSight, timeout);
    return { matches };
  }

  position() {
    const position = this.requireBot().entity?.position;
    return {
      position: position ? { x: position.x, y: position.y, z: position.z } : undefined,
      dimension: this.bot?.game?.dimension,
    };
  }

  inventory() {
    const bot = this.requireBot();
    return {
      items: bot
        .inventory?.items()
        .map((item) => ({ name: item.name, displayName: item.displayName, count: item.count, slot: item.slot })) ?? [],
      heldItem: bot.heldItem ? { name: bot.heldItem.name, displayName: bot.heldItem.displayName } : undefined,
      quickBarSlot: bot.quickBarSlot,
    };
  }

  players() {
    const bot = this.requireBot();
    const origin = bot.entity?.position;
    return {
      players: Object.entries(bot.players ?? {}).map(([username, player]) => ({
        username: player.username ?? username,
        entityId: player.entity?.id,
        position: serializePosition(player.entity?.position),
        distance: distance(origin, player.entity?.position),
      })),
    };
  }

  entities(radius = 32, limit = 50) {
    const bot = this.requireBot();
    const origin = bot.entity?.position;
    const entities = Object.values(bot.entities ?? {})
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
        username: entity.username,
        type: entity.type,
        position: serializePosition(entity.position),
        distance: distance(origin, entity.position),
      }))
      .filter((entity) => entity.distance === undefined || entity.distance <= radius)
      .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY))
      .slice(0, limit);
    return { entities };
  }

  findEntities(input: {
    name?: string;
    type?: string;
    radius?: number;
    limit?: number;
    includePlayers?: boolean;
    includePassive?: boolean;
  }) {
    const bot = this.requireBot();
    const origin = bot.entity?.position;
    const radius = input.radius ?? 32;
    const limit = input.limit ?? 50;
    const entities = Object.values(bot.entities ?? {})
      .filter((entity) => !input.name || entity.name === input.name || entity.username === input.name)
      .filter((entity) => !input.type || entity.type === input.type)
      .filter((entity) => input.includePlayers || !this.isPlayerEntity(entity))
      .filter((entity) => input.includePassive || !this.isPassiveEntity(entity))
      .map((entity) => serializeEntity(entity, origin))
      .filter((entity) => entity && (entity.distance === undefined || entity.distance <= radius))
      .sort((a, b) => (a?.distance ?? Number.POSITIVE_INFINITY) - (b?.distance ?? Number.POSITIVE_INFINITY))
      .slice(0, limit);
    return { entities };
  }

  tablist() {
    return { tablist: safePlain(this.requireBot().tablist) };
  }

  scoreboards() {
    const bot = this.requireBot();
    return { scoreboards: safePlain(bot.scoreboards), scoreboard: safePlain(bot.scoreboard) };
  }

  teams() {
    const bot = this.requireBot();
    return { teams: safePlain(bot.teams), teamMap: safePlain(bot.teamMap) };
  }

  controls() {
    return { controlState: safePlain(this.requireBot().controlState) };
  }

  blockAt(x: number, y: number, z: number) {
    const block = this.requireMethod("blockAt").call(this.requireBot(), new Vec3(x, y, z)) as MineflayerBlock | null;
    return { block: serializeBlock(block) };
  }

  blockInSight(maxSteps: number, vectorLength: number) {
    const block = this.requireMethod("blockInSight").call(this.requireBot(), maxSteps, vectorLength) as MineflayerBlock | null;
    return { block: serializeBlock(block) };
  }

  blockAtCursor(maxDistance: number) {
    const block = this.requireMethod("blockAtCursor").call(this.requireBot(), maxDistance) as MineflayerBlock | null;
    return { block: serializeBlock(block) };
  }

  findBlocks(name: string, radius: number, count: number) {
    const bot = this.requireBot();
    const blockType = this.blockType(name);
    const positions = this.requireMethod("findBlocks").call(bot, { matching: blockType, maxDistance: radius, count }) as Vec3[];
    return {
      blocks: positions.map((position) => ({ name, position: serializePosition(position) })),
    };
  }

  blockInfo(x: number, y: number, z: number) {
    const bot = this.requireBot();
    const block = this.getRequiredBlock(x, y, z);
    return {
      block: serializeBlock(block),
      canDig: bot.canDigBlock?.(block),
      digTimeMs: bot.digTime?.(block),
    };
  }

  async tap(state: string, durationMs: number): Promise<void> {
    const bot = this.requireBot();
    bot.setControlState(state, true);
    try {
      await new Promise((resolve) => setTimeout(resolve, durationMs));
    } finally {
      bot.setControlState(state, false);
    }
  }

  setControl(state: string, value: boolean) {
    this.requireBot().setControlState(state, value);
    return { state, value };
  }

  clearControls() {
    this.requireMethod("clearControlStates").call(this.requireBot());
    return { cleared: true };
  }

  async lookAt(x: number, y: number, z: number): Promise<void> {
    await this.requireBot().lookAt(new Vec3(x, y, z));
  }

  async look(yaw: number, pitch: number, force: boolean): Promise<{ looked: true; yaw: number; pitch: number; force: boolean }> {
    await this.requireMethod("look").call(this.requireBot(), yaw, pitch, force);
    return { looked: true, yaw, pitch, force };
  }

  async goto(x: number, y: number, z: number, range: number): Promise<void> {
    this.configurePathfinderMovements();
    await this.requirePathfinder().goto(new goals.GoalNear(x, y, z, range));
  }

  follow(player: string, range: number): { following: string; range: number; targetPosition?: { x: number; y: number; z: number } } {
    const bot = this.requireBot();
    const target = bot.players?.[player]?.entity;
    if (!target) {
      throw new Error(`Player '${player}' is not visible.`);
    }
    this.configurePathfinderMovements();
    this.requirePathfinder().setGoal(new goals.GoalFollow(target as never, range), true);
    return { following: player, range, targetPosition: serializePosition(target.position) };
  }

  stopNavigation() {
    const pathfinder = this.requirePathfinder();
    pathfinder.setGoal(null);
    pathfinder.stop();
    return { stopped: true };
  }

  navigationStatus() {
    const pathfinder = this.requirePathfinder();
    return {
      moving: pathfinder.isMoving(),
      mining: pathfinder.isMining(),
      building: pathfinder.isBuilding(),
    };
  }

  configureNavigation(input: {
    allowDig?: boolean;
    allowSprinting?: boolean;
    allowParkour?: boolean;
    canOpenDoors?: boolean;
    maxDropDown?: number;
    searchRadius?: number;
    thinkTimeout?: number;
    tickTimeout?: number;
  }) {
    const pathfinder = this.requirePathfinder();
    this.configurePathfinderMovements();
    const movements = pathfinder.movements;
    if (movements) {
      if (input.allowDig !== undefined) movements.canDig = input.allowDig;
      if (input.allowSprinting !== undefined) movements.allowSprinting = input.allowSprinting;
      if (input.allowParkour !== undefined) movements.allowParkour = input.allowParkour;
      if (input.canOpenDoors !== undefined) movements.canOpenDoors = input.canOpenDoors;
      if (input.maxDropDown !== undefined) movements.maxDropDown = input.maxDropDown;
      pathfinder.setMovements(movements);
    }
    if (input.searchRadius !== undefined) pathfinder.searchRadius = input.searchRadius;
    if (input.thinkTimeout !== undefined) pathfinder.thinkTimeout = input.thinkTimeout;
    if (input.tickTimeout !== undefined) pathfinder.tickTimeout = input.tickTimeout;
    return {
      configured: true,
      searchRadius: pathfinder.searchRadius,
      thinkTimeout: pathfinder.thinkTimeout,
      tickTimeout: pathfinder.tickTimeout,
      movements: movements
        ? {
            canDig: movements.canDig,
            allowSprinting: movements.allowSprinting,
            allowParkour: movements.allowParkour,
            canOpenDoors: movements.canOpenDoors,
            maxDropDown: movements.maxDropDown,
          }
        : undefined,
    };
  }

  async collectItem(id: number, range: number) {
    const entity = this.getRequiredEntity(id);
    const position = entity.position;
    if (!position) {
      throw new Error(`Entity '${id}' has no position.`);
    }
    this.configurePathfinderMovements();
    await this.requirePathfinder().goto(new goals.GoalNear(position.x, position.y, position.z, range));
    return { collectedTarget: serializeEntity(entity, this.requireBot().entity?.position), inventory: this.inventory() };
  }

  async equip(itemName: string, destination: string): Promise<{ equipped: string; destination: string; heldItem?: { name: string; displayName?: string } }> {
    const bot = this.requireBot();
    const item = bot.inventory?.items().find((candidate) => candidate.name === itemName || candidate.displayName === itemName);
    if (!item) {
      throw new Error(`Item '${itemName}' is not in inventory.`);
    }
    await this.requireMethod("equip").call(bot, item, destination);
    return { equipped: item.name, destination, heldItem: bot.heldItem ? { name: bot.heldItem.name, displayName: bot.heldItem.displayName } : undefined };
  }

  async unequip(destination: string): Promise<{ unequipped: true; destination: string }> {
    await this.requireMethod("unequip").call(this.requireBot(), destination);
    return { unequipped: true, destination };
  }

  setQuickBarSlot(slot: number) {
    this.requireMethod("setQuickBarSlot").call(this.requireBot(), slot);
    return { quickBarSlot: slot };
  }

  async toss(itemName: string, count: number): Promise<{ tossed: string; count: number }> {
    const itemType = this.itemType(itemName);
    await this.requireMethod("toss").call(this.requireBot(), itemType, null, count);
    return { tossed: itemName, count };
  }

  async consume(): Promise<{ consumed: true }> {
    await this.requireMethod("consume").call(this.requireBot());
    return { consumed: true };
  }

  async fish(): Promise<{ fished: true }> {
    await this.requireMethod("fish").call(this.requireBot());
    return { fished: true };
  }

  activateItem(offhand: boolean) {
    this.requireMethod("activateItem").call(this.requireBot(), offhand);
    return { activated: true, offhand };
  }

  deactivateItem() {
    this.requireMethod("deactivateItem").call(this.requireBot());
    return { deactivated: true };
  }

  recipes(itemName: string, count: number, table?: { x: number; y: number; z: number }) {
    const itemType = this.itemType(itemName);
    const craftingTable = table ? this.getRequiredBlock(table.x, table.y, table.z) : null;
    const recipes = this.requireMethod("recipesFor").call(this.requireBot(), itemType, null, count, craftingTable) as unknown[];
    return { item: itemName, recipes };
  }

  async craft(
    itemName: string,
    count: number,
    table?: { x: number; y: number; z: number },
    recipeIndex?: number,
    recipeId?: string,
  ): Promise<{ crafted: string; count: number; recipeIndex: number; recipeId?: string }> {
    const itemType = this.itemType(itemName);
    const craftingTable = table ? this.getRequiredBlock(table.x, table.y, table.z) : undefined;
    const recipes = this.requireMethod("recipesFor").call(this.requireBot(), itemType, null, count, craftingTable ?? null) as unknown[];
    const selected = this.selectRecipe(recipes, recipeIndex, recipeId);
    const recipe = recipes[selected.index];
    if (!recipe) {
      throw new Error(`No recipe found for '${itemName}'.`);
    }
    await this.requireMethod("craft").call(this.requireBot(), recipe, count, craftingTable);
    return { crafted: itemName, count, recipeIndex: selected.index, recipeId: selected.id };
  }

  async dig(x: number, y: number, z: number): Promise<{ dug: true; block: ReturnType<typeof serializeBlock> }> {
    const block = this.getRequiredBlock(x, y, z);
    await this.requireMethod("dig").call(this.requireBot(), block, true);
    return { dug: true, block: serializeBlock(block) };
  }

  stopDigging() {
    this.requireMethod("stopDigging").call(this.requireBot());
    return { stopped: true };
  }

  async place(x: number, y: number, z: number, face: string, itemName?: string): Promise<{ placed: true; referenceBlock: ReturnType<typeof serializeBlock>; face: string }> {
    if (itemName) {
      await this.equip(itemName, "hand");
    }
    const block = this.getRequiredBlock(x, y, z);
    await this.requireMethod("placeBlock").call(this.requireBot(), block, faceVector(face));
    return { placed: true, referenceBlock: serializeBlock(block), face };
  }

  async placeLine(input: {
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    face: string;
    item?: string;
    maxBlocks: number;
  }) {
    const positions = axisAlignedLine(new Vec3(input.from.x, input.from.y, input.from.z), new Vec3(input.to.x, input.to.y, input.to.z));
    this.requireMaxBlocks(positions.length, input.maxBlocks);
    if (input.item) {
      await this.equip(input.item, "hand");
    }
    const placed = [];
    for (const position of positions) {
      const block = this.getRequiredBlock(position.x, position.y, position.z);
      await this.requireMethod("placeBlock").call(this.requireBot(), block, faceVector(input.face));
      placed.push(serializePosition(position));
    }
    return { placed: placed.length, face: input.face, item: input.item, positions: placed };
  }

  async placeCuboidShell(input: {
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    face: string;
    item?: string;
    maxBlocks: number;
  }) {
    const positions = cuboidPositions(new Vec3(input.from.x, input.from.y, input.from.z), new Vec3(input.to.x, input.to.y, input.to.z), true);
    this.requireMaxBlocks(positions.length, input.maxBlocks);
    if (input.item) {
      await this.equip(input.item, "hand");
    }
    const placed = [];
    for (const position of positions) {
      const block = this.getRequiredBlock(position.x, position.y, position.z);
      await this.requireMethod("placeBlock").call(this.requireBot(), block, faceVector(input.face));
      placed.push(serializePosition(position));
    }
    return { placed: placed.length, face: input.face, item: input.item, positions: placed };
  }

  async placeEntity(x: number, y: number, z: number, face: string, itemName?: string) {
    if (itemName) {
      await this.equip(itemName, "hand");
    }
    const block = this.getRequiredBlock(x, y, z);
    const entity = await this.requireMethod("placeEntity").call(this.requireBot(), block, faceVector(face));
    return { placed: true, entity: serializeEntity(entity), referenceBlock: serializeBlock(block), face };
  }

  async activate(x: number, y: number, z: number): Promise<{ activated: true; block: ReturnType<typeof serializeBlock> }> {
    const block = this.getRequiredBlock(x, y, z);
    await this.requireMethod("activateBlock").call(this.requireBot(), block);
    return { activated: true, block: serializeBlock(block) };
  }

  updateSign(x: number, y: number, z: number, text: string, back: boolean) {
    const block = this.getRequiredBlock(x, y, z);
    this.requireMethod("updateSign").call(this.requireBot(), block, text, back);
    return { updated: true, block: serializeBlock(block), back };
  }

  async sleep(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    await this.requireMethod("sleep").call(this.requireBot(), block);
    return { sleeping: true, block: serializeBlock(block) };
  }

  async wake() {
    await this.requireMethod("wake").call(this.requireBot());
    return { awake: true };
  }

  async elytraFly() {
    await this.requireMethod("elytraFly").call(this.requireBot());
    return { flying: true };
  }

  async digLine(input: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; maxBlocks: number }) {
    const positions = axisAlignedLine(new Vec3(input.from.x, input.from.y, input.from.z), new Vec3(input.to.x, input.to.y, input.to.z));
    this.requireMaxBlocks(positions.length, input.maxBlocks);
    const dug = [];
    for (const position of positions) {
      const block = this.getRequiredBlock(position.x, position.y, position.z);
      await this.requireMethod("dig").call(this.requireBot(), block, true);
      dug.push(serializeBlock(block));
    }
    return { dug: dug.length, blocks: dug };
  }

  async digCuboid(input: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; shell: boolean; maxBlocks: number }) {
    const positions = cuboidPositions(new Vec3(input.from.x, input.from.y, input.from.z), new Vec3(input.to.x, input.to.y, input.to.z), input.shell);
    this.requireMaxBlocks(positions.length, input.maxBlocks);
    const dug = [];
    for (const position of positions) {
      const block = this.getRequiredBlock(position.x, position.y, position.z);
      await this.requireMethod("dig").call(this.requireBot(), block, true);
      dug.push(serializeBlock(block));
    }
    return { dug: dug.length, shell: input.shell, blocks: dug };
  }

  inspectCrop(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    return { crop: this.cropState(block) };
  }

  async plantCrop(x: number, y: number, z: number, itemName: string) {
    await this.equip(itemName, "hand");
    const block = this.getRequiredBlock(x, y, z);
    await this.requireMethod("placeBlock").call(this.requireBot(), block, faceVector("up"));
    return { planted: true, item: itemName, referenceBlock: serializeBlock(block) };
  }

  async harvestCrop(x: number, y: number, z: number, onlyMature: boolean, replantItem?: string) {
    const block = this.getRequiredBlock(x, y, z);
    const crop = this.cropState(block);
    if (onlyMature && crop.mature !== true) {
      return { harvested: false, reason: "crop is not mature", crop };
    }
    await this.requireMethod("dig").call(this.requireBot(), block, true);
    if (replantItem) {
      await this.plantCrop(x, y - 1, z, replantItem);
    }
    return { harvested: true, crop, replantItem };
  }

  findMatureCrops(name: string, radius: number, count: number) {
    const blockType = this.blockType(name);
    const positions = this.requireMethod("findBlocks").call(this.requireBot(), { matching: blockType, maxDistance: radius, count: count * 4 }) as Vec3[];
    const crops = positions
      .map((position) => this.requireMethod("blockAt").call(this.requireBot(), position) as MineflayerBlock | null)
      .filter((block): block is MineflayerBlock => Boolean(block))
      .map((block) => this.cropState(block))
      .filter((crop) => crop.mature === true)
      .slice(0, count);
    return { crops };
  }

  async openWindowAt(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    const window = await this.requireMethod("openContainer").call(this.requireBot(), block);
    return { opened: true, block: serializeBlock(block), window: serializeWindow(window) };
  }

  async openEntityWindow(id: number) {
    const entity = this.getRequiredEntity(id);
    const window = await this.requireMethod("openContainer").call(this.requireBot(), entity);
    return { opened: true, entity: serializeEntity(entity, this.requireBot().entity?.position), window: serializeWindow(window) };
  }

  async openChestAt(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    const window = await this.requireMethod("openChest").call(this.requireBot(), block);
    return { opened: true, block: serializeBlock(block), chest: serializeWindow(window) };
  }

  async openEntityChest(id: number) {
    const entity = this.getRequiredEntity(id);
    const window = await this.requireMethod("openChest").call(this.requireBot(), entity);
    return { opened: true, entity: serializeEntity(entity, this.requireBot().entity?.position), chest: serializeWindow(window) };
  }

  chestStatus() {
    return { chest: serializeWindow(this.requireBot().currentWindow) };
  }

  async openFurnaceAt(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    const furnace = await this.requireMethod("openFurnace").call(this.requireBot(), block);
    return { opened: true, block: serializeBlock(block), furnace: serializeFurnace(furnace) };
  }

  furnaceStatus() {
    return { furnace: serializeFurnace(this.requireFurnace()) };
  }

  async furnacePutInput(itemName: string, count: number) {
    const furnace = this.requireFurnace();
    if (!furnace.putInput) {
      throw new Error("Current furnace does not support putInput.");
    }
    await furnace.putInput(this.itemType(itemName), null, count);
    return { putInput: itemName, count, furnace: serializeFurnace(furnace) };
  }

  async furnacePutFuel(itemName: string, count: number) {
    const furnace = this.requireFurnace();
    if (!furnace.putFuel) {
      throw new Error("Current furnace does not support putFuel.");
    }
    await furnace.putFuel(this.itemType(itemName), null, count);
    return { putFuel: itemName, count, furnace: serializeFurnace(furnace) };
  }

  async furnaceTake(slot: "input" | "fuel" | "output") {
    const furnace = this.requireFurnace();
    const method = slot === "input" ? furnace.takeInput : slot === "fuel" ? furnace.takeFuel : furnace.takeOutput;
    if (!method) {
      throw new Error(`Current furnace does not support take ${slot}.`);
    }
    const item = await method.call(furnace);
    return { took: slot, item: serializeItem(item), furnace: serializeFurnace(furnace) };
  }

  async anvilRename(x: number, y: number, z: number, itemName: string, name: string) {
    const anvil = await this.openRequiredAnvil(x, y, z);
    const item = this.findInventoryItem(itemName);
    if (!anvil.rename) {
      throw new Error("Anvil does not support rename.");
    }
    await anvil.rename(item, name);
    return { renamed: item.name, name };
  }

  async anvilCombine(x: number, y: number, z: number, firstItem: string, secondItem: string, name?: string) {
    const anvil = await this.openRequiredAnvil(x, y, z);
    const first = this.findInventoryItem(firstItem);
    const second = this.findInventoryItem(secondItem, first.slot);
    if (!anvil.combine) {
      throw new Error("Anvil does not support combine.");
    }
    await anvil.combine(first, second, name);
    return { combined: [first.name, second.name], name };
  }

  async openEnchantmentAt(x: number, y: number, z: number) {
    const block = this.getRequiredBlock(x, y, z);
    const table = await this.requireMethod("openEnchantmentTable").call(this.requireBot(), block);
    return { opened: true, block: serializeBlock(block), enchantmentTable: serializeEnchantmentTable(table) };
  }

  enchantmentStatus() {
    return { enchantmentTable: serializeEnchantmentTable(this.requireEnchantmentTable()) };
  }

  async enchantmentPutTarget(itemName: string) {
    const table = this.requireEnchantmentTable();
    const item = this.findInventoryItem(itemName);
    if (!table.putTargetItem) {
      throw new Error("Current enchantment table does not support putTargetItem.");
    }
    const returned = await table.putTargetItem(item);
    return { putTarget: serializeItem(returned), enchantmentTable: serializeEnchantmentTable(table) };
  }

  async enchantmentPutLapis(itemName: string) {
    const table = this.requireEnchantmentTable();
    const item = this.findInventoryItem(itemName);
    if (!table.putLapis) {
      throw new Error("Current enchantment table does not support putLapis.");
    }
    const returned = await table.putLapis(item);
    return { putLapis: serializeItem(returned), enchantmentTable: serializeEnchantmentTable(table) };
  }

  async enchant(choice: string | number) {
    const table = this.requireEnchantmentTable();
    if (!table.enchant) {
      throw new Error("Current enchantment table does not support enchant.");
    }
    const item = await table.enchant(choice);
    return { enchanted: serializeItem(item), enchantmentTable: serializeEnchantmentTable(table) };
  }

  async enchantmentTakeTarget() {
    const table = this.requireEnchantmentTable();
    if (!table.takeTargetItem) {
      throw new Error("Current enchantment table does not support takeTargetItem.");
    }
    const item = await table.takeTargetItem();
    return { tookTarget: serializeItem(item), enchantmentTable: serializeEnchantmentTable(table) };
  }

  async openVillagerWindow(id: number) {
    const entity = this.getRequiredEntity(id);
    const villager = await this.requireMethod("openVillager").call(this.requireBot(), entity);
    return { opened: true, entity: serializeEntity(entity, this.requireBot().entity?.position), villager: serializeVillager(villager) };
  }

  villagerStatus() {
    return { villager: serializeVillager(this.requireVillager()) };
  }

  async villagerTrade(index: number, times: number) {
    const villager = this.requireVillager();
    await this.requireMethod("trade").call(this.requireBot(), villager, index, times);
    return { traded: true, index, times, villager: serializeVillager(villager) };
  }

  windowStatus() {
    return { window: serializeWindow(this.requireBot().currentWindow) };
  }

  async windowDeposit(itemName: string, count: number) {
    const window = this.requireWindow();
    if (!window.deposit) {
      throw new Error("Current window does not support deposit.");
    }
    await window.deposit(this.itemType(itemName), null, count);
    return { deposited: itemName, count, window: serializeWindow(window) };
  }

  async windowWithdraw(itemName: string, count: number) {
    const window = this.requireWindow();
    if (!window.withdraw) {
      throw new Error("Current window does not support withdraw.");
    }
    await window.withdraw(this.itemType(itemName), null, count);
    return { withdrew: itemName, count, window: serializeWindow(window) };
  }

  closeWindow() {
    const window = this.requireWindow();
    if (window.close) {
      window.close();
    } else {
      this.requireMethod("closeWindow").call(this.requireBot(), window);
    }
    return { closed: true };
  }

  async activateEntity(id: number) {
    const entity = this.getRequiredEntity(id);
    await this.requireMethod("activateEntity").call(this.requireBot(), entity);
    return { activated: true, entity: serializeEntity(entity, this.requireBot().entity?.position) };
  }

  useOnEntity(id: number) {
    const entity = this.getRequiredEntity(id);
    this.requireMethod("useOn").call(this.requireBot(), entity);
    return { usedOn: true, entity: serializeEntity(entity, this.requireBot().entity?.position) };
  }

  attackEntity(id: number, options: { allowPlayers?: boolean; allowPassive?: boolean } = {}) {
    const entity = this.getRequiredEntity(id);
    this.assertAttackAllowed(entity, options);
    this.requireMethod("attack").call(this.requireBot(), entity);
    return { attacked: true, entity: serializeEntity(entity, this.requireBot().entity?.position) };
  }

  attackNearest(input: { name?: string; type?: string; radius: number; allowPlayers?: boolean; allowPassive?: boolean }) {
    const candidates = this.findEntities({
      name: input.name,
      type: input.type,
      radius: input.radius,
      limit: 1,
      includePlayers: input.allowPlayers,
      includePassive: input.allowPassive,
    }).entities;
    const target = candidates[0];
    if (!target?.id) {
      throw new Error("No attack target matched the filter.");
    }
    return this.attackEntity(target.id, { allowPlayers: input.allowPlayers, allowPassive: input.allowPassive });
  }

  swingArm(hand: "left" | "right", showHand: boolean) {
    this.requireMethod("swingArm").call(this.requireBot(), hand, showHand);
    return { swung: true, hand, showHand };
  }

  mountEntity(id: number) {
    const entity = this.getRequiredEntity(id);
    this.requireMethod("mount").call(this.requireBot(), entity);
    return { mounted: true, entity: serializeEntity(entity, this.requireBot().entity?.position) };
  }

  dismount() {
    this.requireMethod("dismount").call(this.requireBot());
    return { dismounted: true };
  }

  moveVehicle(left: number, forward: number) {
    this.requireMethod("moveVehicle").call(this.requireBot(), left, forward);
    return { moved: true, left, forward };
  }

  stop(): void {
    this.bot?.quit("mcagent session stop");
  }

  private requireBot(): MineflayerBot {
    if (!this.bot) {
      throw new Error("Bot is not started.");
    }
    return this.bot;
  }

  private requirePathfinder(): NonNullable<MineflayerBot["pathfinder"]> {
    const bot = this.requireBot();
    if (!bot.pathfinder) {
      throw new Error("Pathfinder is not available.");
    }
    return bot.pathfinder;
  }

  private requireMethod<T extends keyof MineflayerBot>(name: T): NonNullable<MineflayerBot[T]> {
    const method = this.requireBot()[name];
    if (typeof method !== "function") {
      throw new Error(`Bot method '${String(name)}' is not available.`);
    }
    return method as NonNullable<MineflayerBot[T]>;
  }

  private getRequiredBlock(x: number, y: number, z: number): MineflayerBlock {
    const block = this.requireMethod("blockAt").call(this.requireBot(), new Vec3(x, y, z)) as MineflayerBlock | null;
    if (!block) {
      throw new Error(`No loaded block at ${x}, ${y}, ${z}.`);
    }
    return block;
  }

  private blockType(name: string): number {
    const block = this.requireBot().registry?.blocksByName?.[name];
    if (!block) {
      throw new Error(`Unknown block '${name}' for this Minecraft version.`);
    }
    return block.id;
  }

  private itemType(name: string): number {
    const item = this.requireBot().registry?.itemsByName?.[name];
    if (!item) {
      throw new Error(`Unknown item '${name}' for this Minecraft version.`);
    }
    return item.id;
  }

  private findInventoryItem(name: string, excludeSlot?: number): MineflayerItem {
    const item = this.requireBot()
      .inventory?.items()
      .find((candidate) => candidate.slot !== excludeSlot && (candidate.name === name || candidate.displayName === name));
    if (!item) {
      throw new Error(`Item '${name}' is not in inventory.`);
    }
    return item;
  }

  private getRequiredEntity(id: number): MineflayerEntity {
    const entity = this.requireBot().entities?.[String(id)];
    if (!entity) {
      throw new Error(`Entity '${id}' is not visible.`);
    }
    return entity;
  }

  private requireWindow(): MineflayerWindow {
    const window = this.requireBot().currentWindow;
    if (!window) {
      throw new Error("No window is currently open.");
    }
    return window;
  }

  private requireFurnace(): MineflayerFurnace {
    const window = this.requireWindow() as MineflayerFurnace;
    if (!window.putInput && !window.takeOutput && window.fuel === undefined && window.progress === undefined) {
      throw new Error("Current window is not a furnace.");
    }
    return window;
  }

  private async openRequiredAnvil(x: number, y: number, z: number): Promise<MineflayerAnvil> {
    const block = this.getRequiredBlock(x, y, z);
    return this.requireMethod("openAnvil").call(this.requireBot(), block);
  }

  private requireEnchantmentTable(): MineflayerEnchantmentTable {
    const window = this.requireWindow() as MineflayerEnchantmentTable;
    if (!window.enchantments && !window.enchant && !window.putTargetItem) {
      throw new Error("Current window is not an enchantment table.");
    }
    return window;
  }

  private requireVillager(): MineflayerVillager {
    const window = this.requireWindow() as MineflayerVillager;
    if (!Array.isArray(window.trades)) {
      throw new Error("Current window is not a villager trade window.");
    }
    return window;
  }

  private requireMaxBlocks(count: number, maxBlocks: number): void {
    if (count > maxBlocks) {
      throw new Error(`Command would affect ${count} blocks, above maxBlocks ${maxBlocks}.`);
    }
  }

  private selectRecipe(recipes: unknown[], recipeIndex?: number, recipeId?: string): { index: number; id?: string } {
    if (recipeIndex !== undefined && recipeId !== undefined) {
      throw new Error("Choose either recipeIndex or recipeId, not both.");
    }
    if (recipeId !== undefined) {
      const index = recipes.findIndex((recipe) => this.recipeId(recipe) === recipeId);
      if (index < 0) {
        throw new Error(`No recipe with id '${recipeId}' was found.`);
      }
      return { index, id: recipeId };
    }
    const index = recipeIndex ?? 0;
    if (index < 0 || index >= recipes.length) {
      throw new Error(`Recipe index ${index} is out of range.`);
    }
    return { index, id: this.recipeId(recipes[index]) };
  }

  private recipeId(recipe: unknown): string | undefined {
    const direct = recipeStringField(recipe, "id") ?? recipeStringField(recipe, "name");
    if (direct) {
      return direct;
    }
    if (recipe && typeof recipe === "object") {
      const result = (recipe as Record<string, unknown>).result;
      return recipeStringField(result, "id") ?? recipeStringField(result, "name");
    }
    return undefined;
  }

  private cropState(block: MineflayerBlock) {
    const properties = block.getProperties?.() ?? {};
    const rawAge = properties.age;
    const age = typeof rawAge === "number" ? rawAge : typeof rawAge === "string" ? Number(rawAge) : undefined;
    const normalizedAge = Number.isFinite(age) ? age : undefined;
    const maxAge = matureAges[block.name];
    return {
      block: serializeBlock(block),
      age: normalizedAge,
      maxAge,
      mature: maxAge === undefined || normalizedAge === undefined ? undefined : normalizedAge >= maxAge,
    };
  }

  private isPlayerEntity(entity: MineflayerEntity): boolean {
    return entity.type === "player" || Boolean(entity.username);
  }

  private isPassiveEntity(entity: MineflayerEntity): boolean {
    return Boolean(entity.name && passiveEntityNames.has(entity.name));
  }

  private assertAttackAllowed(entity: MineflayerEntity, options: { allowPlayers?: boolean; allowPassive?: boolean }): void {
    if (this.isPlayerEntity(entity) && !options.allowPlayers) {
      throw new Error("Refusing to attack a player without allowPlayers.");
    }
    if (this.isPassiveEntity(entity) && !options.allowPassive) {
      throw new Error("Refusing to attack a passive mob without allowPassive.");
    }
  }

  private configurePathfinderMovements(): void {
    const bot = this.requireBot();
    if (!bot.pathfinder || !bot.registry?.blocksByName || !bot.registry.blocksArray || !bot.registry.itemsByName) {
      return;
    }
    bot.pathfinder.setMovements(new Movements(bot as never));
  }
}
