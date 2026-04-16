import { ServiceError } from "../../services/base.service";
import { entityTasksStorage } from "./entity-tasks.storage";
import { domainEvents } from "../../lib/events";
import { getChangedFields } from "../../audit";
import {
  insertEntityTaskSchema,
  updateEntityTaskSchema,
  type EntityTask,
  type EntityTaskWithRelations,
  type CreateEntityTask,
  type UpdateEntityTask,
} from "@shared/schema";

class EntityTasksService {
  private ensureExists<T>(value: T | null | undefined, entity: string, id?: string): T {
    if (!value) {
      throw new ServiceError("NOT_FOUND", `${entity}${id ? ` (${id})` : ""} not found`, 404);
    }
    return value;
  }

  async getTasks(entityType: string, entityId: string): Promise<EntityTaskWithRelations[]> {
    const tasks = await entityTasksStorage.getTasks(entityType, entityId);

    const parentTasks = tasks.filter((t) => !t.parentTaskId);
    const childTasks = tasks.filter((t) => t.parentTaskId);

    return parentTasks.map((parent) => ({
      ...parent,
      subTasks: childTasks
        .filter((c) => c.parentTaskId === parent.id)
        .map((c) => ({ ...c })),
    }));
  }

  async getAllTasks(): Promise<EntityTaskWithRelations[]> {
    return entityTasksStorage.getAllTasks();
  }

  async getMyTasks(userId: string): Promise<EntityTaskWithRelations[]> {
    return entityTasksStorage.getMyTasks(userId);
  }

  async getTaskById(taskId: string): Promise<EntityTask> {
    const task = await entityTasksStorage.getTaskById(taskId);
    return this.ensureExists(task, "EntityTask", taskId);
  }

  async createTask(data: CreateEntityTask, actorId: string): Promise<EntityTask> {
    const parsed = insertEntityTaskSchema.parse(data);

    const task = await entityTasksStorage.createTask({
      ...parsed,
      ownerId: parsed.ownerId || actorId,
      createdById: actorId,
    });

    domainEvents.emit({
      type: "entity_task:created",
      taskId: task.id,
      taskName: task.name,
      entityType: task.entityType,
      entityId: task.entityId,
      actorId,
      timestamp: new Date(),
    });

    return task;
  }

  async updateTask(
    entityType: string,
    entityId: string,
    taskId: string,
    data: Record<string, unknown>,
    actorId: string,
  ): Promise<EntityTask> {
    const existing = await this.getTaskById(taskId);
    if (existing.entityType !== entityType || existing.entityId !== entityId) {
      throw ServiceError.notFound("EntityTask", taskId);
    }

    const parsed = updateEntityTaskSchema.parse(data);
    if ("ownerId" in parsed && parsed.ownerId === null) {
      throw ServiceError.validation("Task owner is required and cannot be removed");
    }
    const updated = await entityTasksStorage.updateTask(taskId, parsed);

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    if (parsed.status === "done" && existing.status !== "done") {
      domainEvents.emit({
        type: "entity_task:completed",
        taskId,
        taskName: updated.name,
        entityType,
        entityId,
        actorId,
        timestamp: new Date(),
      });
    }

    domainEvents.emit({
      type: "entity_task:updated",
      taskId,
      taskName: updated.name,
      entityType,
      entityId,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return updated;
  }

  async deleteTask(
    entityType: string,
    entityId: string,
    taskId: string,
    actorId: string,
  ): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (task.entityType !== entityType || task.entityId !== entityId) {
      throw ServiceError.notFound("EntityTask", taskId);
    }

    await entityTasksStorage.deleteTask(taskId);

    domainEvents.emit({
      type: "entity_task:deleted",
      taskId,
      taskName: task.name,
      entityType,
      entityId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTaskCollaborators(taskId: string) {
    return entityTasksStorage.getTaskCollaborators(taskId);
  }

  async addTaskCollaborator(taskId: string, userId: string, actorId: string) {
    const task = await this.getTaskById(taskId);
    await entityTasksStorage.addTaskCollaborator(taskId, userId);

    domainEvents.emit({
      type: "entity_task:collaborator_added",
      taskId,
      entityType: task.entityType,
      entityId: task.entityId,
      userId,
      actorId,
      timestamp: new Date(),
    });
  }

  async removeTaskCollaborator(taskId: string, userId: string, actorId: string) {
    const task = await this.getTaskById(taskId);
    await entityTasksStorage.removeTaskCollaborator(taskId, userId);

    domainEvents.emit({
      type: "entity_task:collaborator_removed",
      taskId,
      entityType: task.entityType,
      entityId: task.entityId,
      userId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTaskTemplates(entityType?: string) {
    return entityTasksStorage.getTaskTemplates(entityType);
  }

  async createTaskTemplate(data: { entityType?: string; name: string; description?: string; sortOrder?: number }) {
    return entityTasksStorage.createTaskTemplate({
      entityType: data.entityType || "proposal",
      name: data.name,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
    });
  }

  async updateTaskTemplate(id: string, data: Partial<{ entityType: string; name: string; description: string | null; sortOrder: number }>) {
    return entityTasksStorage.updateTaskTemplate(id, data);
  }

  async deleteTaskTemplate(id: string) {
    return entityTasksStorage.deleteTaskTemplate(id);
  }
}

export const entityTasksService = new EntityTasksService();
