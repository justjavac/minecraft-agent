import { notImplemented } from "../output/errors.js";

export interface StartSessionInput {
  session: string;
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
  detach: boolean;
}

export interface SessionInput {
  session: string;
}

export interface EventsInput extends SessionInput {
  since: number;
  limit: number;
}

export interface WatchInput extends SessionInput {
  since: number;
}

export interface ChatInput extends SessionInput {
  message: string;
  allowCommand: boolean;
}

export interface WhisperInput extends SessionInput {
  username: string;
  message: string;
}

export interface TabCompleteInput extends SessionInput {
  text: string;
  assumeCommand: boolean;
  sendBlockInSight: boolean;
  timeout: number;
}

export interface ControlTapInput extends SessionInput {
  state: string;
  durationMs: number;
}

export interface ControlSetInput extends SessionInput {
  state: string;
  value: boolean;
}

export interface LookAtInput extends SessionInput {
  x: number;
  y: number;
  z: number;
}

export interface LookInput extends SessionInput {
  yaw: number;
  pitch: number;
  force: boolean;
}

export interface EntitiesInput extends SessionInput {
  radius: number;
  limit: number;
}

export interface BlockPositionInput extends SessionInput {
  x: number;
  y: number;
  z: number;
}

export interface FindBlocksInput extends SessionInput {
  name: string;
  radius: number;
  count: number;
}

export interface CursorBlockInput extends SessionInput {
  maxDistance: number;
}

export interface SightBlockInput extends SessionInput {
  maxSteps: number;
  vectorLength: number;
}

export interface NavigateGotoInput extends BlockPositionInput {
  range: number;
}

export interface NavigateFollowInput extends SessionInput {
  player: string;
  range: number;
}

export interface NavigateConfigureInput extends SessionInput {
  allowDig?: boolean;
  allowSprinting?: boolean;
  allowParkour?: boolean;
  canOpenDoors?: boolean;
  maxDropDown?: number;
  searchRadius?: number;
  thinkTimeout?: number;
  tickTimeout?: number;
}

export interface CollectItemInput extends SessionInput {
  id: number;
  range: number;
}

export interface EquipInput extends SessionInput {
  item: string;
  destination: string;
}

export interface UnequipInput extends SessionInput {
  destination: string;
}

export interface QuickBarInput extends SessionInput {
  slot: number;
}

export interface TossInput extends SessionInput {
  item: string;
  count: number;
}

export interface RecipesInput extends SessionInput {
  item: string;
  count: number;
  tableX?: number;
  tableY?: number;
  tableZ?: number;
}

export interface CraftInput extends SessionInput {
  item: string;
  count: number;
  tableX?: number;
  tableY?: number;
  tableZ?: number;
  recipeIndex?: number;
  recipeId?: string;
}

export interface PlaceBlockInput extends BlockPositionInput {
  face: string;
  item?: string;
}

export interface UpdateSignInput extends BlockPositionInput {
  text: string;
  back: boolean;
}

export interface EntityInput extends SessionInput {
  id: number;
}

export interface EntityAttackInput extends EntityInput {
  allowPlayers?: boolean;
  allowPassive?: boolean;
}

export interface EntityFindInput extends SessionInput {
  name?: string;
  type?: string;
  radius: number;
  limit: number;
  includePlayers: boolean;
  includePassive: boolean;
}

export interface SwingArmInput extends SessionInput {
  hand: "left" | "right";
  showHand: boolean;
}

export interface MoveVehicleInput extends SessionInput {
  left: number;
  forward: number;
}

export interface WindowItemInput extends SessionInput {
  item: string;
  count: number;
}

export interface BlockRangeInput extends SessionInput {
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  maxBlocks: number;
}

export interface BuildPlaceRangeInput extends BlockRangeInput {
  face: string;
  item?: string;
}

export interface MineCuboidInput extends BlockRangeInput {
  shell: boolean;
}

export interface CropInspectInput extends BlockPositionInput {}

export interface CropPlantInput extends BlockPositionInput {
  item: string;
}

