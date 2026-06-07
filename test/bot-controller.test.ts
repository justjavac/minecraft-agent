import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { EventStore } from "../src/core/events.js";
import { BotController } from "../src/daemon/bot.js";

class FakeBot extends EventEmitter {
  username = "AgentBot";
  health = 20;
  food = 20;
  chat = vi.fn();
  quit = vi.fn();
  setControlState = vi.fn();
  lookAt = vi.fn();
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
    bot.emit("kicked", "bye");
    bot.emit("error", new Error("bad"));
    bot.emit("end");

    expect(subject.status()).toMatchObject({ connected: false, lastError: "bad", lastEventId: 7 });
    expect(events.list(0, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "spawn" }),
        expect.objectContaining({ type: "whisper", sender: "Alex", text: "secret" }),
        expect.objectContaining({ type: "message", sender: "Server", text: "server says hi" }),
        expect.objectContaining({ type: "death" }),
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
});
