export interface StartSessionInput {
  session: string;
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
}

export interface SessionInput {
  session: string;
}

export interface EventsInput extends SessionInput {
  since: number;
  limit: number;
  types: string[];
}

export interface WatchInput extends SessionInput {
  since: number;
  types: string[];
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

export interface WindowClickInput extends SessionInput {
  slot: number;
  mouseButton: number;
  mode: number;
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
  windowOpenBlock(input: BlockPositionInput): Promise<unknown>;
  windowOpenEntity(input: EntityInput): Promise<unknown>;
  windowStatus(input: SessionInput): Promise<unknown>;
  windowDeposit(input: WindowItemInput): Promise<unknown>;
  windowWithdraw(input: WindowItemInput): Promise<unknown>;
  windowClick(input: WindowClickInput): Promise<unknown>;
  windowClose(input: SessionInput): Promise<unknown>;
  entityFind(input: EntityFindInput): Promise<unknown>;
  entityActivate(input: EntityInput): Promise<unknown>;
  entityUseOn(input: EntityInput): Promise<unknown>;
  entityAttack(input: EntityAttackInput): Promise<unknown>;
  entitySwingArm(input: SwingArmInput): Promise<unknown>;
  entityMount(input: EntityInput): Promise<unknown>;
  entityDismount(input: SessionInput): Promise<unknown>;
  entityMoveVehicle(input: MoveVehicleInput): Promise<unknown>;
  daemonRun(input: DaemonRunInput): Promise<unknown>;
}
