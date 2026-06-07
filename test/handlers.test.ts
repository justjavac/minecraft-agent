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
      handlers.observeEvents({ session: "s", since: 0, limit: 1 }),
      handlers.observeWatch({ session: "s", since: 0 }),
      handlers.sendChat({ session: "s", message: "m", allowCommand: false }),
      handlers.botPosition({ session: "s" }),
      handlers.botInventory({ session: "s" }),
      handlers.controlTap({ session: "s", state: "forward", durationMs: 1 }),
      handlers.lookAt({ session: "s", x: 1, y: 2, z: 3 }),
      handlers.daemonRun({ session: "s", host: "h", port: 1, username: "u", auth: "offline", detach: false, controlPort: 2 }),
    ];

    for (const call of calls) {
      await expect(call).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    }
  });
});
