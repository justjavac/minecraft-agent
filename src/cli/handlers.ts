import { notImplemented } from "../output/errors.js";

export interface StartSessionInput {
  session: string;
  host: string;
  port: number;
  username: string;
  auth: string;
  version?: string;
  detach: boolean;
}

export interface SessionInput {
  session: string;
}

export interface EventsInput extends SessionInput {
  since: number;
  limit: number;
}

export interface WatchInput extends SessionInput {
  since: number;
}

export interface ChatInput extends SessionInput {
  message: string;
  allowCommand: boolean;
}

export interface ControlTapInput extends SessionInput {
  state: string;
  durationMs: number;
}

export interface LookAtInput extends SessionInput {
  x: number;
  y: number;
  z: number;
}

export interface DaemonRunInput extends StartSessionInput {
  controlPort: number;
}

export interface CliHandlers {
  startSession(input: StartSessionInput): Promise<unknown>;
  sessionStatus(input: SessionInput): Promise<unknown>;
  listSessions(): Promise<unknown>;
  stopSession(input: SessionInput): Promise<unknown>;
  observeEvents(input: EventsInput): Promise<unknown>;
  observeWatch(input: WatchInput): Promise<void>;
  sendChat(input: ChatInput): Promise<unknown>;
  botPosition(input: SessionInput): Promise<unknown>;
  botInventory(input: SessionInput): Promise<unknown>;
  controlTap(input: ControlTapInput): Promise<unknown>;
  lookAt(input: LookAtInput): Promise<unknown>;
  daemonRun(input: DaemonRunInput): Promise<unknown>;
}

export function createPlaceholderHandlers(): CliHandlers {
  return {
    startSession: async () => {
      throw notImplemented("session start");
    },
    sessionStatus: async () => {
      throw notImplemented("session status");
    },
    listSessions: async () => {
      throw notImplemented("session list");
    },
    stopSession: async () => {
      throw notImplemented("session stop");
    },
    observeEvents: async () => {
      throw notImplemented("observe events");
    },
    observeWatch: async () => {
      throw notImplemented("observe watch");
    },
    sendChat: async () => {
      throw notImplemented("chat send");
    },
    botPosition: async () => {
      throw notImplemented("bot position");
    },
    botInventory: async () => {
      throw notImplemented("bot inventory");
    },
    controlTap: async () => {
      throw notImplemented("control tap");
    },
    lookAt: async () => {
      throw notImplemented("look at");
    },
    daemonRun: async () => {
      throw notImplemented("daemon run");
    },
  };
}
