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
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
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
        sendJson(response, 200, { events: events.list(since, limit), lastEventId: events.getLastEventId() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/watch") {
        const since = Number(url.searchParams.get("since") ?? "0");
        response.writeHead(200, { "Content-Type": "application/x-ndjson" });
        response.flushHeaders();
        for (const event of events.list(since, 1000)) {
          response.write(`${JSON.stringify(event)}\n`);
        }
        const unsubscribe = events.subscribe((event) => response.write(`${JSON.stringify(event)}\n`));
        request.on("close", unsubscribe);
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat") {
        const body = (await readJson(request)) as { message?: string };
        controller.sendChat(String(body.message ?? ""));
        sendJson(response, 200, { sent: true });
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

      if (request.method === "POST" && url.pathname === "/control/tap") {
        const body = (await readJson(request)) as { state?: string; durationMs?: number };
        await controller.tap(String(body.state), Number(body.durationMs));
        sendJson(response, 200, { tapped: true, state: body.state, durationMs: body.durationMs });
        return;
      }

      if (request.method === "POST" && url.pathname === "/look/at") {
        const body = (await readJson(request)) as { x?: number; y?: number; z?: number };
        await controller.lookAt(Number(body.x), Number(body.y), Number(body.z));
        sendJson(response, 200, { looked: true, x: body.x, y: body.y, z: body.z });
        return;
      }

      sendJson(response, 404, { error: "not found" });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
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
