import { readFileSync } from "node:fs";
import { Command, CommanderError } from "commander";
import { CliError } from "../output/errors.js";
import { createCliHandlers } from "./actions.js";
import { buildProgram } from "./program.js";

export function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version?: unknown };
  return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
}

export async function main(argv: string[]): Promise<number> {
  const program = buildProgram(createCliHandlers(argv[1]), {
    stdout: process.stdout,
    stderr: process.stderr,
    isStdoutTty: process.stdout.isTTY,
  }, readPackageVersion());
  program.exitOverride();

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }
    if (error instanceof CliError) {
      return error.exitCode;
    }
    throw error;
  }
}
