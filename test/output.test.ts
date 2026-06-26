import { Writable } from "node:stream";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { badInput, CliError, commandBlocked, normalizeError, sessionNotFound } from "../src/output/errors.js";
import { failure, formatDefaultText, resolveOutputMode, success, writeJson, writeText } from "../src/output/response.js";

class MemoryStream extends Writable {
  value = "";

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.value += chunk.toString();
    callback();
  }
}

describe("output errors", () => {
  it("creates typed CLI errors", () => {
    expect(badInput("bad")).toMatchObject({ code: "BAD_INPUT", exitCode: 3 });
    expect(commandBlocked("blocked", "fix")).toMatchObject({ code: "COMMAND_BLOCKED", remediation: "fix" });
    expect(sessionNotFound("x")).toMatchObject({ code: "SESSION_NOT_FOUND", exitCode: 4 });
  });

  it("normalizes different error shapes", () => {
    const cli = new CliError("BAD_INPUT", "bad", "fix", 3);
    expect(normalizeError(cli)).toBe(cli);

    const schema = z.object({ value: z.string().min(3) });
    const zodError = schema.safeParse({ value: "x" }).error!;
    expect(normalizeError(zodError)).toMatchObject({ code: "BAD_INPUT", message: expect.stringContaining("value") });
    const rootZodError = z.string().min(3).safeParse("x").error!;
    expect(normalizeError(rootZodError)).toMatchObject({ code: "BAD_INPUT", message: expect.stringContaining("value") });

    expect(normalizeError(new Error("boom"))).toMatchObject({ code: "UNKNOWN_ERROR", message: "boom" });
    expect(normalizeError("wat")).toMatchObject({ code: "UNKNOWN_ERROR", message: "Unknown error." });
  });
});

describe("output responses", () => {
  it("formats success, failure, and output modes", () => {
    const error = new CliError("DAEMON_ERROR", "boom", "restart", 1);
    expect(success({ ok: true })).toEqual({ ok: true, data: { ok: true } });
    expect(failure(error)).toEqual({ ok: false, error: { code: "DAEMON_ERROR", message: "boom", remediation: "restart" } });
    expect(resolveOutputMode(undefined, true)).toBe("text");
    expect(resolveOutputMode(undefined, false)).toBe("json");
    expect(resolveOutputMode("json", true)).toBe("json");
    expect(() => resolveOutputMode("xml", true)).toThrow("Invalid output mode");
  });

  it("writes JSON and text to streams", () => {
    const json = new MemoryStream();
    const text = new MemoryStream();
    writeJson(json, success({ value: 1 }));
    writeText(text, "hello");
    expect(json.value).toBe('{"ok":true,"data":{"value":1}}\n');
    expect(text.value).toBe("hello\n");
    expect(formatDefaultText("plain")).toBe("plain");
    expect(formatDefaultText({ nested: true })).toBe(JSON.stringify({ nested: true }, null, 2));
  });
});
