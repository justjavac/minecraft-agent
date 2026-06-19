import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli/main.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("main", () => {
  it("returns Commander and CliError exit codes", async () => {
    await expect(main(["node", "mcagent", "skills", "get", "core"])).resolves.toBe(0);
    await expect(main(["node", "mcagent", "--help"])).resolves.toBe(0);
    await expect(main(["node", "mcagent", "--output", "json", "session", "status", "--session", "missing"])).resolves.toBe(4);
  });

  it("rethrows unexpected parser errors", async () => {
    vi.resetModules();
    vi.doMock("../src/cli/program.js", () => ({
      buildProgram: () => ({
        exitOverride: vi.fn(),
        parseAsync: vi.fn().mockRejectedValue(new TypeError("unexpected")),
      }),
    }));
    vi.doMock("../src/cli/actions.js", () => ({ createCliHandlers: vi.fn(() => ({})) }));
    const { main: mockedMain } = await import("../src/cli/main.js");

    await expect(mockedMain(["node", "mcagent"])).rejects.toThrow("unexpected");
  });
});
