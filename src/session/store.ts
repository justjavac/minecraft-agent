import { randomBytes } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

export interface SessionRecord {
  session: string;
  pid: number;
  controlPort: number;
  token: string;
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
  startedAt: string;
}

export interface PublicSessionRecord {
  session: string;
  pid: number;
  controlPort: number;
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
  startedAt: string;
  alive: boolean;
}

const SESSION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{5,}$/;

export function getStateDir(): string {
  return process.env.MC_AGENT_STATE_DIR ?? join(homedir(), ".minecraft-cli", "sessions");
}

export function createSessionToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes < 32) {
    throw new Error("Session token must contain at least 32 random bytes.");
  }
  return randomBytes(bytes).toString("base64url");
}

export function validateSessionName(session: string): string {
  if (!SESSION_NAME_PATTERN.test(session)) {
    throw new Error("Session names must be 1-64 characters and contain only letters, numbers, dot, underscore, or hyphen.");
  }
  return session;
}

export function sessionFilePath(session: string, stateDir = getStateDir()): string {
  const root = resolve(stateDir);
  const file = resolve(root, `${encodeURIComponent(validateSessionName(session))}.json`);
  const pathFromRoot = relative(root, file);

  if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new Error("Session path escaped the session state directory.");
  }

  return file;
}

export async function writeSession(record: SessionRecord, stateDir = getStateDir()): Promise<void> {
  validateSessionName(record.session);
  assertToken(record.token);

  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  await chmodBestEffort(stateDir, 0o700);
  await writeFile(sessionFilePath(record.session, stateDir), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await chmodBestEffort(sessionFilePath(record.session, stateDir), 0o600);
}

export async function readSession(
  session: string,
  stateDir = getStateDir(),
  alive: (pid: number) => boolean = isProcessAlive,
): Promise<SessionRecord | undefined> {
  try {
    const raw = await readFile(sessionFilePath(session, stateDir), "utf8");
    const record = JSON.parse(raw) as SessionRecord;
    validateSessionName(record.session);
    assertToken(record.token);

    if (!alive(record.pid)) {
      await removeSession(record.session, stateDir);
      return undefined;
    }

    return record;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function removeSession(session: string, stateDir = getStateDir()): Promise<void> {
  await rm(sessionFilePath(session, stateDir), { force: true });
}

export async function listSessions(stateDir = getStateDir(), alive: (pid: number) => boolean = isProcessAlive): Promise<SessionRecord[]> {
  try {
    const files = await readdir(stateDir);
    const records = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => readSession(decodeURIComponent(file.slice(0, -".json".length)), stateDir, alive)),
    );
    return records
      .filter((record): record is SessionRecord => Boolean(record))
      .sort((a, b) => a.session.localeCompare(b.session));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function toPublicSession(record: SessionRecord): PublicSessionRecord {
  return {
    session: record.session,
    pid: record.pid,
    controlPort: record.controlPort,
    host: record.host,
    port: record.port,
    username: record.username,
    auth: record.auth,
    version: record.version,
    startedAt: record.startedAt,
    alive: isProcessAlive(record.pid),
  };
}

function assertToken(token: string): void {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Session token is missing or too weak for local daemon authentication.");
  }
}

async function chmodBestEffort(target: string, mode: number): Promise<void> {
  try {
    await chmod(target, mode);
  } catch {
    // POSIX modes are best-effort on some Windows file systems.
  }
}
