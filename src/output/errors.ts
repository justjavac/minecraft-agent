import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_INPUT"
  | "CONNECTION_FAILED"
  | "SESSION_NOT_FOUND"
  | "SESSION_ALREADY_RUNNING"
  | "COMMAND_BLOCKED"
  | "DAEMON_ERROR"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN_ERROR";

export class CliError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: number;
  readonly remediation: string;

  constructor(code: ErrorCode, message: string, remediation: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = exitCode;
    this.remediation = remediation;
  }
}

export function badInput(message: string, remediation = "Check the command help and retry."): CliError {
  return new CliError("BAD_INPUT", message, remediation, 3);
}

export function commandBlocked(message: string, remediation: string): CliError {
  return new CliError("COMMAND_BLOCKED", message, remediation, 3);
}

export function sessionNotFound(session: string): CliError {
  return new CliError(
    "SESSION_NOT_FOUND",
    `Session '${session}' is not running.`,
    "Start it with 'mc-agent session start --session <name>'.",
    4,
  );
}

export function notImplemented(feature: string): CliError {
  return new CliError(
    "NOT_IMPLEMENTED",
    `${feature} is not implemented yet.`,
    "Finish the daemon implementation and retry.",
    1,
  );
}

export function normalizeError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof ZodError) {
    return badInput(
      error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; "),
    );
  }

  if (error instanceof Error) {
    return new CliError("UNKNOWN_ERROR", error.message, "Inspect stderr logs, then retry or file a bug.", 1);
  }

  return new CliError("UNKNOWN_ERROR", "Unknown error.", "Retry with --output json for details.", 1);
}
