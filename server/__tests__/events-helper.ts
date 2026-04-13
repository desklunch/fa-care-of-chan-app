import { domainEvents } from "../lib/events";
import type { DomainEvent } from "../lib/events";

export class EventCapture {
  private events: DomainEvent[] = [];
  private handler: (e: DomainEvent) => void;

  constructor() {
    this.handler = (e: DomainEvent) => {
      this.events.push(e);
    };
    domainEvents.on("*", this.handler);
  }

  get all(): DomainEvent[] {
    return [...this.events];
  }

  ofType<T extends DomainEvent["type"]>(type: T): Extract<DomainEvent, { type: T }>[] {
    return this.events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
  }

  clear(): void {
    this.events = [];
  }

  dispose(): void {
    domainEvents.off("*", this.handler);
    this.events = [];
  }
}
