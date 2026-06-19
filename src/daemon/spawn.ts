import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getStateDir, readSession } from "../session/store.js";
import { CliError } from "../output/errors.js";
import { StartSessionInput } from "../cli/handlers.js";
import { daemonRequest } from "./client.js";

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate a local port."));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForDaemon(session: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let record;
    try {
      record = await readSession(session);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
    if (record) {
      try {
        await daemonRequest(record, "/status");
        return;
      } catch {
        // Keep polling until the daemon finishes binding and accepting requests.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new CliError("DAEMON_ERROR", "Session daemon did not become ready in time.", "Check the daemon log in the state directory.", 1);
}

export async function spawnSessionDaemon(input: StartSessionInput, entryPoint: string): Promise<{ controlPort: number }> {
  const controlPort = await getFreePort();
  const token = randomBytes(32).toString("hex");
  const stateDir = getStateDir();
  await mkdir(stateDir, { recursive: true });
  const logPath = join(stateDir, `${encodeURIComponent(input.session)}.log`);
  const logFd = openSync(logPath, "a");
  const args = [
    ...process.execArgv,
    entryPoint,
    "daemon",
    "run",
    "--control-port",
    String(controlPort),
    "--session",
    input.session,
    "--host",
    input.host,
    "--port",
    String(input.port),
    "--username",
    input.username,
    "--auth",
    input.auth,
  ];
  if (input.version) {
    args.push("--version", input.version);
  }

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      MC_AGENT_CONTROL_TOKEN: token,
    },
  });
  child.unref();
  await waitForDaemon(input.session, 10_000);
  return { controlPort };
}
