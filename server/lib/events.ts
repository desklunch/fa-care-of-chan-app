import { EventEmitter } from "events";
import type { Deal, DealStatus, DealTask } from "@shared/schema";

export interface DealCreatedEvent {
  type: "deal:created";
  deal: Deal;
  actorId: string;
  timestamp: Date;
}

export interface DealUpdatedEvent {
  type: "deal:updated";
  deal: Deal;
  changes: Partial<Deal>;
  actorId: string;
  timestamp: Date;
}

export interface DealDeletedEvent {
  type: "deal:deleted";
  dealId: string;
  displayName: string;
  actorId: string;
  timestamp: Date;
}

export interface DealStageChangedEvent {
  type: "deal:stage_changed";
  deal: Deal;
  fromStage: DealStatus;
  toStage: DealStatus;
  actorId: string;
  timestamp: Date;
}

export interface DealOwnerAssignedEvent {
  type: "deal:owner_assigned";
  deal: Deal;
  previousOwnerId: string | null;
  newOwnerId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealTaskCreatedEvent {
  type: "deal:task_created";
  task: DealTask;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealTaskUpdatedEvent {
  type: "deal:task_updated";
  task: DealTask;
  dealId: string;
  changes: Partial<DealTask>;
  actorId: string;
  timestamp: Date;
}

export interface DealTaskDeletedEvent {
  type: "deal:task_deleted";
  taskId: string;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface UserLoggedInEvent {
  type: "user:logged_in";
  userId: string;
  actorId: string;
  timestamp: Date;
  metadata?: {
    provider?: string;
    isNewUser?: boolean;
  };
}

export interface UserLoggedOutEvent {
  type: "user:logged_out";
  userId: string;
  actorId: string;
  timestamp: Date;
}

export interface SessionCreatedEvent {
  type: "session:created";
  sessionId: string;
  userId: string;
  actorId: string;
  timestamp: Date;
}

export interface SessionDestroyedEvent {
  type: "session:destroyed";
  sessionId: string;
  userId: string;
  actorId: string;
  timestamp: Date;
}

export type DomainEvent =
  | DealCreatedEvent
  | DealUpdatedEvent
  | DealDeletedEvent
  | DealStageChangedEvent
  | DealOwnerAssignedEvent
  | DealTaskCreatedEvent
  | DealTaskUpdatedEvent
  | DealTaskDeletedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | SessionCreatedEvent
  | SessionDestroyedEvent;

type EventMap = {
  "deal:created": DealCreatedEvent;
  "deal:updated": DealUpdatedEvent;
  "deal:deleted": DealDeletedEvent;
  "deal:stage_changed": DealStageChangedEvent;
  "deal:owner_assigned": DealOwnerAssignedEvent;
  "deal:task_created": DealTaskCreatedEvent;
  "deal:task_updated": DealTaskUpdatedEvent;
  "deal:task_deleted": DealTaskDeletedEvent;
  "user:logged_in": UserLoggedInEvent;
  "user:logged_out": UserLoggedOutEvent;
  "session:created": SessionCreatedEvent;
  "session:destroyed": SessionDestroyedEvent;
  "*": DomainEvent;
};

class DomainEventEmitter {
  private emitter = new EventEmitter();
  private recentEvents: DomainEvent[] = [];
  private maxRecentEvents = 100;

  emit<K extends keyof EventMap>(event: EventMap[K]): void {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop();
    }

    this.emitter.emit(event.type, event);
    this.emitter.emit("*", event);
  }

  on<K extends keyof EventMap>(
    eventType: K,
    handler: (event: EventMap[K]) => void
  ): void {
    this.emitter.on(eventType, handler);
  }

  off<K extends keyof EventMap>(
    eventType: K,
    handler: (event: EventMap[K]) => void
  ): void {
    this.emitter.off(eventType, handler);
  }

  getRecentEvents(limit: number = 50): DomainEvent[] {
    return this.recentEvents.slice(0, limit);
  }

  getRecentEventsByType<K extends Exclude<keyof EventMap, "*">>(
    eventType: K,
    limit: number = 20
  ): EventMap[K][] {
    return this.recentEvents
      .filter((e): e is EventMap[K] => e.type === eventType)
      .slice(0, limit);
  }
}

export const domainEvents = new DomainEventEmitter();
