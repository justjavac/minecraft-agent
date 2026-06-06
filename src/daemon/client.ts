import { CliError, sessionNotFound } from "../output/errors.js";
import { readSession, SessionRecord } from "../session/store.js";

export async function loadSessionForClient(session: string): Promise<SessionRecord> {
  const record = await readSession(session);
  if (!record) {
    throw sessionNotFound(session);
  }
  return record;
}

export async function daemonRequest<T>(
  record: SessionRecord,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`http://127.0.0.1:${record.controlPort}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${record.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new CliError("DAEMON_ERROR", body.error ?? `Daemon returned HTTP ${response.status}.`, "Restart the session daemon.", 1);
  }
  return body as T;
}
