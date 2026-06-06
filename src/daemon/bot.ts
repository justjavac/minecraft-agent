import { EventEmitter } from "node:events";
import { createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { EventStore } from "../core/events.js";

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
  game?: { dimension?: string };
  health?: number;
  food?: number;
  inventory?: { items(): Array<{ name: string; count: number; slot: number; displayName?: string }> };
  chat(message: string): void;
  quit(reason?: string): void;
  setControlState(state: string, value: boolean): void;
  lookAt(position: Vec3): Promise<void> | void;
};

export type CreateBotFn = (options: Record<string, unknown>) => MineflayerBot;

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
      lastError: this.lastError,
      lastEventId: this.events.getLastEventId(),
    };
  }

  sendChat(message: string): void {
    this.requireBot().chat(message);
  }

  position() {
    const position = this.requireBot().entity?.position;
    return {
      position: position ? { x: position.x, y: position.y, z: position.z } : undefined,
      dimension: this.bot?.game?.dimension,
    };
  }

  inventory() {
    return {
      items: this.requireBot()
        .inventory?.items()
        .map((item) => ({ name: item.name, displayName: item.displayName, count: item.count, slot: item.slot })) ?? [],
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

  async lookAt(x: number, y: number, z: number): Promise<void> {
    await this.requireBot().lookAt(new Vec3(x, y, z));
  }

  stop(): void {
    this.bot?.quit("mc-agent session stop");
  }

  private requireBot(): MineflayerBot {
    if (!this.bot) {
      throw new Error("Bot is not started.");
    }
    return this.bot;
  }
}
