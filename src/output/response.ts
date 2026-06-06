import { Writable } from "node:stream";
import { CliError } from "./errors.js";

export type OutputMode = "json" | "text";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    remediation: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function failure(error: CliError): ApiFailure {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      remediation: error.remediation,
    },
  };
}

export function resolveOutputMode(value: unknown, isTty: boolean | undefined): OutputMode {
  if (value === undefined) {
    return isTty ? "text" : "json";
  }
  if (value === "json" || value === "text") {
    return value;
  }
  throw new CliError("BAD_INPUT", "Invalid output mode.", "Use --output json or --output text.", 3);
}

export function writeJson(stream: Writable, response: ApiResponse<unknown>): void {
  stream.write(`${JSON.stringify(response)}\n`);
}

export function writeText(stream: Writable, text: string): void {
  stream.write(`${text}\n`);
}

export function formatDefaultText(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  return JSON.stringify(data, null, 2);
}
