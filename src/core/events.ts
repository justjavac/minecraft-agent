export interface BotEvent {
  id: number;
  type: string;
  timestamp: string;
  sender?: string;
  text?: string;
  raw?: unknown;
}

export class EventStore {
  private nextId = 1;
  private readonly events: BotEvent[] = [];
  private readonly subscribers = new Set<(event: BotEvent) => void>();

  constructor(private readonly maxEvents = 1000) {}

  add(event: Omit<BotEvent, "id" | "timestamp"> & { timestamp?: string }): BotEvent {
    const stored: BotEvent = {
      ...event,
      id: this.nextId,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    this.nextId += 1;
    this.events.push(stored);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    for (const subscriber of this.subscribers) {
      subscriber(stored);
    }
    return stored;
  }

  list(since: number, limit: number, types: readonly string[] = []): BotEvent[] {
    const typeFilter = types.length > 0 ? new Set(types) : undefined;
    return this.events
      .filter((event) => event.id > since && (!typeFilter || typeFilter.has(event.type)))
      .slice(0, limit);
  }

  getLastEventId(): number {
    return this.nextId - 1;
  }

  subscribe(subscriber: (event: BotEvent) => void): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }
}
