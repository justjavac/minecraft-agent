import { describe, expect, it } from "vitest";
import { main } from "../src/cli/main.js";

describe("mcagent help", () => {
  it("prints help without failing", async () => {
    const exitCode = await main(["node", "mcagent", "--help"]);
    expect(exitCode).toBe(0);
  });
});
