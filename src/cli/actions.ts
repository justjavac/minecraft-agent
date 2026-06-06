import { fileURLToPath } from "node:url";
import { CliHandlers } from "./handlers.js";
import { CliError, sessionNotFound } from "../output/errors.js";
import { daemonRequest, loadSessionForClient } from "../daemon/client.js";
import { runDaemon } from "../daemon/server.js";
import { spawnSessionDaemon } from "../daemon/spawn.js";
import { listSessions, readSession, removeSession, toPublicSession } from "../session/store.js";

export function createCliHandlers(entryPoint = fileURLToPath(import.meta.url)): CliHandlers {
  return {
    async startSession(input) {
      const existing = await readSession(input.session);
      if (existing) {
        const publicRecord = toPublicSession(existing);
        if (publicRecord.alive) {
          throw new CliError(
            "SESSION_ALREADY_RUNNING",
            `Session '${input.session}' is already running.`,
            "Use 'mc-agent session status' or stop it before starting a new session.",
            1,
          );
        }
        await removeSession(input.session);
      }

      const { controlPort } = await spawnSessionDaemon(input, entryPoint);
      return {
        session: input.session,
        host: input.host,
        port: input.port,
        username: input.username,
        auth: input.auth,
        controlPort,
      };
    },

    async sessionStatus(input) {
      const record = await loadSessionForClient(input.session);
      const status = await daemonRequest(record, "/status");
      return { ...toPublicSession(record), status };
    },

    async listSessions() {
      const sessions = await listSessions();
      return { sessions: sessions.map(toPublicSession) };
    },

    async stopSession(input) {
      const record = await loadSessionForClient(input.session);
      await daemonRequest(record, "/stop", { method: "POST", body: "{}" });
      return { session: input.session, stopped: true };
    },

    async observeEvents(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, `/events?since=${input.since}&limit=${input.limit}`);
    },

    async observeWatch(input) {
      const record = await loadSessionForClient(input.session);
      const response = await fetch(`http://127.0.0.1:${record.controlPort}/watch?since=${input.since}`, {
        headers: { Authorization: `Bearer ${record.token}` },
      });
      if (!response.ok || !response.body) {
        throw new CliError("DAEMON_ERROR", "Unable to watch daemon events.", "Restart the session and retry.", 1);
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          return;
        }
        process.stdout.write(Buffer.from(value));
      }
    },

    async sendChat(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/chat", { method: "POST", body: JSON.stringify({ message: input.message }) });
    },

    async botPosition(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/position");
    },

    async botInventory(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/bot/inventory");
    },

    async controlTap(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/control/tap", {
        method: "POST",
        body: JSON.stringify({ state: input.state, durationMs: input.durationMs }),
      });
    },

    async lookAt(input) {
      const record = await loadSessionForClient(input.session);
      return daemonRequest(record, "/look/at", {
        method: "POST",
        body: JSON.stringify({ x: input.x, y: input.y, z: input.z }),
      });
    },

    async daemonRun(input) {
      const token = process.env.MC_AGENT_CONTROL_TOKEN;
      if (!token) {
        throw new CliError("BAD_INPUT", "Missing daemon token.", "Start daemons through 'mc-agent session start'.", 3);
      }
      await runDaemon({ ...input, token });
      return { session: input.session, running: true };
    },
  };
}