export interface CropHarvestInput extends BlockPositionInput {
  onlyMature: boolean;
  replantItem?: string;
}

export interface CropFindMatureInput extends SessionInput {
  name: string;
  radius: number;
  count: number;
}

export interface AnvilRenameInput extends BlockPositionInput {
  item: string;
  name: string;
}

export interface AnvilCombineInput extends BlockPositionInput {
  firstItem: string;
  secondItem: string;
  name?: string;
}

export interface EnchantChoiceInput extends SessionInput {
  choice: string | number;
}

export interface CombatAttackNearestInput extends SessionInput {
  name?: string;
  type?: string;
  radius: number;
  allowPlayers?: boolean;
  allowPassive?: boolean;
}

export interface DaemonRunInput extends StartSessionInput {
  controlPort: number;
}

export interface CliHandlers {
  startSession(input: StartSessionInput): Promise<unknown>;
  sessionStatus(input: SessionInput): Promise<unknown>;
  listSessions(): Promise<unknown>;
  stopSession(input: SessionInput): Promise<unknown>;
  observeEvents(input: EventsInput): Promise<unknown>;
  observeWatch(input: WatchInput): Promise<void>;
  sendChat(input: ChatInput): Promise<unknown>;
  sendWhisper(input: WhisperInput): Promise<unknown>;
  tabComplete(input: TabCompleteInput): Promise<unknown>;
  botPosition(input: SessionInput): Promise<unknown>;
  botInventory(input: SessionInput): Promise<unknown>;
  botPlayers(input: SessionInput): Promise<unknown>;
  botEntities(input: EntitiesInput): Promise<unknown>;
  botTablist(input: SessionInput): Promise<unknown>;
  botScoreboards(input: SessionInput): Promise<unknown>;
  botTeams(input: SessionInput): Promise<unknown>;
  botControls(input: SessionInput): Promise<unknown>;
  controlTap(input: ControlTapInput): Promise<unknown>;
  controlSet(input: ControlSetInput): Promise<unknown>;
  controlClear(input: SessionInput): Promise<unknown>;
  lookAt(input: LookAtInput): Promise<unknown>;
  look(input: LookInput): Promise<unknown>;
  worldBlock(input: BlockPositionInput): Promise<unknown>;
  worldBlockInfo(input: BlockPositionInput): Promise<unknown>;
  worldBlockInSight(input: SightBlockInput): Promise<unknown>;
  worldBlockAtCursor(input: CursorBlockInput): Promise<unknown>;
  worldFindBlocks(input: FindBlocksInput): Promise<unknown>;
  navigateGoto(input: NavigateGotoInput): Promise<unknown>;
  navigateFollow(input: NavigateFollowInput): Promise<unknown>;
  navigateStop(input: SessionInput): Promise<unknown>;
  navigateStatus(input: SessionInput): Promise<unknown>;
  navigateConfigure(input: NavigateConfigureInput): Promise<unknown>;
  collectItem(input: CollectItemInput): Promise<unknown>;
  inventoryEquip(input: EquipInput): Promise<unknown>;
  inventoryUnequip(input: UnequipInput): Promise<unknown>;
  inventoryQuickBar(input: QuickBarInput): Promise<unknown>;
  inventoryToss(input: TossInput): Promise<unknown>;
  inventoryConsume(input: SessionInput): Promise<unknown>;
  inventoryFish(input: SessionInput): Promise<unknown>;
  inventoryActivateItem(input: SessionInput & { offhand: boolean }): Promise<unknown>;
  inventoryDeactivateItem(input: SessionInput): Promise<unknown>;
  inventoryRecipes(input: RecipesInput): Promise<unknown>;
  inventoryCraft(input: CraftInput): Promise<unknown>;
  worldDig(input: BlockPositionInput): Promise<unknown>;
  worldStopDigging(input: SessionInput): Promise<unknown>;
  worldPlace(input: PlaceBlockInput): Promise<unknown>;
  worldPlaceEntity(input: PlaceBlockInput): Promise<unknown>;
  worldActivate(input: BlockPositionInput): Promise<unknown>;
  worldUpdateSign(input: UpdateSignInput): Promise<unknown>;
  worldSleep(input: BlockPositionInput): Promise<unknown>;
  worldWake(input: SessionInput): Promise<unknown>;
  worldElytraFly(input: SessionInput): Promise<unknown>;
  buildPlaceLine(input: BuildPlaceRangeInput): Promise<unknown>;
  buildPlaceCuboidShell(input: BuildPlaceRangeInput): Promise<unknown>;
  mineDigLine(input: BlockRangeInput): Promise<unknown>;
  mineDigCuboid(input: MineCuboidInput): Promise<unknown>;
  cropInspect(input: CropInspectInput): Promise<unknown>;
  cropPlant(input: CropPlantInput): Promise<unknown>;
  cropHarvest(input: CropHarvestInput): Promise<unknown>;
  cropFindMature(input: CropFindMatureInput): Promise<unknown>;
  windowOpenBlock(input: BlockPositionInput): Promise<unknown>;
  windowOpenEntity(input: EntityInput): Promise<unknown>;
  windowStatus(input: SessionInput): Promise<unknown>;
  windowDeposit(input: WindowItemInput): Promise<unknown>;
  windowWithdraw(input: WindowItemInput): Promise<unknown>;
  windowClose(input: SessionInput): Promise<unknown>;
  chestOpenBlock(input: BlockPositionInput): Promise<unknown>;
  chestOpenEntity(input: EntityInput): Promise<unknown>;
  chestStatus(input: SessionInput): Promise<unknown>;
  chestDeposit(input: WindowItemInput): Promise<unknown>;
  chestWithdraw(input: WindowItemInput): Promise<unknown>;
  chestClose(input: SessionInput): Promise<unknown>;
  furnaceOpen(input: BlockPositionInput): Promise<unknown>;
  furnaceStatus(input: SessionInput): Promise<unknown>;
  furnacePutInput(input: WindowItemInput): Promise<unknown>;
  furnacePutFuel(input: WindowItemInput): Promise<unknown>;
  furnaceTakeInput(input: SessionInput): Promise<unknown>;
  furnaceTakeFuel(input: SessionInput): Promise<unknown>;
  furnaceTakeOutput(input: SessionInput): Promise<unknown>;
  anvilRename(input: AnvilRenameInput): Promise<unknown>;
  anvilCombine(input: AnvilCombineInput): Promise<unknown>;
  enchantOpen(input: BlockPositionInput): Promise<unknown>;
  enchantStatus(input: SessionInput): Promise<unknown>;
  enchantPutTarget(input: SessionInput & { item: string }): Promise<unknown>;
  enchantPutLapis(input: SessionInput & { item: string }): Promise<unknown>;
  enchant(input: EnchantChoiceInput): Promise<unknown>;
  enchantTakeTarget(input: SessionInput): Promise<unknown>;
  villagerOpen(input: EntityInput): Promise<unknown>;
  villagerStatus(input: SessionInput): Promise<unknown>;
  villagerTrade(input: SessionInput & { index: number; times: number }): Promise<unknown>;
  entityFind(input: EntityFindInput): Promise<unknown>;
  entityActivate(input: EntityInput): Promise<unknown>;
  entityUseOn(input: EntityInput): Promise<unknown>;
  entityAttack(input: EntityAttackInput): Promise<unknown>;
  entitySwingArm(input: SwingArmInput): Promise<unknown>;
  entityMount(input: EntityInput): Promise<unknown>;
  entityDismount(input: SessionInput): Promise<unknown>;
  entityMoveVehicle(input: MoveVehicleInput): Promise<unknown>;
  combatTargets(input: EntityFindInput): Promise<unknown>;
  combatAttackNearest(input: CombatAttackNearestInput): Promise<unknown>;
  daemonRun(input: DaemonRunInput): Promise<unknown>;
}

