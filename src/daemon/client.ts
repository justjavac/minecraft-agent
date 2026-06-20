import { CliError, type ErrorCode, sessionNotFound } from "../output/errors.js";
import { readSession, SessionRecord } from "../session/store.js";

const daemonErrorCodes = new Set<ErrorCode>(["BAD_INPUT", "DAEMON_ERROR", "NAVIGATION_FAILED"]);

function daemonErrorCode(value: unknown): ErrorCode {
  return typeof value === "string" && daemonErrorCodes.has(value as ErrorCode) ? (value as ErrorCode) : "DAEMON_ERROR";
}

function daemonErrorExitCode(code: ErrorCode): number {
  return code === "BAD_INPUT" ? 3 : 1;
}

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
    const errorBody = body as { code?: unknown; error?: unknown; message?: unknown; remediation?: unknown };
    const code = daemonErrorCode(errorBody.code);
    const message =
      typeof errorBody.error === "string"
        ? errorBody.error
        : typeof errorBody.message === "string"
          ? errorBody.message
          : `Daemon returned HTTP ${response.status}.`;
    const remediation =
      typeof errorBody.remediation === "string"
        ? errorBody.remediation
        : "Inspect session status and the daemon log; restart the session daemon only if it is unhealthy.";
    throw new CliError(code, message, remediation, daemonErrorExitCode(code));
  }
  return body as T;
}
