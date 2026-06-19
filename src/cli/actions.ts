import { fileURLToPath } from "node:url";
import { CliHandlers } from "./handlers.js";
import { CliError, sessionNotFound } from "../output/errors.js";
import { daemonRequest, loadSessionForClient } from "../daemon/client.js";
import { runDaemon } from "../daemon/server.js";
import { spawnSessionDaemon } from "../daemon/spawn.js";
import { listSessions, readSession, removeSession, toPublicSession } from "../session/store.js";

export function createCliHandlers(entryPoint = fileURLToPath(import.meta.url)): CliHandlers {
  return {
    async startSession(input) {
      const existing = await readSession(input.session);
      if (existing) {
        const publicRecord = toPublicSession(existing);
        if (publicRecord.alive) {
          throw new CliError(
            "SESSION_ALREADY_RUNNING",
            `Session '${input.session}' is already running.`,
            "Use 'mcagent session status' or stop it before starting a new session.",
            1,
          );
        }
        await removeSession(input.session);
      }

      const { controlPort } = await spawnSessionDaemon(input, entryPoint);
      return {
        session: input.session,
        host: input.host,
        port: input.port,
        username: input.username,
        auth: input.auth,
        controlPort,
      };
    },

    async sessionStatus(input) {
      const record = await loadSessionForClient(input.session);
      const status = await daemonRequest(record, "/status");
      return { ...toPublicSession(record), status };
    },

    async listSessions() {
      const sessions = await listSessions();
      return { sessions: sessions.map(toPublicSession) };
    },

    async stopSession(input) {
      const record = await loadSessionForClient(input.session);
      await daemonRequest(record, "/stop", { method: "POST", body: "{}" });
      return { session: input.session, stopped: true };
    },

    async observeEvents(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/events?since=${input.since}&limit=${input.limit}`);
    },

    async observeWatch(input) {
      const record = await loadSessionForClient(input.session);
      const response = await fetch(`http://127.0.0.1:${record.controlPort}/watch?since=${input.since}`, {
        headers: { Authorization: `Bearer ${record.token}` },
      });
      if (!response.ok || !response.body) {
        throw new CliError("DAEMON_ERROR", "Unable to watch daemon events.", "Restart the session and retry.", 1);
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          return;
        }
        process.stdout.write(Buffer.from(value));
      }
    },

    async sendChat(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chat", { method: "POST", body: JSON.stringify({ message: input.message }) });
    },

    async sendWhisper(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chat/whisper", { method: "POST", body: JSON.stringify({ username: input.username, message: input.message }) });
    },

    async tabComplete(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chat/tab-complete", {
        method: "POST",
        body: JSON.stringify({
          text: input.text,
          assumeCommand: input.assumeCommand,
          sendBlockInSight: input.sendBlockInSight,
          timeout: input.timeout,
        }),
      });
    },

    async botPosition(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/position");
    },

    async botInventory(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/inventory");
    },

    async botPlayers(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/players");
    },

    async botEntities(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/bot/entities?radius=${input.radius}&limit=${input.limit}`);
    },

    async botTablist(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/tablist");
    },

    async botScoreboards(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/scoreboards");
    },

    async botTeams(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/teams");
    },

    async botControls(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/controls");
    },

    async controlTap(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/control/tap", {
        method: "POST",
        body: JSON.stringify({ state: input.state, durationMs: input.durationMs }),
      });
    },

    async controlSet(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/control/set", {
        method: "POST",
        body: JSON.stringify({ state: input.state, value: input.value }),
      });
    },

    async controlClear(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/control/clear", { method: "POST", body: "{}" });
    },

    async lookAt(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/look/at", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async look(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/look/yaw-pitch", {
        method: "POST",
        body: JSON.stringify({ yaw: input.yaw, pitch: input.pitch, force: input.force }),
      });
    },

    async worldBlock(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/world/block?x=${input.x}&y=${input.y}&z=${input.z}`);
    },

    async worldBlockInfo(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/world/block-info?x=${input.x}&y=${input.y}&z=${input.z}`);
    },

    async worldBlockInSight(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/world/block-in-sight?maxSteps=${input.maxSteps}&vectorLength=${input.vectorLength}`);
    },

    async worldBlockAtCursor(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/world/block-at-cursor?maxDistance=${input.maxDistance}`);
    },

    async worldFindBlocks(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(
        record,
        `/world/find-blocks?name=${encodeURIComponent(input.name)}&radius=${input.radius}&count=${input.count}`,
      );
    },

    async navigateGoto(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/navigate/goto", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, range: input.range }),
      });
    },

    async navigateFollow(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/navigate/follow", {
        method: "POST",
        body: JSON.stringify({ player: input.player, range: input.range }),
      });
    },

    async navigateStop(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/navigate/stop", { method: "POST", body: "{}" });
    },

    async navigateStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/navigate/status");
    },

    async navigateConfigure(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/navigate/configure", {
        method: "POST",
        body: JSON.stringify({
          allowDig: input.allowDig,
          allowSprinting: input.allowSprinting,
          allowParkour: input.allowParkour,
          canOpenDoors: input.canOpenDoors,
          maxDropDown: input.maxDropDown,
          searchRadius: input.searchRadius,
          thinkTimeout: input.thinkTimeout,
          tickTimeout: input.tickTimeout,
        }),
      });
    },

    async collectItem(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/collect/item", {
        method: "POST",
        body: JSON.stringify({ id: input.id, range: input.range }),
      });
    },

    async inventoryEquip(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/equip", {
        method: "POST",
        body: JSON.stringify({ item: input.item, destination: input.destination }),
      });
    },

    async inventoryUnequip(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/unequip", {
        method: "POST",
        body: JSON.stringify({ destination: input.destination }),
      });
    },

    async inventoryQuickBar(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/quickbar", {
        method: "POST",
        body: JSON.stringify({ slot: input.slot }),
      });
    },

    async inventoryToss(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/toss", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async inventoryConsume(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/consume", { method: "POST", body: "{}" });
    },

    async inventoryFish(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/fish", { method: "POST", body: "{}" });
    },

    async inventoryActivateItem(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/activate-item", {
        method: "POST",
        body: JSON.stringify({ offhand: input.offhand }),
      });
    },

    async inventoryDeactivateItem(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/inventory/deactivate-item", { method: "POST", body: "{}" });
    },

    async inventoryRecipes(input) {
      const record = await loadSessionForClient(input.session);
      const table =
        input.tableX === undefined
          ? ""
          : `&tableX=${input.tableX}&tableY=${input.tableY ?? 0}&tableZ=${input.tableZ ?? 0}`;
      return daemonRequest(record, `/inventory/recipes?item=${encodeURIComponent(input.item)}&count=${input.count}${table}`);
    },

    async inventoryCraft(input) {
      const record = await loadSessionForClient(input.session);
      const table =
        input.tableX === undefined
          ? undefined
          : { x: input.tableX, y: input.tableY ?? 0, z: input.tableZ ?? 0 };
      return daemonRequest(record, "/inventory/craft", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count, table, recipeIndex: input.recipeIndex, recipeId: input.recipeId }),
      });
    },

    async worldDig(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/dig", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async worldStopDigging(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/stop-digging", { method: "POST", body: "{}" });
    },

    async worldPlace(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/place", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, face: input.face, item: input.item }),
      });
    },

    async worldPlaceEntity(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/place-entity", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, face: input.face, item: input.item }),
      });
    },

    async worldActivate(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/activate", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async worldUpdateSign(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/update-sign", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, text: input.text, back: input.back }),
      });
    },

    async worldSleep(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/sleep", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async worldWake(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/wake", { method: "POST", body: "{}" });
    },

    async worldElytraFly(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/world/elytra-fly", { method: "POST", body: "{}" });
    },

    async buildPlaceLine(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/build/place-line", {
        method: "POST",
        body: JSON.stringify({
          from: { x: input.fromX, y: input.fromY, z: input.fromZ },
          to: { x: input.toX, y: input.toY, z: input.toZ },
          face: input.face,
          item: input.item,
          maxBlocks: input.maxBlocks,
        }),
      });
    },

    async buildPlaceCuboidShell(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/build/place-cuboid-shell", {
        method: "POST",
        body: JSON.stringify({
          from: { x: input.fromX, y: input.fromY, z: input.fromZ },
          to: { x: input.toX, y: input.toY, z: input.toZ },
          face: input.face,
          item: input.item,
          maxBlocks: input.maxBlocks,
        }),
      });
    },

    async mineDigLine(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/mine/dig-line", {
        method: "POST",
        body: JSON.stringify({
          from: { x: input.fromX, y: input.fromY, z: input.fromZ },
          to: { x: input.toX, y: input.toY, z: input.toZ },
          maxBlocks: input.maxBlocks,
        }),
      });
    },

    async mineDigCuboid(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/mine/dig-cuboid", {
        method: "POST",
        body: JSON.stringify({
          from: { x: input.fromX, y: input.fromY, z: input.fromZ },
          to: { x: input.toX, y: input.toY, z: input.toZ },
          shell: input.shell,
          maxBlocks: input.maxBlocks,
        }),
      });
    },

    async cropInspect(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/crop/inspect?x=${input.x}&y=${input.y}&z=${input.z}`);
    },

    async cropPlant(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/crop/plant", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, item: input.item }),
      });
    },

    async cropHarvest(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/crop/harvest", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, onlyMature: input.onlyMature, replantItem: input.replantItem }),
      });
    },

    async cropFindMature(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/crop/find-mature?name=${encodeURIComponent(input.name)}&radius=${input.radius}&count=${input.count}`);
    },

    async windowOpenBlock(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/open-block", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async windowOpenEntity(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/open-entity", {
        method: "POST",
        body: JSON.stringify({ id: input.id }),
      });
    },

    async windowStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/status");
    },

    async windowDeposit(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/deposit", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async windowWithdraw(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/withdraw", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async windowClose(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/window/close", { method: "POST", body: "{}" });
    },

    async chestOpenBlock(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/open-block", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async chestOpenEntity(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/open-entity", {
        method: "POST",
        body: JSON.stringify({ id: input.id }),
      });
    },

    async chestStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/status");
    },

    async chestDeposit(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/deposit", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async chestWithdraw(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/withdraw", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async chestClose(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chest/close", { method: "POST", body: "{}" });
    },

    async furnaceOpen(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/open", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async furnaceStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/status");
    },

    async furnacePutInput(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/put-input", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async furnacePutFuel(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/put-fuel", {
        method: "POST",
        body: JSON.stringify({ item: input.item, count: input.count }),
      });
    },

    async furnaceTakeInput(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/take-input", { method: "POST", body: "{}" });
    },

    async furnaceTakeFuel(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/take-fuel", { method: "POST", body: "{}" });
    },

    async furnaceTakeOutput(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/furnace/take-output", { method: "POST", body: "{}" });
    },

    async anvilRename(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/anvil/rename", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, item: input.item, name: input.name }),
      });
    },

    async anvilCombine(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/anvil/combine", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z, firstItem: input.firstItem, secondItem: input.secondItem, name: input.name }),
      });
    },

    async enchantOpen(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/open", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async enchantStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/status");
    },

    async enchantPutTarget(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/put-target", { method: "POST", body: JSON.stringify({ item: input.item }) });
    },

    async enchantPutLapis(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/put-lapis", { method: "POST", body: JSON.stringify({ item: input.item }) });
    },

    async enchant(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/enchant", { method: "POST", body: JSON.stringify({ choice: input.choice }) });
    },

    async enchantTakeTarget(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/enchant/take-target", { method: "POST", body: "{}" });
    },

    async villagerOpen(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/villager/open", { method: "POST", body: JSON.stringify({ id: input.id }) });
    },

    async villagerStatus(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/villager/status");
    },

    async villagerTrade(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/villager/trade", { method: "POST", body: JSON.stringify({ index: input.index, times: input.times }) });
    },

    async entityActivate(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/activate", { method: "POST", body: JSON.stringify({ id: input.id }) });
    },

    async entityFind(input) {
      const record = await loadSessionForClient(input.session);
      const params = new URLSearchParams({
        radius: String(input.radius),
        limit: String(input.limit),
        includePlayers: String(input.includePlayers),
        includePassive: String(input.includePassive),
      });
      if (input.name) params.set("name", input.name);
      if (input.type) params.set("type", input.type);
      return daemonRequest(record, `/entity/find?${params.toString()}`);
    },

    async entityUseOn(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/use-on", { method: "POST", body: JSON.stringify({ id: input.id }) });
    },

    async entityAttack(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/attack", {
        method: "POST",
        body: JSON.stringify({ id: input.id, allowPlayers: input.allowPlayers, allowPassive: input.allowPassive }),
      });
    },

    async entitySwingArm(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/swing-arm", {
        method: "POST",
        body: JSON.stringify({ hand: input.hand, showHand: input.showHand }),
      });
    },

    async entityMount(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/mount", { method: "POST", body: JSON.stringify({ id: input.id }) });
    },

    async entityDismount(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/dismount", { method: "POST", body: "{}" });
    },

    async entityMoveVehicle(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/entity/move-vehicle", {
        method: "POST",
        body: JSON.stringify({ left: input.left, forward: input.forward }),
      });
    },

    async combatTargets(input) {
      const record = await loadSessionForClient(input.session);
      const params = new URLSearchParams({
        radius: String(input.radius),
        limit: String(input.limit),
        includePlayers: String(input.includePlayers),
        includePassive: String(input.includePassive),
      });
      if (input.name) params.set("name", input.name);
      if (input.type) params.set("type", input.type);
      return daemonRequest(record, `/combat/targets?${params.toString()}`);
    },

    async combatAttackNearest(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/combat/attack-nearest", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          type: input.type,
          radius: input.radius,
          allowPlayers: input.allowPlayers,
          allowPassive: input.allowPassive,
        }),
      });
    },

    async daemonRun(input) {
      const token = process.env.MC_AGENT_CONTROL_TOKEN;
      if (!token) {
        throw new CliError("BAD_INPUT", "Missing daemon token.", "Start daemons through 'mcagent session start'.", 3);
      }
      await runDaemon({ ...input, token });
      return { session: input.session, running: true };
    },
  };
}