export function createPlaceholderHandlers(): CliHandlers {
  return {
    startSession: async () => {
      throw notImplemented("session start");
    },
    sessionStatus: async () => {
      throw notImplemented("session status");
    },
    listSessions: async () => {
      throw notImplemented("session list");
    },
    stopSession: async () => {
      throw notImplemented("session stop");
    },
    observeEvents: async () => {
      throw notImplemented("observe events");
    },
    observeWatch: async () => {
      throw notImplemented("observe watch");
    },
    sendChat: async () => {
      throw notImplemented("chat send");
    },
    sendWhisper: async () => {
      throw notImplemented("chat whisper");
    },
    tabComplete: async () => {
      throw notImplemented("chat tab-complete");
    },
    botPosition: async () => {
      throw notImplemented("bot position");
    },
    botInventory: async () => {
      throw notImplemented("bot inventory");
    },
    botPlayers: async () => {
      throw notImplemented("bot players");
    },
    botEntities: async () => {
      throw notImplemented("bot entities");
    },
    botTablist: async () => {
      throw notImplemented("bot tablist");
    },
    botScoreboards: async () => {
      throw notImplemented("bot scoreboards");
    },
    botTeams: async () => {
      throw notImplemented("bot teams");
    },
    botControls: async () => {
      throw notImplemented("bot controls");
    },
    controlTap: async () => {
      throw notImplemented("control tap");
    },
    controlSet: async () => {
      throw notImplemented("control set");
    },
    controlClear: async () => {
      throw notImplemented("control clear");
    },
    lookAt: async () => {
      throw notImplemented("look at");
    },
    look: async () => {
      throw notImplemented("look yaw-pitch");
    },
    worldBlock: async () => {
      throw notImplemented("world block");
    },
    worldBlockInfo: async () => {
      throw notImplemented("world block-info");
    },
    worldBlockInSight: async () => {
      throw notImplemented("world block-in-sight");
    },
    worldBlockAtCursor: async () => {
      throw notImplemented("world block-at-cursor");
    },
    worldFindBlocks: async () => {
      throw notImplemented("world find-blocks");
    },
    navigateGoto: async () => {
      throw notImplemented("navigate goto");
    },
    navigateFollow: async () => {
      throw notImplemented("navigate follow");
    },
    navigateStop: async () => {
      throw notImplemented("navigate stop");
    },
    navigateStatus: async () => {
      throw notImplemented("navigate status");
    },
    navigateConfigure: async () => {
      throw notImplemented("navigate configure");
    },
    collectItem: async () => {
      throw notImplemented("collect item");
    },
    inventoryEquip: async () => {
      throw notImplemented("inventory equip");
    },
    inventoryUnequip: async () => {
      throw notImplemented("inventory unequip");
    },
    inventoryQuickBar: async () => {
      throw notImplemented("inventory quickbar");
    },
    inventoryToss: async () => {
      throw notImplemented("inventory toss");
    },
    inventoryConsume: async () => {
      throw notImplemented("inventory consume");
    },
    inventoryFish: async () => {
      throw notImplemented("inventory fish");
    },
    inventoryActivateItem: async () => {
      throw notImplemented("inventory activate-item");
    },
    inventoryDeactivateItem: async () => {
      throw notImplemented("inventory deactivate-item");
    },
    inventoryRecipes: async () => {
      throw notImplemented("inventory recipes");
    },
    inventoryCraft: async () => {
      throw notImplemented("inventory craft");
    },
    worldDig: async () => {
      throw notImplemented("world dig");
    },
    worldStopDigging: async () => {
      throw notImplemented("world stop-digging");
    },
    worldPlace: async () => {
      throw notImplemented("world place");
    },
    worldPlaceEntity: async () => {
      throw notImplemented("world place-entity");
    },
    worldActivate: async () => {
      throw notImplemented("world activate");
    },
    worldUpdateSign: async () => {
      throw notImplemented("world update-sign");
    },
    worldSleep: async () => {
      throw notImplemented("world sleep");
    },
    worldWake: async () => {
      throw notImplemented("world wake");
    },
    worldElytraFly: async () => {
      throw notImplemented("world elytra-fly");
    },
    buildPlaceLine: async () => {
      throw notImplemented("build place-line");
    },
    buildPlaceCuboidShell: async () => {
      throw notImplemented("build place-cuboid-shell");
    },
    mineDigLine: async () => {
      throw notImplemented("mine dig-line");
    },
    mineDigCuboid: async () => {
      throw notImplemented("mine dig-cuboid");
    },
    cropInspect: async () => {
      throw notImplemented("crop inspect");
    },
    cropPlant: async () => {
      throw notImplemented("crop plant");
    },
    cropHarvest: async () => {
      throw notImplemented("crop harvest");
    },
    cropFindMature: async () => {
      throw notImplemented("crop find-mature");
    },
    windowOpenBlock: async () => {
      throw notImplemented("window open-block");
    },
    windowOpenEntity: async () => {
      throw notImplemented("window open-entity");
    },
    windowStatus: async () => {
      throw notImplemented("window status");
    },
    windowDeposit: async () => {
      throw notImplemented("window deposit");
    },
    windowWithdraw: async () => {
      throw notImplemented("window withdraw");
    },
    windowClose: async () => {
      throw notImplemented("window close");
    },
    chestOpenBlock: async () => {
      throw notImplemented("chest open-block");
    },
    chestOpenEntity: async () => {
      throw notImplemented("chest open-entity");
    },
    chestStatus: async () => {
      throw notImplemented("chest status");
    },
    chestDeposit: async () => {
      throw notImplemented("chest deposit");
    },
    chestWithdraw: async () => {
      throw notImplemented("chest withdraw");
    },
    chestClose: async () => {
      throw notImplemented("chest close");
    },
    furnaceOpen: async () => {
      throw notImplemented("furnace open");
    },
    furnaceStatus: async () => {
      throw notImplemented("furnace status");
    },
    furnacePutInput: async () => {
      throw notImplemented("furnace put-input");
    },
    furnacePutFuel: async () => {
      throw notImplemented("furnace put-fuel");
    },
    furnaceTakeInput: async () => {
      throw notImplemented("furnace take-input");
    },
    furnaceTakeFuel: async () => {
      throw notImplemented("furnace take-fuel");
    },
    furnaceTakeOutput: async () => {
      throw notImplemented("furnace take-output");
    },
    anvilRename: async () => {
      throw notImplemented("anvil rename");
    },
    anvilCombine: async () => {
      throw notImplemented("anvil combine");
    },
    enchantOpen: async () => {
      throw notImplemented("enchant open");
    },
    enchantStatus: async () => {
      throw notImplemented("enchant status");
    },
    enchantPutTarget: async () => {
      throw notImplemented("enchant put-target");
    },
    enchantPutLapis: async () => {
      throw notImplemented("enchant put-lapis");
    },
    enchant: async () => {
      throw notImplemented("enchant enchant");
    },
    enchantTakeTarget: async () => {
      throw notImplemented("enchant take-target");
    },
    villagerOpen: async () => {
      throw notImplemented("villager open");
    },
    villagerStatus: async () => {
      throw notImplemented("villager status");
    },
    villagerTrade: async () => {
      throw notImplemented("villager trade");
    },
    entityFind: async () => {
      throw notImplemented("entity find");
    },
    entityActivate: async () => {
      throw notImplemented("entity activate");
    },
    entityUseOn: async () => {
      throw notImplemented("entity use-on");
    },
    entityAttack: async () => {
      throw notImplemented("entity attack");
    },
    entitySwingArm: async () => {
      throw notImplemented("entity swing-arm");
    },
    entityMount: async () => {
      throw notImplemented("entity mount");
    },
    entityDismount: async () => {
      throw notImplemented("entity dismount");
    },
    entityMoveVehicle: async () => {
      throw notImplemented("entity move-vehicle");
    },
    combatTargets: async () => {
      throw notImplemented("combat targets");
    },
    combatAttackNearest: async () => {
      throw notImplemented("combat attack-nearest");
    },
    daemonRun: async () => {
      throw notImplemented("daemon run");
    },
  };
}
