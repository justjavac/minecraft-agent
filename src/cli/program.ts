import { Writable } from "node:stream";
import { Command } from "commander";
import { z } from "zod";
import { getSkillContent } from "../core/skills.js";
import { commandBlocked, normalizeError } from "../output/errors.js";
import { failure, formatDefaultText, resolveOutputMode, success, writeJson, writeText } from "../output/response.js";
import { CliHandlers } from "./handlers.js";

export interface CliIo {
  stdout: Writable;
  stderr: Writable;
  isStdoutTty?: boolean;
}

const sessionSchema = z.object({
  session: z.string().min(1).default("default"),
});

function collectEventType(value: string, previous: string[] = []): string[] {
  return previous.concat(value);
}

function normalizeEventTypes(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

const eventTypesSchema = z.preprocess(normalizeEventTypes, z.array(z.string().min(1)));

const startSchema = sessionSchema.extend({
  host: z.string().min(1).default("localhost"),
  port: z.coerce.number().int().positive().max(65535).default(25565),
  username: z.string().min(1).default("AgentBot"),
  auth: z.string().min(1).default("offline"),
  version: z.string().min(1).optional(),
});

const eventsSchema = sessionSchema.extend({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  type: eventTypesSchema,
}).transform(({ type, ...input }) => ({ ...input, types: type }));

const watchSchema = sessionSchema.extend({
  since: z.coerce.number().int().min(0).default(0),
  type: eventTypesSchema,
}).transform(({ type, ...input }) => ({ ...input, types: type }));

const chatSchema = sessionSchema.extend({
  message: z.string().min(1),
  allowCommand: z.boolean().default(false),
});

const whisperSchema = sessionSchema.extend({
  username: z.string().min(1),
  message: z.string().min(1),
});

const tabCompleteSchema = sessionSchema.extend({
  text: z.string(),
  assumeCommand: z.boolean().default(false),
  sendBlockInSight: z.boolean().default(false),
  timeout: z.coerce.number().int().positive().max(30000).default(5000),
});

const controlTapSchema = sessionSchema.extend({
  state: z.enum(["forward", "back", "left", "right", "jump", "sprint", "sneak"]),
  durationMs: z.coerce.number().int().min(1).max(30000).default(500),
});

const controlSetSchema = sessionSchema.extend({
  state: z.enum(["forward", "back", "left", "right", "jump", "sprint", "sneak"]),
  value: z.boolean().default(true),
});

const lookAtSchema = sessionSchema.extend({
  x: z.coerce.number(),
  y: z.coerce.number(),
  z: z.coerce.number(),
});

const lookSchema = sessionSchema.extend({
  yaw: z.coerce.number(),
  pitch: z.coerce.number(),
  force: z.boolean().default(false),
});

const entitiesSchema = sessionSchema.extend({
  radius: z.coerce.number().positive().max(256).default(32),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const blockPositionSchema = sessionSchema.extend({
  x: z.coerce.number(),
  y: z.coerce.number(),
  z: z.coerce.number(),
});

const findBlocksSchema = sessionSchema.extend({
  name: z.string().min(1),
  radius: z.coerce.number().positive().max(256).default(32),
  count: z.coerce.number().int().min(1).max(200).default(10),
});

const cursorBlockSchema = sessionSchema.extend({
  maxDistance: z.coerce.number().positive().max(256).default(5),
});

const sightBlockSchema = sessionSchema.extend({
  maxSteps: z.coerce.number().positive().max(1024).default(256),
  vectorLength: z.coerce.number().positive().max(32).default(5),
});

const navigateGotoSchema = blockPositionSchema.extend({
  range: z.coerce.number().positive().max(32).default(1),
});

const navigateFollowSchema = sessionSchema.extend({
  player: z.string().min(1),
  range: z.coerce.number().positive().max(32).default(2),
});

const navigateConfigureSchema = sessionSchema.extend({
  allowDig: z.boolean().optional(),
  dig: z.boolean().optional(),
  noDig: z.boolean().optional(),
  allowSprinting: z.boolean().optional(),
  sprinting: z.boolean().optional(),
  noSprinting: z.boolean().optional(),
  allowParkour: z.boolean().optional(),
  parkour: z.boolean().optional(),
  noParkour: z.boolean().optional(),
  canOpenDoors: z.boolean().optional(),
  maxDropDown: z.coerce.number().int().min(0).max(256).optional(),
  searchRadius: z.coerce.number().int().min(-1).max(1024).optional(),
  thinkTimeout: z.coerce.number().int().positive().max(60000).optional(),
  tickTimeout: z.coerce.number().int().positive().max(1000).optional(),
});

const collectItemSchema = sessionSchema.extend({
  id: z.coerce.number().int(),
  range: z.coerce.number().positive().max(8).default(1),
});

const equipSchema = sessionSchema.extend({
  item: z.string().min(1),
  destination: z.string().min(1).default("hand"),
});

const unequipSchema = sessionSchema.extend({
  destination: z.string().min(1).default("hand"),
});

const quickBarSchema = sessionSchema.extend({
  slot: z.coerce.number().int().min(0).max(8),
});

const tossSchema = sessionSchema.extend({
  item: z.string().min(1),
  count: z.coerce.number().int().positive().max(64).default(1),
});

const itemActionSchema = sessionSchema.extend({
  offhand: z.boolean().default(false),
});

const recipeSchema = sessionSchema.extend({
  item: z.string().min(1),
  count: z.coerce.number().int().positive().max(64).default(1),
  tableX: z.coerce.number().optional(),
  tableY: z.coerce.number().optional(),
  tableZ: z.coerce.number().optional(),
  recipeIndex: z.coerce.number().int().min(0).optional(),
  recipeId: z.string().min(1).optional(),
});

const placeBlockSchema = blockPositionSchema.extend({
  face: z.enum(["up", "down", "north", "south", "west", "east"]).default("up"),
  item: z.string().min(1).optional(),
});

const updateSignSchema = blockPositionSchema.extend({
  text: z.string(),
  back: z.boolean().default(false),
});

const entitySchema = sessionSchema.extend({
  id: z.coerce.number().int(),
});

const swingArmSchema = sessionSchema.extend({
  hand: z.enum(["left", "right"]).default("right"),
  showHand: z.boolean().default(true),
});

const moveVehicleSchema = sessionSchema.extend({
  left: z.coerce.number().min(-1).max(1).default(0),
  forward: z.coerce.number().min(-1).max(1).default(0),
});

const windowItemSchema = sessionSchema.extend({
  item: z.string().min(1),
  count: z.coerce.number().int().positive().max(2304).default(1),
});

const blockRangeSchema = sessionSchema.extend({
  fromX: z.coerce.number(),
  fromY: z.coerce.number(),
  fromZ: z.coerce.number(),
  toX: z.coerce.number(),
  toY: z.coerce.number(),
  toZ: z.coerce.number(),
  maxBlocks: z.coerce.number().int().positive().max(4096).default(128),
});

const buildPlaceRangeSchema = blockRangeSchema.extend({
  face: z.enum(["up", "down", "north", "south", "west", "east"]).default("up"),
  item: z.string().min(1).optional(),
});

const mineCuboidSchema = blockRangeSchema.extend({
  shell: z.boolean().default(false),
});

const cropPlantSchema = blockPositionSchema.extend({
  item: z.string().min(1),
});

const cropHarvestSchema = blockPositionSchema.extend({
  onlyMature: z.boolean().default(true),
  force: z.boolean().default(false),
  replantItem: z.string().min(1).optional(),
});

const cropFindMatureSchema = sessionSchema.extend({
  name: z.string().min(1),
  radius: z.coerce.number().positive().max(256).default(32),
  count: z.coerce.number().int().min(1).max(200).default(10),
});

const anvilRenameSchema = blockPositionSchema.extend({
  item: z.string().min(1),
  name: z.string().min(1),
});

const anvilCombineSchema = blockPositionSchema.extend({
  firstItem: z.string().min(1),
  secondItem: z.string().min(1),
  name: z.string().min(1).optional(),
});

const itemNameSchema = sessionSchema.extend({
  item: z.string().min(1),
});

const enchantChoiceSchema = sessionSchema.extend({
  choice: z.union([z.coerce.number().int().min(0), z.string().min(1)]).default(0),
});

const villagerTradeSchema = sessionSchema.extend({
  index: z.coerce.number().int().min(0),
  times: z.coerce.number().int().positive().max(64).default(1),
});

const entityFindSchema = sessionSchema.extend({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  radius: z.coerce.number().positive().max(256).default(32),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  includePlayers: z.boolean().default(false),
  includePassive: z.boolean().default(false),
});

const entityAttackSchema = entitySchema.extend({
  allowPlayers: z.boolean().default(false),
  allowPassive: z.boolean().default(false),
});

const combatAttackNearestSchema = sessionSchema.extend({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  radius: z.coerce.number().positive().max(256).default(32),
  allowPlayers: z.boolean().default(false),
  allowPassive: z.boolean().default(false),
});

const daemonRunSchema = startSchema.extend({
  controlPort: z.coerce.number().int().positive().max(65535),
});

type TextFormatter = (data: unknown) => string;

function getOutputMode(command: Command, io: CliIo) {
  return resolveOutputMode(command.optsWithGlobals().output, io.isStdoutTty);
}

function commandRunner<T>(
  command: Command,
  io: CliIo,
  action: () => Promise<T>,
  formatter: TextFormatter = formatDefaultText,
) {
  return async () => {
    const mode = getOutputMode(command, io);
    try {
      const data = await action();
      if (mode === "json") {
        writeJson(io.stdout, success(data));
      } else {
        writeText(io.stdout, formatter(data));
      }
    } catch (error) {
      const normalized = normalizeError(error);
      if (mode === "json") {
        writeJson(io.stdout, failure(normalized));
      } else {
        writeText(io.stderr, `${normalized.code}: ${normalized.message}\n${normalized.remediation}`);
      }
      throw normalized;
    }
  };
}

export function buildProgram(handlers: CliHandlers, io: CliIo, version = "0.0.0"): Command {
  const program = new Command();

  program
    .name("mc-agent")
    .description("Agent-ready Minecraft bot CLI powered by mineflayer.")
    .version(version)
    .option("--output <mode>", "output mode: json or text")
    .showHelpAfterError();

  const session = program.command("session").description("Manage Minecraft bot sessions");

  session
    .command("start")
    .description("Start a long-running Minecraft bot session")
    .option("--session <name>", "session name", "default")
    .option("--host <host>", "Minecraft server host", "localhost")
    .option("--port <port>", "Minecraft server port", "25565")
    .option("--username <name>", "bot username", "AgentBot")
    .option("--auth <mode>", "mineflayer auth mode", "offline")
    .option("--version <version>", "Minecraft protocol version")
    .action((opts, cmd) =>
      commandRunner(
        cmd,
        io,
        () => handlers.startSession(startSchema.parse(opts)),
        (data) => `Started session ${(data as { session?: string }).session ?? "default"}`,
      )(),
    );

  session
    .command("status")
    .description("Show a Minecraft bot session status")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.sessionStatus(sessionSchema.parse(opts)))());

  session
    .command("list")
    .description("List known local Minecraft bot sessions")
    .action((_opts, cmd) => commandRunner(cmd, io, () => handlers.listSessions())());

  session
    .command("stop")
    .description("Stop a Minecraft bot session")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.stopSession(sessionSchema.parse(opts)))());

  const observe = program.command("observe").description("Observe Minecraft bot events");

  observe
    .command("events")
    .description("Fetch stored bot events")
    .option("--session <name>", "session name", "default")
    .option("--since <eventId>", "return events after this id", "0")
    .option("--limit <count>", "maximum events to return", "50")
    .option("--type <eventType>", "include only this event type; repeat or comma-separate for multiple types", collectEventType, [])
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.observeEvents(eventsSchema.parse(opts)))());

  observe
    .command("watch")
    .description("Watch new bot events as newline-delimited JSON")
    .option("--session <name>", "session name", "default")
    .option("--since <eventId>", "return events after this id", "0")
    .option("--type <eventType>", "include only this event type; repeat or comma-separate for multiple types", collectEventType, [])
    .action(async (opts, cmd) => {
      resolveOutputMode(cmd.optsWithGlobals().output, io.isStdoutTty);
      await handlers.observeWatch(watchSchema.parse(opts));
    });

  const chat = program.command("chat").description("Send Minecraft chat");

  chat
    .command("send")
    .description("Send a chat message from the bot")
    .requiredOption("--message <text>", "chat message to send")
    .option("--session <name>", "session name", "default")
    .option("--allow-command", "allow messages beginning with /", false)
    .action((opts, cmd) =>
      commandRunner(cmd, io, () => {
        const input = chatSchema.parse(opts);
        if (input.message.startsWith("/") && !input.allowCommand) {
          throw commandBlocked("Refusing to send a server command as chat.", "Pass --allow-command if this command is intentional.");
        }
        return handlers.sendChat(input);
      })(),
    );

  chat
    .command("whisper")
    .description("Send a private message where the server supports whispers")
    .requiredOption("--username <name>", "target username")
    .requiredOption("--message <text>", "message to send")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.sendWhisper(whisperSchema.parse(opts)))());

  chat
    .command("tab-complete")
    .description("Ask the server for chat or command completions")
    .requiredOption("--text <text>", "text to complete")
    .option("--assume-command", "assume the text is a command", false)
    .option("--send-block-in-sight", "include block-in-sight context", false)
    .option("--timeout <ms>", "timeout in milliseconds", "5000")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.tabComplete(tabCompleteSchema.parse(opts)))());

  const bot = program.command("bot").description("Inspect Minecraft bot state");

  bot
    .command("position")
    .description("Show the bot position")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botPosition(sessionSchema.parse(opts)))());

  bot
    .command("inventory")
    .description("Show the bot inventory")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botInventory(sessionSchema.parse(opts)))());

  bot
    .command("players")
    .description("Show visible players")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botPlayers(sessionSchema.parse(opts)))());

  bot
    .command("entities")
    .description("Show nearby entities")
    .option("--session <name>", "session name", "default")
    .option("--radius <blocks>", "search radius", "32")
    .option("--limit <count>", "maximum entities to return", "50")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botEntities(entitiesSchema.parse(opts)))());

  bot
    .command("tablist")
    .description("Show the server tablist")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botTablist(sessionSchema.parse(opts)))());

  bot
    .command("scoreboards")
    .description("Show scoreboards")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botScoreboards(sessionSchema.parse(opts)))());

  bot
    .command("teams")
    .description("Show teams")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botTeams(sessionSchema.parse(opts)))());

  bot
    .command("controls")
    .description("Show active control states")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.botControls(sessionSchema.parse(opts)))());

  const control = program.command("control").description("Control Minecraft bot movement");

  control
    .command("tap")
    .description("Set a control state briefly")
    .requiredOption("--state <state>", "forward|back|left|right|jump|sprint|sneak")
    .option("--duration-ms <ms>", "duration in milliseconds", "500")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.controlTap(controlTapSchema.parse(opts)))());

  control
    .command("set")
    .description("Set a control state until changed or cleared")
    .requiredOption("--state <state>", "forward|back|left|right|jump|sprint|sneak")
    .option("--value", "turn the control state on", true)
    .option("--off", "turn the control state off")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => {
      const input = controlSetSchema.parse({ ...opts, value: opts.off ? false : opts.value });
      return commandRunner(cmd, io, () => handlers.controlSet(input))();
    });

  control
    .command("clear")
    .description("Clear all active control states")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.controlClear(sessionSchema.parse(opts)))());

  const look = program.command("look").description("Control bot camera direction");

  look
    .command("at")
    .description("Look at a world coordinate")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.lookAt(lookAtSchema.parse(opts)))());

  look
    .command("yaw-pitch")
    .description("Look using raw yaw and pitch radians")
    .requiredOption("--yaw <radians>", "yaw in radians")
    .requiredOption("--pitch <radians>", "pitch in radians")
    .option("--force", "force server-side look update", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.look(lookSchema.parse(opts)))());

  const navigate = program.command("navigate").description("Pathfind through the Minecraft world");

  navigate
    .command("goto")
    .description("Pathfind near a world coordinate")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--range <blocks>", "acceptable distance from the coordinate", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.navigateGoto(navigateGotoSchema.parse(opts)))());

  navigate
    .command("follow")
    .description("Continuously follow a visible player")
    .requiredOption("--player <name>", "player username")
    .option("--range <blocks>", "preferred follow distance", "2")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.navigateFollow(navigateFollowSchema.parse(opts)))());

  navigate
    .command("stop")
    .description("Stop active pathfinding")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.navigateStop(sessionSchema.parse(opts)))());

  navigate
    .command("status")
    .description("Show pathfinding status")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.navigateStatus(sessionSchema.parse(opts)))());

  navigate
    .command("configure")
    .description("Configure pathfinder movement settings")
    .option("--allow-dig", "allow pathfinder to dig")
    .option("--no-dig", "disable pathfinder digging")
    .option("--allow-sprinting", "allow pathfinder sprinting")
    .option("--no-sprinting", "disable pathfinder sprinting")
    .option("--allow-parkour", "allow pathfinder parkour")
    .option("--no-parkour", "disable pathfinder parkour")
    .option("--can-open-doors", "allow opening doors")
    .option("--max-drop-down <blocks>", "maximum drop down distance")
    .option("--search-radius <blocks>", "pathfinder search radius, -1 for unlimited")
    .option("--think-timeout <ms>", "pathfinder think timeout")
    .option("--tick-timeout <ms>", "pathfinder per-tick timeout")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => {
      const parsed = navigateConfigureSchema.parse(opts);
      return commandRunner(cmd, io, () =>
        handlers.navigateConfigure({
          session: parsed.session,
          allowDig: parsed.noDig || parsed.dig === false ? false : parsed.allowDig,
          allowSprinting: parsed.noSprinting || parsed.sprinting === false ? false : parsed.allowSprinting,
          allowParkour: parsed.noParkour || parsed.parkour === false ? false : parsed.allowParkour,
          canOpenDoors: parsed.canOpenDoors,
          maxDropDown: parsed.maxDropDown,
          searchRadius: parsed.searchRadius,
          thinkTimeout: parsed.thinkTimeout,
          tickTimeout: parsed.tickTimeout,
        }),
      )();
    });

  const collect = program.command("collect").description("Collect visible resources");

  collect
    .command("item")
    .description("Pathfind near a visible dropped item entity")
    .requiredOption("--id <id>", "item entity id from bot entities")
    .option("--range <blocks>", "pickup range", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.collectItem(collectItemSchema.parse(opts)))());

  const inventory = program.command("inventory").description("Act on bot inventory");

  inventory
    .command("equip")
    .description("Equip an inventory item")
    .requiredOption("--item <name>", "item name, for example dirt or wheat_seeds")
    .option("--destination <slot>", "equipment destination", "hand")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryEquip(equipSchema.parse(opts)))());

  inventory
    .command("unequip")
    .description("Unequip an equipment destination")
    .option("--destination <slot>", "equipment destination", "hand")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryUnequip(unequipSchema.parse(opts)))());

  inventory
    .command("quickbar")
    .description("Select a quickbar slot")
    .requiredOption("--slot <0-8>", "quickbar slot")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryQuickBar(quickBarSchema.parse(opts)))());

  inventory
    .command("toss")
    .description("Drop items by registry name")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "number of items", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryToss(tossSchema.parse(opts)))());

  inventory
    .command("consume")
    .description("Consume the currently held item")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryConsume(sessionSchema.parse(opts)))());

  inventory
    .command("fish")
    .description("Use the currently held fishing rod")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryFish(sessionSchema.parse(opts)))());

  inventory
    .command("activate-item")
    .description("Start using the held item")
    .option("--offhand", "use offhand", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryActivateItem(itemActionSchema.parse(opts)))());

  inventory
    .command("deactivate-item")
    .description("Stop using the held item")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryDeactivateItem(sessionSchema.parse(opts)))());

  inventory
    .command("recipes")
    .description("List recipes for an item")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "minimum result count", "1")
    .option("--table-x <number>", "crafting table x coordinate")
    .option("--table-y <number>", "crafting table y coordinate")
    .option("--table-z <number>", "crafting table z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryRecipes(recipeSchema.parse(opts)))());

  inventory
    .command("craft")
    .description("Craft an item using a selected available recipe")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "craft count", "1")
    .option("--table-x <number>", "crafting table x coordinate")
    .option("--table-y <number>", "crafting table y coordinate")
    .option("--table-z <number>", "crafting table z coordinate")
    .option("--recipe-index <index>", "recipe index from inventory recipes")
    .option("--recipe-id <id>", "recipe id when exposed by mineflayer")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.inventoryCraft(recipeSchema.parse(opts)))());

  const world = program.command("world").description("Inspect and interact with blocks");

  world
    .command("block")
    .description("Inspect a loaded block")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldBlock(blockPositionSchema.parse(opts)))());

  world
    .command("block-info")
    .description("Inspect a loaded block with dig capability details")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldBlockInfo(blockPositionSchema.parse(opts)))());

  world
    .command("block-in-sight")
    .description("Inspect the block along the bot's line of sight")
    .option("--max-steps <count>", "raycast steps", "256")
    .option("--vector-length <number>", "raycast vector length", "5")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldBlockInSight(sightBlockSchema.parse(opts)))());

  world
    .command("block-at-cursor")
    .description("Inspect the block at the bot's cursor")
    .option("--max-distance <blocks>", "maximum cursor distance", "5")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldBlockAtCursor(cursorBlockSchema.parse(opts)))());

  world
    .command("find-blocks")
    .description("Find nearby loaded blocks by registry name")
    .requiredOption("--name <name>", "block name, for example farmland or oak_log")
    .option("--radius <blocks>", "search radius", "32")
    .option("--count <count>", "maximum blocks to return", "10")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldFindBlocks(findBlocksSchema.parse(opts)))());

  world
    .command("dig")
    .description("Dig a loaded block")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldDig(blockPositionSchema.parse(opts)))());

  world
    .command("stop-digging")
    .description("Stop the current dig action")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldStopDigging(sessionSchema.parse(opts)))());

  world
    .command("place")
    .description("Place the held or named item against a loaded reference block")
    .requiredOption("--x <number>", "reference block x coordinate")
    .requiredOption("--y <number>", "reference block y coordinate")
    .requiredOption("--z <number>", "reference block z coordinate")
    .option("--face <face>", "up|down|north|south|west|east", "up")
    .option("--item <name>", "inventory item to equip before placing")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldPlace(placeBlockSchema.parse(opts)))());

  world
    .command("place-entity")
    .description("Place an entity item, such as a boat, against a loaded reference block")
    .requiredOption("--x <number>", "reference block x coordinate")
    .requiredOption("--y <number>", "reference block y coordinate")
    .requiredOption("--z <number>", "reference block z coordinate")
    .option("--face <face>", "up|down|north|south|west|east", "up")
    .option("--item <name>", "inventory item to equip before placing")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldPlaceEntity(placeBlockSchema.parse(opts)))());

  world
    .command("activate")
    .description("Right-click a loaded block")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldActivate(blockPositionSchema.parse(opts)))());

  world
    .command("update-sign")
    .description("Update sign text")
    .requiredOption("--x <number>", "x coordinate")
    .requiredOption("--y <number>", "y coordinate")
    .requiredOption("--z <number>", "z coordinate")
    .requiredOption("--text <text>", "sign text")
    .option("--back", "write to the back side", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldUpdateSign(updateSignSchema.parse(opts)))());

  world
    .command("sleep")
    .description("Sleep in a bed block")
    .requiredOption("--x <number>", "bed x coordinate")
    .requiredOption("--y <number>", "bed y coordinate")
    .requiredOption("--z <number>", "bed z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldSleep(blockPositionSchema.parse(opts)))());

  world
    .command("wake")
    .description("Wake from sleep")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldWake(sessionSchema.parse(opts)))());

  world
    .command("elytra-fly")
    .description("Start elytra flight")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.worldElytraFly(sessionSchema.parse(opts)))());

  const build = program.command("build").description("Place deterministic multi-block shapes");

  build
    .command("place-line")
    .description("Place against an axis-aligned line of reference blocks")
    .requiredOption("--from-x <number>", "start x coordinate")
    .requiredOption("--from-y <number>", "start y coordinate")
    .requiredOption("--from-z <number>", "start z coordinate")
    .requiredOption("--to-x <number>", "end x coordinate")
    .requiredOption("--to-y <number>", "end y coordinate")
    .requiredOption("--to-z <number>", "end z coordinate")
    .option("--face <face>", "up|down|north|south|west|east", "up")
    .option("--item <name>", "inventory item to equip before placing")
    .option("--max-blocks <count>", "maximum blocks to affect", "128")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.buildPlaceLine(buildPlaceRangeSchema.parse(opts)))());

  build
    .command("place-cuboid-shell")
    .description("Place against the shell of a cuboid of reference blocks")
    .requiredOption("--from-x <number>", "corner x coordinate")
    .requiredOption("--from-y <number>", "corner y coordinate")
    .requiredOption("--from-z <number>", "corner z coordinate")
    .requiredOption("--to-x <number>", "opposite corner x coordinate")
    .requiredOption("--to-y <number>", "opposite corner y coordinate")
    .requiredOption("--to-z <number>", "opposite corner z coordinate")
    .option("--face <face>", "up|down|north|south|west|east", "up")
    .option("--item <name>", "inventory item to equip before placing")
    .option("--max-blocks <count>", "maximum blocks to affect", "512")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.buildPlaceCuboidShell(buildPlaceRangeSchema.parse(opts)))());

  const mine = program.command("mine").description("Dig deterministic multi-block shapes");

  mine
    .command("dig-line")
    .description("Dig an axis-aligned line of loaded blocks")
    .requiredOption("--from-x <number>", "start x coordinate")
    .requiredOption("--from-y <number>", "start y coordinate")
    .requiredOption("--from-z <number>", "start z coordinate")
    .requiredOption("--to-x <number>", "end x coordinate")
    .requiredOption("--to-y <number>", "end y coordinate")
    .requiredOption("--to-z <number>", "end z coordinate")
    .option("--max-blocks <count>", "maximum blocks to affect", "128")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.mineDigLine(blockRangeSchema.parse(opts)))());

  mine
    .command("dig-cuboid")
    .description("Dig a cuboid of loaded blocks")
    .requiredOption("--from-x <number>", "corner x coordinate")
    .requiredOption("--from-y <number>", "corner y coordinate")
    .requiredOption("--from-z <number>", "corner z coordinate")
    .requiredOption("--to-x <number>", "opposite corner x coordinate")
    .requiredOption("--to-y <number>", "opposite corner y coordinate")
    .requiredOption("--to-z <number>", "opposite corner z coordinate")
    .option("--shell", "dig only the cuboid shell", false)
    .option("--max-blocks <count>", "maximum blocks to affect", "512")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.mineDigCuboid(mineCuboidSchema.parse(opts)))());

  const crop = program.command("crop").description("Inspect, plant, and harvest crops");

  crop
    .command("inspect")
    .description("Inspect crop age and maturity at a loaded block")
    .requiredOption("--x <number>", "crop x coordinate")
    .requiredOption("--y <number>", "crop y coordinate")
    .requiredOption("--z <number>", "crop z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.cropInspect(blockPositionSchema.parse(opts)))());

  crop
    .command("find-mature")
    .description("Find mature crop blocks by registry name")
    .requiredOption("--name <name>", "crop block name, for example wheat")
    .option("--radius <blocks>", "search radius", "32")
    .option("--count <count>", "maximum crops to return", "10")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.cropFindMature(cropFindMatureSchema.parse(opts)))());

  crop
    .command("plant")
    .description("Plant the held or named seed against a farmland block")
    .requiredOption("--x <number>", "farmland x coordinate")
    .requiredOption("--y <number>", "farmland y coordinate")
    .requiredOption("--z <number>", "farmland z coordinate")
    .requiredOption("--item <name>", "seed or crop item name")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.cropPlant(cropPlantSchema.parse(opts)))());

  crop
    .command("harvest")
    .description("Harvest a crop block, optionally replanting after dig")
    .requiredOption("--x <number>", "crop x coordinate")
    .requiredOption("--y <number>", "crop y coordinate")
    .requiredOption("--z <number>", "crop z coordinate")
    .option("--force", "harvest even when maturity is unknown or false", false)
    .option("--replant-item <name>", "seed item to plant on the block below after harvest")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => {
      const parsed = cropHarvestSchema.parse(opts);
      return commandRunner(cmd, io, () => handlers.cropHarvest({ ...parsed, onlyMature: !parsed.force }))();
    });

  const window = program.command("window").description("Inspect and transfer through the current container window");

  window
    .command("open-block")
    .description("Open a container-like block")
    .requiredOption("--x <number>", "block x coordinate")
    .requiredOption("--y <number>", "block y coordinate")
    .requiredOption("--z <number>", "block z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowOpenBlock(blockPositionSchema.parse(opts)))());

  window
    .command("open-entity")
    .description("Open a visible container-like entity")
    .requiredOption("--id <id>", "entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowOpenEntity(entitySchema.parse(opts)))());

  window
    .command("status")
    .description("Show the current open window")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowStatus(sessionSchema.parse(opts)))());

  window
    .command("deposit")
    .description("Deposit inventory items into the current window")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowDeposit(windowItemSchema.parse(opts)))());

  window
    .command("withdraw")
    .description("Withdraw items from the current window")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowWithdraw(windowItemSchema.parse(opts)))());

  window
    .command("close")
    .description("Close the current window")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.windowClose(sessionSchema.parse(opts)))());

  const chest = program.command("chest").description("Open and transfer through chest-like windows");

  chest
    .command("open-block")
    .description("Open a chest-like block with mineflayer openChest")
    .requiredOption("--x <number>", "block x coordinate")
    .requiredOption("--y <number>", "block y coordinate")
    .requiredOption("--z <number>", "block z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestOpenBlock(blockPositionSchema.parse(opts)))());

  chest
    .command("open-entity")
    .description("Open a chest-like entity with mineflayer openChest")
    .requiredOption("--id <id>", "entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestOpenEntity(entitySchema.parse(opts)))());

  chest
    .command("status")
    .description("Show the current chest-like window")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestStatus(sessionSchema.parse(opts)))());

  chest
    .command("deposit")
    .description("Deposit inventory items into the current chest")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestDeposit(windowItemSchema.parse(opts)))());

  chest
    .command("withdraw")
    .description("Withdraw items from the current chest")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestWithdraw(windowItemSchema.parse(opts)))());

  chest
    .command("close")
    .description("Close the current chest")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.chestClose(sessionSchema.parse(opts)))());

  const furnace = program.command("furnace").description("Operate furnace windows");

  furnace
    .command("open")
    .description("Open a furnace block")
    .requiredOption("--x <number>", "furnace x coordinate")
    .requiredOption("--y <number>", "furnace y coordinate")
    .requiredOption("--z <number>", "furnace z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnaceOpen(blockPositionSchema.parse(opts)))());

  furnace.command("status").description("Show furnace progress and slots").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnaceStatus(sessionSchema.parse(opts)))());

  furnace
    .command("put-input")
    .description("Put an inventory item into the furnace input slot")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnacePutInput(windowItemSchema.parse(opts)))());

  furnace
    .command("put-fuel")
    .description("Put an inventory item into the furnace fuel slot")
    .requiredOption("--item <name>", "item name")
    .option("--count <count>", "item count", "1")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnacePutFuel(windowItemSchema.parse(opts)))());

  furnace.command("take-input").description("Take the furnace input slot").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnaceTakeInput(sessionSchema.parse(opts)))());
  furnace.command("take-fuel").description("Take the furnace fuel slot").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnaceTakeFuel(sessionSchema.parse(opts)))());
  furnace.command("take-output").description("Take the furnace output slot").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.furnaceTakeOutput(sessionSchema.parse(opts)))());

  const anvil = program.command("anvil").description("Operate an anvil block");

  anvil
    .command("rename")
    .description("Rename an inventory item at an anvil")
    .requiredOption("--x <number>", "anvil x coordinate")
    .requiredOption("--y <number>", "anvil y coordinate")
    .requiredOption("--z <number>", "anvil z coordinate")
    .requiredOption("--item <name>", "inventory item name")
    .requiredOption("--name <text>", "new item name")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.anvilRename(anvilRenameSchema.parse(opts)))());

  anvil
    .command("combine")
    .description("Combine two inventory items at an anvil")
    .requiredOption("--x <number>", "anvil x coordinate")
    .requiredOption("--y <number>", "anvil y coordinate")
    .requiredOption("--z <number>", "anvil z coordinate")
    .requiredOption("--first-item <name>", "first inventory item name")
    .requiredOption("--second-item <name>", "second inventory item name")
    .option("--name <text>", "optional result name")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.anvilCombine(anvilCombineSchema.parse(opts)))());

  const enchant = program.command("enchant").description("Operate enchantment table windows");

  enchant
    .command("open")
    .description("Open an enchantment table block")
    .requiredOption("--x <number>", "table x coordinate")
    .requiredOption("--y <number>", "table y coordinate")
    .requiredOption("--z <number>", "table z coordinate")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchantOpen(blockPositionSchema.parse(opts)))());

  enchant.command("status").description("Show enchantment choices and slots").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchantStatus(sessionSchema.parse(opts)))());
  enchant.command("put-target").description("Put an inventory item into the target slot").requiredOption("--item <name>", "item name").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchantPutTarget(itemNameSchema.parse(opts)))());
  enchant.command("put-lapis").description("Put lapis into the lapis slot").requiredOption("--item <name>", "lapis item name").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchantPutLapis(itemNameSchema.parse(opts)))());
  enchant.command("enchant").description("Apply an enchantment choice").option("--choice <indexOrId>", "choice index or id", "0").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchant(enchantChoiceSchema.parse(opts)))());
  enchant.command("take-target").description("Take the target item from the table").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.enchantTakeTarget(sessionSchema.parse(opts)))());

  const villager = program.command("villager").description("Open and trade with villager windows");

  villager
    .command("open")
    .description("Open a visible villager by entity id")
    .requiredOption("--id <id>", "villager entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.villagerOpen(entitySchema.parse(opts)))());

  villager.command("status").description("Show villager trades").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.villagerStatus(sessionSchema.parse(opts)))());
  villager.command("trade").description("Execute a villager trade by index").requiredOption("--index <index>", "trade index").option("--times <count>", "number of times", "1").option("--session <name>", "session name", "default").action((opts, cmd) => commandRunner(cmd, io, () => handlers.villagerTrade(villagerTradeSchema.parse(opts)))());

  const entity = program.command("entity").description("Interact with visible entities");

  entity
    .command("find")
    .description("Find visible entities with filters")
    .option("--name <name>", "entity name or username")
    .option("--type <type>", "entity type")
    .option("--radius <blocks>", "search radius", "32")
    .option("--limit <count>", "maximum entities to return", "50")
    .option("--include-players", "include player entities", false)
    .option("--include-passive", "include passive mobs", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityFind(entityFindSchema.parse(opts)))());

  entity
    .command("activate")
    .description("Right-click a visible entity by id")
    .requiredOption("--id <id>", "entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityActivate(entitySchema.parse(opts)))());

  entity
    .command("use-on")
    .description("Use the held item on a visible entity by id")
    .requiredOption("--id <id>", "entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityUseOn(entitySchema.parse(opts)))());

  entity
    .command("attack")
    .description("Attack a visible entity by id")
    .requiredOption("--id <id>", "entity id")
    .option("--allow-players", "allow attacking player entities", false)
    .option("--allow-passive", "allow attacking passive mobs", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityAttack(entityAttackSchema.parse(opts)))());

  entity
    .command("swing-arm")
    .description("Swing an arm")
    .option("--hand <hand>", "left|right", "right")
    .option("--show-hand", "show the hand animation", true)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entitySwingArm(swingArmSchema.parse(opts)))());

  entity
    .command("mount")
    .description("Mount a visible entity by id")
    .requiredOption("--id <id>", "entity id")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityMount(entitySchema.parse(opts)))());

  entity
    .command("dismount")
    .description("Dismount the current vehicle")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityDismount(sessionSchema.parse(opts)))());

  entity
    .command("move-vehicle")
    .description("Move the mounted vehicle")
    .option("--left <number>", "left/right input from -1 to 1", "0")
    .option("--forward <number>", "forward/back input from -1 to 1", "0")
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.entityMoveVehicle(moveVehicleSchema.parse(opts)))());

  const combat = program.command("combat").description("Find and attack combat targets with guardrails");

  combat
    .command("targets")
    .description("List attackable target candidates")
    .option("--name <name>", "entity name or username")
    .option("--type <type>", "entity type")
    .option("--radius <blocks>", "search radius", "32")
    .option("--limit <count>", "maximum targets to return", "20")
    .option("--include-players", "include player entities", false)
    .option("--include-passive", "include passive mobs", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.combatTargets(entityFindSchema.parse(opts)))());

  combat
    .command("attack-nearest")
    .description("Attack the nearest matching target")
    .option("--name <name>", "entity name or username")
    .option("--type <type>", "entity type")
    .option("--radius <blocks>", "search radius", "32")
    .option("--allow-players", "allow attacking player entities", false)
    .option("--allow-passive", "allow attacking passive mobs", false)
    .option("--session <name>", "session name", "default")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.combatAttackNearest(combatAttackNearestSchema.parse(opts)))());

  const skills = program.command("skills").description("Print mc-agent skill content for AI agents");

  skills
    .command("get")
    .description("Print a bundled skill by name")
    .argument("<name>", "skill name, for example core")
    .option("--full", "include full command reference", false)
    .action((name: string, opts: { full: boolean }) => {
      writeText(io.stdout, getSkillContent(name, opts.full));
    });

  const daemon = new Command("daemon").description("Internal daemon commands");
  daemon
    .command("run")
    .requiredOption("--control-port <port>", "local control port")
    .option("--session <name>", "session name", "default")
    .option("--host <host>", "Minecraft server host", "localhost")
    .option("--port <port>", "Minecraft server port", "25565")
    .option("--username <name>", "bot username", "AgentBot")
    .option("--auth <mode>", "mineflayer auth mode", "offline")
    .option("--version <version>", "Minecraft protocol version")
    .action((opts, cmd) => commandRunner(cmd, io, () => handlers.daemonRun(daemonRunSchema.parse(opts)))());
  program.addCommand(daemon, { hidden: true });

  return program;
}
