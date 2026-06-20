import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { BotOptions, BotController, CreateBotFn } from "./bot.js";
import { EventStore } from "../core/events.js";
import { removeSession, SessionRecord, writeSession } from "../session/store.js";

export interface DaemonOptions extends BotOptions {
  session: string;
  controlPort: number;
  token: string;
  createBotFn?: CreateBotFn;
  exitOnStop?: boolean;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(payload);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    /* v8 ignore next -- Node HTTP request chunks are Buffers in supported runtimes; keep the fallback for defensive compatibility. */
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
  return request.headers.authorization === `Bearer ${token}`;
}

function eventTypesFromSearch(url: URL): string[] {
  return url.searchParams
    .getAll("type")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function eventMatchesTypes(event: { type: string }, types: readonly string[]): boolean {
  return types.length === 0 || types.includes(event.type);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNavigationFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("pathfinder") || normalized.includes("path to goal") || normalized.includes("no path") || normalized.includes("goal");
}

function daemonErrorResponse(error: unknown) {
  const message = errorMessage(error);
  if (isNavigationFailure(message)) {
    return {
      statusCode: 409,
      body: {
        error: message,
        code: "NAVIGATION_FAILED",
        remediation: "Inspect bot position, nearby blocks, and navigate status; then try a closer reachable goal or adjust pathfinder configuration.",
      },
    };
  }
  return {
    statusCode: 500,
    body: {
      error: message,
      code: "DAEMON_ERROR",
      remediation: "Inspect session status and the daemon log; restart the session daemon only if it is unhealthy.",
    },
  };
}

export async function runDaemon(options: DaemonOptions): Promise<void> {
  const events = new EventStore();
  const controller = new BotController(options, events, options.createBotFn);
  controller.start();

  const server = createServer(async (request, response) => {
    try {
      if (!isAuthorized(request, options.token)) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }

      /* v8 ignore next -- Incoming HTTP requests always provide a URL; fallback is defensive. */
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/status") {
        sendJson(response, 200, controller.status());
        return;
      }

      if (request.method === "POST" && url.pathname === "/stop") {
        sendJson(response, 200, { stopped: true });
        controller.stop();
        void removeSession(options.session).finally(() => {
          server.close();
          if (options.exitOnStop ?? true) {
            process.exit(0);
          }
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/events") {
        const since = Number(url.searchParams.get("since") ?? "0");
        const limit = Number(url.searchParams.get("limit") ?? "50");
        const types = eventTypesFromSearch(url);
        sendJson(response, 200, { events: events.list(since, limit, types), lastEventId: events.getLastEventId() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/watch") {
        const since = Number(url.searchParams.get("since") ?? "0");
        const types = eventTypesFromSearch(url);
        response.writeHead(200, { "Content-Type": "application/x-ndjson" });
        response.flushHeaders();
        for (const event of events.list(since, 1000, types)) {
          response.write(`${JSON.stringify(event)}\n`);
        }
        const unsubscribe = events.subscribe((event) => {
          if (eventMatchesTypes(event, types)) {
            response.write(`${JSON.stringify(event)}\n`);
          }
        });
        request.on("close", unsubscribe);
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat") {
        const body = (await readJson(request)) as { message?: string };
        controller.sendChat(String(body.message ?? ""));
        sendJson(response, 200, { sent: true });
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat/whisper") {
        const body = (await readJson(request)) as { username?: string; message?: string };
        controller.sendWhisper(String(body.username ?? ""), String(body.message ?? ""));
        sendJson(response, 200, { sent: true, username: body.username });
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat/tab-complete") {
        const body = (await readJson(request)) as { text?: string; assumeCommand?: boolean; sendBlockInSight?: boolean; timeout?: number };
        sendJson(
          response,
          200,
          await controller.tabComplete(
            String(body.text ?? ""),
            Boolean(body.assumeCommand ?? false),
            Boolean(body.sendBlockInSight ?? false),
            Number(body.timeout ?? 5000),
          ),
        );
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/position") {
        sendJson(response, 200, controller.position());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/inventory") {
        sendJson(response, 200, controller.inventory());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/players") {
        sendJson(response, 200, controller.players());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/entities") {
        const radius = Number(url.searchParams.get("radius") ?? "32");
        const limit = Number(url.searchParams.get("limit") ?? "50");
        sendJson(response, 200, controller.entities(radius, limit));
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/tablist") {
        sendJson(response, 200, controller.tablist());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/scoreboards") {
        sendJson(response, 200, controller.scoreboards());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/teams") {
        sendJson(response, 200, controller.teams());
        return;
      }

      if (request.method === "GET" && url.pathname === "/bot/controls") {
        sendJson(response, 200, controller.controls());
        return;
      }

      if (request.method === "GET" && url.pathname === "/world/block") {
        const x = Number(url.searchParams.get("x"));
        const y = Number(url.searchParams.get("y"));
        const z = Number(url.searchParams.get("z"));
        sendJson(response, 200, controller.blockAt(x, y, z));
        return;
      }

      if (request.method === "GET" && url.pathname === "/world/block-info") {
        const x = Number(url.searchParams.get("x"));
        const y = Number(url.searchParams.get("y"));
        const z = Number(url.searchParams.get("z"));
        sendJson(response, 200, controller.blockInfo(x, y, z));
        return;
      }

      if (request.method === "GET" && url.pathname === "/world/block-in-sight") {
        const maxSteps = Number(url.searchParams.get("maxSteps") ?? "256");
        const vectorLength = Number(url.searchParams.get("vectorLength") ?? "5");
        sendJson(response, 200, controller.blockInSight(maxSteps, vectorLength));
        return;
      }

      if (request.method === "GET" && url.pathname === "/world/block-at-cursor") {
        const maxDistance = Number(url.searchParams.get("maxDistance") ?? "5");
        sendJson(response, 200, controller.blockAtCursor(maxDistance));
        return;
      }

      if (request.method === "GET" && url.pathname === "/world/find-blocks") {
        const name = String(url.searchParams.get("name") ?? "");
        const radius = Number(url.searchParams.get("radius") ?? "32");
        const count = Number(url.searchParams.get("count") ?? "10");
        sendJson(response, 200, controller.findBlocks(name, radius, count));
        return;
      }

      if (request.method === "POST" && url.pathname === "/control/tap") {
        const body = (await readJson(request)) as { state?: string; durationMs?: number };
        await controller.tap(String(body.state), Number(body.durationMs));
        sendJson(response, 200, { tapped: true, state: body.state, durationMs: body.durationMs });
        return;
      }

      if (request.method === "POST" && url.pathname === "/control/set") {
        const body = (await readJson(request)) as { state?: string; value?: boolean };
        sendJson(response, 200, controller.setControl(String(body.state), Boolean(body.value)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/control/clear") {
        sendJson(response, 200, controller.clearControls());
        return;
      }

      if (request.method === "POST" && url.pathname === "/look/at") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        await controller.lookAt(Number(body.x), Number(body.y), Number(body.z));
        sendJson(response, 200, { looked: true, x: body.x, y: body.y, z: body.z });
        return;
      }

      if (request.method === "POST" && url.pathname === "/look/yaw-pitch") {
        const body = (await readJson(request)) as { yaw?: number; pitch?: number; force?: boolean };
        sendJson(response, 200, await controller.look(Number(body.yaw), Number(body.pitch), Boolean(body.force ?? false)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/navigate/goto") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; range?: number };
        await controller.goto(Number(body.x), Number(body.y), Number(body.z), Number(body.range ?? 1));
        sendJson(response, 200, { arrived: true, x: body.x, y: body.y, z: body.z, range: body.range ?? 1 });
        return;
      }

      if (request.method === "POST" && url.pathname === "/navigate/follow") {
        const body = (await readJson(request)) as { player?: string; range?: number };
        sendJson(response, 200, controller.follow(String(body.player ?? ""), Number(body.range ?? 2)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/navigate/stop") {
        sendJson(response, 200, controller.stopNavigation());
        return;
      }

      if (request.method === "GET" && url.pathname === "/navigate/status") {
        sendJson(response, 200, controller.navigationStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/navigate/configure") {
        const body = (await readJson(request)) as {
          allowDig?: boolean;
          allowSprinting?: boolean;
          allowParkour?: boolean;
          canOpenDoors?: boolean;
          maxDropDown?: number;
          searchRadius?: number;
          thinkTimeout?: number;
          tickTimeout?: number;
        };
        sendJson(response, 200, controller.configureNavigation(body));
        return;
      }

      if (request.method === "POST" && url.pathname === "/collect/item") {
        const body = (await readJson(request)) as { id?: number; range?: number };
        sendJson(response, 200, await controller.collectItem(Number(body.id), Number(body.range ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/equip") {
        const body = (await readJson(request)) as { item?: string; destination?: string };
        sendJson(response, 200, await controller.equip(String(body.item ?? ""), String(body.destination ?? "hand")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/unequip") {
        const body = (await readJson(request)) as { destination?: string };
        sendJson(response, 200, await controller.unequip(String(body.destination ?? "hand")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/quickbar") {
        const body = (await readJson(request)) as { slot?: number };
        sendJson(response, 200, controller.setQuickBarSlot(Number(body.slot)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/toss") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.toss(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/consume") {
        sendJson(response, 200, await controller.consume());
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/fish") {
        sendJson(response, 200, await controller.fish());
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/activate-item") {
        const body = (await readJson(request)) as { offhand?: boolean };
        sendJson(response, 200, controller.activateItem(Boolean(body.offhand ?? false)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/deactivate-item") {
        sendJson(response, 200, controller.deactivateItem());
        return;
      }

      if (request.method === "GET" && url.pathname === "/inventory/recipes") {
        const item = String(url.searchParams.get("item") ?? "");
        const count = Number(url.searchParams.get("count") ?? "1");
        const table = url.searchParams.has("tableX")
          ? {
              x: Number(url.searchParams.get("tableX")),
              y: Number(url.searchParams.get("tableY")),
              z: Number(url.searchParams.get("tableZ")),
            }
          : undefined;
        sendJson(response, 200, controller.recipes(item, count, table));
        return;
      }

      if (request.method === "POST" && url.pathname === "/inventory/craft") {
        const body = (await readJson(request)) as {
          item?: string;
          count?: number;
          table?: { x: number; y: number; z: number };
          recipeIndex?: number;
          recipeId?: string;
        };
        sendJson(response, 200, await controller.craft(String(body.item ?? ""), Number(body.count ?? 1), body.table, body.recipeIndex, body.recipeId));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/dig") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.dig(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/stop-digging") {
        sendJson(response, 200, controller.stopDigging());
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/place") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; face?: string; item?: string };
        sendJson(response, 200, await controller.place(Number(body.x), Number(body.y), Number(body.z), String(body.face ?? "up"), body.item));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/place-entity") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; face?: string; item?: string };
        sendJson(response, 200, await controller.placeEntity(Number(body.x), Number(body.y), Number(body.z), String(body.face ?? "up"), body.item));
        return;
      }

      if (request.method === "POST" && url.pathname === "/build/place-line") {
        const body = (await readJson(request)) as {
          from?: { x: number; y: number; z: number };
          to?: { x: number; y: number; z: number };
          face?: string;
          item?: string;
          maxBlocks?: number;
        };
        sendJson(
          response,
          200,
          await controller.placeLine({
            from: body.from ?? { x: 0, y: 0, z: 0 },
            to: body.to ?? { x: 0, y: 0, z: 0 },
            face: String(body.face ?? "up"),
            item: body.item,
            maxBlocks: Number(body.maxBlocks ?? 128),
          }),
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/build/place-cuboid-shell") {
        const body = (await readJson(request)) as {
          from?: { x: number; y: number; z: number };
          to?: { x: number; y: number; z: number };
          face?: string;
          item?: string;
          maxBlocks?: number;
        };
        sendJson(
          response,
          200,
          await controller.placeCuboidShell({
            from: body.from ?? { x: 0, y: 0, z: 0 },
            to: body.to ?? { x: 0, y: 0, z: 0 },
            face: String(body.face ?? "up"),
            item: body.item,
            maxBlocks: Number(body.maxBlocks ?? 512),
          }),
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/activate") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.activate(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/update-sign") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; text?: string; back?: boolean };
        sendJson(response, 200, controller.updateSign(Number(body.x), Number(body.y), Number(body.z), String(body.text ?? ""), Boolean(body.back ?? false)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/sleep") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.sleep(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/wake") {
        sendJson(response, 200, await controller.wake());
        return;
      }

      if (request.method === "POST" && url.pathname === "/world/elytra-fly") {
        sendJson(response, 200, await controller.elytraFly());
        return;
      }

      if (request.method === "POST" && url.pathname === "/mine/dig-line") {
        const body = (await readJson(request)) as {
          from?: { x: number; y: number; z: number };
          to?: { x: number; y: number; z: number };
          maxBlocks?: number;
        };
        sendJson(response, 200, await controller.digLine({ from: body.from ?? { x: 0, y: 0, z: 0 }, to: body.to ?? { x: 0, y: 0, z: 0 }, maxBlocks: Number(body.maxBlocks ?? 128) }));
        return;
      }

      if (request.method === "POST" && url.pathname === "/mine/dig-cuboid") {
        const body = (await readJson(request)) as {
          from?: { x: number; y: number; z: number };
          to?: { x: number; y: number; z: number };
          shell?: boolean;
          maxBlocks?: number;
        };
        sendJson(
          response,
          200,
          await controller.digCuboid({
            from: body.from ?? { x: 0, y: 0, z: 0 },
            to: body.to ?? { x: 0, y: 0, z: 0 },
            shell: Boolean(body.shell ?? false),
            maxBlocks: Number(body.maxBlocks ?? 512),
          }),
        );
        return;
      }

      if (request.method === "GET" && url.pathname === "/crop/inspect") {
        sendJson(response, 200, controller.inspectCrop(Number(url.searchParams.get("x")), Number(url.searchParams.get("y")), Number(url.searchParams.get("z"))));
        return;
      }

      if (request.method === "GET" && url.pathname === "/crop/find-mature") {
        sendJson(
          response,
          200,
          controller.findMatureCrops(String(url.searchParams.get("name") ?? ""), Number(url.searchParams.get("radius") ?? "32"), Number(url.searchParams.get("count") ?? "10")),
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/crop/plant") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; item?: string };
        sendJson(response, 200, await controller.plantCrop(Number(body.x), Number(body.y), Number(body.z), String(body.item ?? "")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/crop/harvest") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; onlyMature?: boolean; replantItem?: string };
        sendJson(response, 200, await controller.harvestCrop(Number(body.x), Number(body.y), Number(body.z), Boolean(body.onlyMature ?? true), body.replantItem));
        return;
      }

      if (request.method === "POST" && url.pathname === "/window/open-block") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.openWindowAt(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/window/open-entity") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, await controller.openEntityWindow(Number(body.id)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/window/status") {
        sendJson(response, 200, controller.windowStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/window/deposit") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.windowDeposit(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/window/withdraw") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.windowWithdraw(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/window/close") {
        sendJson(response, 200, controller.closeWindow());
        return;
      }

      if (request.method === "POST" && url.pathname === "/chest/open-block") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.openChestAt(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/chest/open-entity") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, await controller.openEntityChest(Number(body.id)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/chest/status") {
        sendJson(response, 200, controller.chestStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/chest/deposit") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.windowDeposit(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/chest/withdraw") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.windowWithdraw(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/chest/close") {
        sendJson(response, 200, controller.closeWindow());
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/open") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.openFurnaceAt(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/furnace/status") {
        sendJson(response, 200, controller.furnaceStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/put-input") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.furnacePutInput(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/put-fuel") {
        const body = (await readJson(request)) as { item?: string; count?: number };
        sendJson(response, 200, await controller.furnacePutFuel(String(body.item ?? ""), Number(body.count ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/take-input") {
        sendJson(response, 200, await controller.furnaceTake("input"));
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/take-fuel") {
        sendJson(response, 200, await controller.furnaceTake("fuel"));
        return;
      }

      if (request.method === "POST" && url.pathname === "/furnace/take-output") {
        sendJson(response, 200, await controller.furnaceTake("output"));
        return;
      }

      if (request.method === "POST" && url.pathname === "/anvil/rename") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; item?: string; name?: string };
        sendJson(response, 200, await controller.anvilRename(Number(body.x), Number(body.y), Number(body.z), String(body.item ?? ""), String(body.name ?? "")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/anvil/combine") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number; firstItem?: string; secondItem?: string; name?: string };
        sendJson(
          response,
          200,
          await controller.anvilCombine(Number(body.x), Number(body.y), Number(body.z), String(body.firstItem ?? ""), String(body.secondItem ?? ""), body.name),
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/enchant/open") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        sendJson(response, 200, await controller.openEnchantmentAt(Number(body.x), Number(body.y), Number(body.z)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/enchant/status") {
        sendJson(response, 200, controller.enchantmentStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/enchant/put-target") {
        const body = (await readJson(request)) as { item?: string };
        sendJson(response, 200, await controller.enchantmentPutTarget(String(body.item ?? "")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/enchant/put-lapis") {
        const body = (await readJson(request)) as { item?: string };
        sendJson(response, 200, await controller.enchantmentPutLapis(String(body.item ?? "")));
        return;
      }

      if (request.method === "POST" && url.pathname === "/enchant/enchant") {
        const body = (await readJson(request)) as { choice?: string | number };
        sendJson(response, 200, await controller.enchant(body.choice ?? 0));
        return;
      }

      if (request.method === "POST" && url.pathname === "/enchant/take-target") {
        sendJson(response, 200, await controller.enchantmentTakeTarget());
        return;
      }

      if (request.method === "POST" && url.pathname === "/villager/open") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, await controller.openVillagerWindow(Number(body.id)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/villager/status") {
        sendJson(response, 200, controller.villagerStatus());
        return;
      }

      if (request.method === "POST" && url.pathname === "/villager/trade") {
        const body = (await readJson(request)) as { index?: number; times?: number };
        sendJson(response, 200, await controller.villagerTrade(Number(body.index ?? 0), Number(body.times ?? 1)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/activate") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, await controller.activateEntity(Number(body.id)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/use-on") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, controller.useOnEntity(Number(body.id)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/attack") {
        const body = (await readJson(request)) as { id?: number; allowPlayers?: boolean; allowPassive?: boolean };
        sendJson(response, 200, controller.attackEntity(Number(body.id), { allowPlayers: body.allowPlayers, allowPassive: body.allowPassive }));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/swing-arm") {
        const body = (await readJson(request)) as { hand?: "left" | "right"; showHand?: boolean };
        sendJson(response, 200, controller.swingArm(body.hand ?? "right", Boolean(body.showHand ?? true)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/mount") {
        const body = (await readJson(request)) as { id?: number };
        sendJson(response, 200, controller.mountEntity(Number(body.id)));
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/dismount") {
        sendJson(response, 200, controller.dismount());
        return;
      }

      if (request.method === "POST" && url.pathname === "/entity/move-vehicle") {
        const body = (await readJson(request)) as { left?: number; forward?: number };
        sendJson(response, 200, controller.moveVehicle(Number(body.left ?? 0), Number(body.forward ?? 0)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/entity/find") {
        sendJson(
          response,
          200,
          controller.findEntities({
            name: url.searchParams.get("name") ?? undefined,
            type: url.searchParams.get("type") ?? undefined,
            radius: Number(url.searchParams.get("radius") ?? "32"),
            limit: Number(url.searchParams.get("limit") ?? "50"),
            includePlayers: url.searchParams.get("includePlayers") === "true",
            includePassive: url.searchParams.get("includePassive") === "true",
          }),
        );
        return;
      }

      if (request.method === "GET" && url.pathname === "/combat/targets") {
        sendJson(
          response,
          200,
          controller.findEntities({
            name: url.searchParams.get("name") ?? undefined,
            type: url.searchParams.get("type") ?? undefined,
            radius: Number(url.searchParams.get("radius") ?? "32"),
            limit: Number(url.searchParams.get("limit") ?? "20"),
            includePlayers: url.searchParams.get("includePlayers") === "true",
            includePassive: url.searchParams.get("includePassive") === "true",
          }),
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/combat/attack-nearest") {
        const body = (await readJson(request)) as { name?: string; type?: string; radius?: number; allowPlayers?: boolean; allowPassive?: boolean };
        sendJson(
          response,
          200,
          controller.attackNearest({
            name: body.name,
            type: body.type,
            radius: Number(body.radius ?? 32),
            allowPlayers: body.allowPlayers,
            allowPassive: body.allowPassive,
          }),
        );
        return;
      }

      sendJson(response, 404, { error: "not found" });
    } catch (error) {
      const { statusCode, body } = daemonErrorResponse(error);
      sendJson(response, statusCode, body);
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.controlPort, "127.0.0.1", resolve);
  });

  const record: SessionRecord = {
    session: options.session,
    pid: process.pid,
    controlPort: options.controlPort,
    token: options.token,
    host: options.host,
    port: options.port,
    username: options.username,
    auth: options.auth,
    version: options.version,
    startedAt: new Date().toISOString(),
  };
  await writeSession(record);
}
