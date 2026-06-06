import { describe, expect, it } from "vitest";
import { main } from "../src/cli/main.js";

describe("mc-agent help", () => {
  it("prints help without failing", async () => {
    const exitCode = await main(["node", "mc-agent", "--help"]);
    expect(exitCode).toBe(0);
  });
});
