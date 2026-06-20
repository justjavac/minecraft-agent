import { describe, expect, it } from "vitest";
import { createPlaceholderHandlers } from "../src/cli/handlers.js";

describe("placeholder handlers", () => {
  it("throw NOT_IMPLEMENTED for every command before real handlers are wired", async () => {
    const handlers = createPlaceholderHandlers();
    const calls = [
      handlers.startSession({ session: "s", host: "h", port: 1, username: "u", auth: "offline", detach: false }),
      handlers.sessionStatus({ session: "s" }),
      handlers.listSessions(),
      handlers.stopSession({ session: "s" }),
      handlers.observeEvents({ session: "s", since: 0, limit: 1, types: [] }),
      handlers.observeWatch({ session: "s", since: 0, types: [] }),
      handlers.sendChat({ session: "s", message: "m", allowCommand: false }),
      handlers.botPosition({ session: "s" }),
      handlers.botInventory({ session: "s" }),
      handlers.botPlayers({ session: "s" }),
      handlers.botEntities({ session: "s", radius: 1, limit: 1 }),
      handlers.botTablist({ session: "s" }),
      handlers.botScoreboards({ session: "s" }),
      handlers.botTeams({ session: "s" }),
      handlers.botControls({ session: "s" }),
      handlers.controlTap({ session: "s", state: "forward", durationMs: 1 }),
      handlers.lookAt({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.worldBlock({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.worldFindBlocks({ session: "s", name: "dirt", radius: 1, count: 1 }),
      handlers.navigateGoto({ session: "s", x: 1, y: 2, z: 3, range: 1 }),
      handlers.navigateFollow({ session: "s", player: "p", range: 1 }),
      handlers.navigateStop({ session: "s" }),
      handlers.navigateStatus({ session: "s" }),
      handlers.navigateConfigure({ session: "s", allowDig: false }),
      handlers.collectItem({ session: "s", id: 1, range: 1 }),
      handlers.inventoryEquip({ session: "s", item: "dirt", destination: "hand" }),
      handlers.worldDig({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.worldPlace({ session: "s", x: 1, y: 2, z: 3, face: "up" }),
      handlers.worldActivate({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.windowOpenBlock({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.windowOpenEntity({ session: "s", id: 1 }),
      handlers.windowStatus({ session: "s" }),
      handlers.windowDeposit({ session: "s", item: "dirt", count: 1 }),
      handlers.windowWithdraw({ session: "s", item: "dirt", count: 1 }),
      handlers.windowClose({ session: "s" }),
      handlers.daemonRun({ session: "s", host: "h", port: 1, username: "u", auth: "offline", detach: false, controlPort: 2 }),
    ];

    for (const call of calls) {
      await expect(call).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    }
  });
});
