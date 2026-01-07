import { BaseService, ServiceError } from "./base.service";
import { domainEvents } from "../lib/events";
import type { IStorage } from "../storage";
import type {
  Deal,
  DealWithRelations,
  CreateDeal,
  UpdateDeal,
  DealStatus,
  DealTask,
  DealTaskWithRelations,
  CreateDealTask,
} from "@shared/schema";
import { insertDealSchema, updateDealSchema, insertDealTaskSchema } from "@shared/schema";

export interface ListDealsOptions {
  status?: DealStatus[];
}

export class DealsService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  async list(options?: ListDealsOptions): Promise<DealWithRelations[]> {
    return this.storage.getDeals(options);
  }

  async getById(id: string): Promise<DealWithRelations> {
    const deal = await this.storage.getDealById(id);
    return this.ensureExists(deal, "Deal", id);
  }

  async getByClientId(clientId: string): Promise<DealWithRelations[]> {
    return this.storage.getDealsByClientId(clientId);
  }

  async getByPrimaryContactId(contactId: string): Promise<DealWithRelations[]> {
    return this.storage.getDealsByPrimaryContactId(contactId);
  }

  async create(data: CreateDeal, actorId: string): Promise<Deal> {
    const parsed = insertDealSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid deal data", {
        errors: parsed.error.flatten(),
      });
    }

    const deal = await this.storage.createDeal(parsed.data, actorId);

    domainEvents.emit({
      type: "deal:created",
      deal,
      actorId,
      timestamp: new Date(),
    });

    return deal;
  }

  async update(id: string, data: UpdateDeal, actorId: string): Promise<Deal> {
    const existingDeal = this.ensureExists(
      await this.storage.getDealById(id),
      "Deal",
      id
    );

    const parsed = updateDealSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid deal update data", {
        errors: parsed.error.flatten(),
      });
    }

    const updatedDeal = await this.storage.updateDeal(id, parsed.data);
    if (!updatedDeal) {
      throw ServiceError.notFound("Deal", id);
    }

    const changes = this.computeChanges(existingDeal, updatedDeal);

    domainEvents.emit({
      type: "deal:updated",
      deal: updatedDeal,
      changes,
      actorId,
      timestamp: new Date(),
    });

    if (existingDeal.status !== updatedDeal.status) {
      domainEvents.emit({
        type: "deal:stage_changed",
        deal: updatedDeal,
        fromStage: existingDeal.status as DealStatus,
        toStage: updatedDeal.status as DealStatus,
        actorId,
        timestamp: new Date(),
      });
    }

    if (existingDeal.ownerId !== updatedDeal.ownerId && updatedDeal.ownerId) {
      domainEvents.emit({
        type: "deal:owner_assigned",
        deal: updatedDeal,
        previousOwnerId: existingDeal.ownerId,
        newOwnerId: updatedDeal.ownerId,
        actorId,
        timestamp: new Date(),
      });
    }

    return updatedDeal;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const deal = this.ensureExists(
      await this.storage.getDealById(id),
      "Deal",
      id
    );

    await this.storage.deleteDeal(id);

    domainEvents.emit({
      type: "deal:deleted",
      dealId: id,
      displayName: deal.displayName,
      actorId,
      timestamp: new Date(),
    });
  }

  async moveToStage(id: string, newStage: DealStatus, actorId: string): Promise<Deal> {
    const existingDeal = this.ensureExists(
      await this.storage.getDealById(id),
      "Deal",
      id
    );

    if (existingDeal.status === newStage) {
      return existingDeal;
    }

    const updatedDeal = await this.storage.updateDeal(id, { status: newStage });
    if (!updatedDeal) {
      throw ServiceError.notFound("Deal", id);
    }

    domainEvents.emit({
      type: "deal:stage_changed",
      deal: updatedDeal,
      fromStage: existingDeal.status as DealStatus,
      toStage: newStage,
      actorId,
      timestamp: new Date(),
    });

    return updatedDeal;
  }

  async assignOwner(id: string, ownerId: string, actorId: string): Promise<Deal> {
    const existingDeal = this.ensureExists(
      await this.storage.getDealById(id),
      "Deal",
      id
    );

    if (existingDeal.ownerId === ownerId) {
      return existingDeal;
    }

    const updatedDeal = await this.storage.updateDeal(id, { ownerId });
    if (!updatedDeal) {
      throw ServiceError.notFound("Deal", id);
    }

    domainEvents.emit({
      type: "deal:owner_assigned",
      deal: updatedDeal,
      previousOwnerId: existingDeal.ownerId,
      newOwnerId: ownerId,
      actorId,
      timestamp: new Date(),
    });

    return updatedDeal;
  }

  async reorder(dealIds: string[], _actorId: string): Promise<void> {
    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      throw ServiceError.validation("dealIds must be a non-empty array");
    }

    await this.storage.reorderDeals(dealIds);
  }

  async getTasks(dealId: string): Promise<DealTaskWithRelations[]> {
    this.ensureExists(
      await this.storage.getDealById(dealId),
      "Deal",
      dealId
    );

    return this.storage.getDealTasks(dealId);
  }

  async createTask(data: CreateDealTask, actorId: string): Promise<DealTask> {
    this.ensureExists(
      await this.storage.getDealById(data.dealId),
      "Deal",
      data.dealId
    );

    const parsed = insertDealTaskSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid task data", {
        errors: parsed.error.flatten(),
      });
    }

    const task = await this.storage.createDealTask(parsed.data, actorId);

    domainEvents.emit({
      type: "deal:task_created",
      task,
      dealId: data.dealId,
      actorId,
      timestamp: new Date(),
    });

    return task;
  }

  async updateTask(
    dealId: string,
    taskId: string,
    data: { completed?: boolean; assignedUserId?: string | null; dueDate?: string | null; title?: string },
    actorId: string
  ): Promise<DealTask> {
    const existingTask = this.ensureExists(
      await this.storage.getDealTaskById(taskId),
      "Task",
      taskId
    );

    if (existingTask.dealId !== dealId) {
      throw ServiceError.validation("Task does not belong to the specified deal");
    }

    const updatedTask = await this.storage.updateDealTask(taskId, data);
    if (!updatedTask) {
      throw ServiceError.notFound("Task", taskId);
    }

    domainEvents.emit({
      type: "deal:task_updated",
      task: updatedTask,
      dealId,
      changes: data,
      actorId,
      timestamp: new Date(),
    });

    return updatedTask;
  }

  async deleteTask(dealId: string, taskId: string, actorId: string): Promise<void> {
    const existingTask = this.ensureExists(
      await this.storage.getDealTaskById(taskId),
      "Task",
      taskId
    );

    if (existingTask.dealId !== dealId) {
      throw ServiceError.validation("Task does not belong to the specified deal");
    }

    await this.storage.deleteDealTask(taskId);

    domainEvents.emit({
      type: "deal:task_deleted",
      taskId,
      dealId,
      actorId,
      timestamp: new Date(),
    });
  }

  private computeChanges(before: DealWithRelations, after: Deal): Partial<Deal> {
    const changes: Partial<Deal> = {};
    const keys = Object.keys(after) as (keyof Deal)[];

    for (const key of keys) {
      const beforeValue = (before as Record<string, unknown>)[key];
      const afterValue = (after as Record<string, unknown>)[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        (changes as Record<string, unknown>)[key] = afterValue;
      }
    }

    return changes;
  }
}
