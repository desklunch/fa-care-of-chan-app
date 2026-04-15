import { BaseService, ServiceError } from "../../services/base.service";
import { proposalsStorage } from "./proposals.storage";
import { dealsStorage } from "../deals/deals.storage";
import { domainEvents } from "../../lib/events";
import { getChangedFields } from "../../audit";
import {
  insertProposalSchema,
  updateProposalSchema,
  insertProposalTaskSchema,
  updateProposalTaskSchema,
  type Proposal,
  type InsertProposal,
  type ProposalWithRelations,
  type ProposalTask,
  type ProposalTaskWithRelations,
  type CreateProposal,
  type UpdateProposal,
} from "@shared/schema";

const QUALIFIED_LEAD_STATUS_NAME = "Qualified Lead";

class ProposalsService extends BaseService {
  async list(): Promise<ProposalWithRelations[]> {
    return proposalsStorage.getProposals();
  }

  async getById(id: string): Promise<ProposalWithRelations> {
    const proposal = await proposalsStorage.getProposalById(id);
    return this.ensureExists(proposal, "Proposal", id);
  }

  async getByDealId(dealId: string): Promise<Proposal | null> {
    return proposalsStorage.getProposalByDealId(dealId);
  }

  async create(data: CreateProposal, actorId: string): Promise<ProposalWithRelations> {
    const parsed = insertProposalSchema.parse(data);

    const existing = await proposalsStorage.getProposalByDealId(parsed.dealId);
    if (existing) {
      throw ServiceError.conflict("A proposal already exists for this deal");
    }

    const deal = await dealsStorage.getDealById(parsed.dealId);
    if (!deal) {
      throw ServiceError.notFound("Deal", parsed.dealId);
    }

    const allDealStatuses = await dealsStorage.getDealStatuses();
    const dealStatus = allDealStatuses.find((s) => s.id === deal.status);
    const qualifiedLeadStatus = allDealStatuses.find(
      (s) => s.name === QUALIFIED_LEAD_STATUS_NAME,
    );
    const qualifiedSortOrder = qualifiedLeadStatus?.sortOrder ?? 3;
    if (!dealStatus || dealStatus.sortOrder < qualifiedSortOrder) {
      throw ServiceError.validation(
        "Deal must be at or past the 'Qualified Lead' stage to create a proposal",
      );
    }

    let statusId = parsed.status;
    if (!statusId) {
      const defaultStatus = await proposalsStorage.getDefaultStatus();
      if (defaultStatus) {
        statusId = defaultStatus.id;
      } else {
        const statuses = await proposalsStorage.getProposalStatuses();
        if (statuses.length > 0) {
          statusId = statuses[0].id;
        } else {
          throw ServiceError.validation("No proposal statuses configured");
        }
      }
    }

    const insertData: InsertProposal = {
      title: parsed.title,
      dealId: parsed.dealId,
      status: statusId,
      clientId: parsed.clientId ?? deal.clientId ?? null,
      ownerId: parsed.ownerId ?? deal.ownerId ?? null,
      description: parsed.description ?? null,
      budgetLow: parsed.budgetLow ?? deal.budgetLow ?? null,
      budgetHigh: parsed.budgetHigh ?? deal.budgetHigh ?? null,
      budgetNotes: parsed.budgetNotes ?? deal.budgetNotes ?? null,
      locations: deal.locations ?? [],
      eventSchedule: deal.eventSchedule ?? [],
      serviceIds: deal.serviceIds ?? [],
      createdById: actorId,
    };

    const proposal = await proposalsStorage.createProposal(insertData);

    const templates = await proposalsStorage.getTaskTemplates();
    for (const template of templates) {
      await proposalsStorage.createTask({
        proposalId: proposal.id,
        name: template.name,
        description: template.description,
        sortOrder: template.sortOrder,
        status: "todo",
        ownerId: actorId,
        createdById: actorId,
      });
    }

    if (deal.ownerId) {
      try {
        await proposalsStorage.addStakeholder({
          proposalId: proposal.id,
          userId: deal.ownerId,
        });
      } catch {
        // ignore if stakeholder already exists
      }
    }

    if (deal.primaryContactId) {
      try {
        await proposalsStorage.addStakeholder({
          proposalId: proposal.id,
          contactId: deal.primaryContactId,
        });
      } catch {
        // ignore if stakeholder already exists
      }
    }

    domainEvents.emit({
      type: "proposal:created",
      proposalId: proposal.id,
      proposalTitle: proposal.title,
      dealId: proposal.dealId,
      actorId,
      timestamp: new Date(),
    });

    return this.getById(proposal.id);
  }

  async update(
    id: string,
    data: UpdateProposal,
    actorId: string,
  ): Promise<ProposalWithRelations> {
    const existing = await this.getById(id);
    const parsed = updateProposalSchema.parse(data);

    const updated = await proposalsStorage.updateProposal(id, parsed);

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    if (parsed.status !== undefined && parsed.status !== existing.status) {
      const statuses = await proposalsStorage.getProposalStatuses();
      const fromName = statuses.find((s) => s.id === existing.status)?.label ?? String(existing.status);
      const toName = statuses.find((s) => s.id === parsed.status)?.label ?? String(parsed.status);

      domainEvents.emit({
        type: "proposal:status_changed",
        proposalId: id,
        proposalTitle: updated.title,
        fromStatus: fromName,
        toStatus: toName,
        actorId,
        timestamp: new Date(),
      });
    }

    domainEvents.emit({
      type: "proposal:updated",
      proposalId: id,
      proposalTitle: updated.title,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return this.getById(id);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const proposal = await this.getById(id);
    await proposalsStorage.deleteProposal(id);

    domainEvents.emit({
      type: "proposal:deleted",
      proposalId: id,
      proposalTitle: proposal.title,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTasks(proposalId: string): Promise<ProposalTaskWithRelations[]> {
    await this.getById(proposalId);
    const tasks = await proposalsStorage.getTasks(proposalId);

    const parentTasks = tasks.filter((t) => !t.parentTaskId);
    const childTasks = tasks.filter((t) => t.parentTaskId);

    return parentTasks.map((parent) => ({
      ...parent,
      subTasks: childTasks
        .filter((c) => c.parentTaskId === parent.id)
        .map((c) => ({ ...c })),
    }));
  }

  async getTaskById(taskId: string): Promise<ProposalTask> {
    const task = await proposalsStorage.getTaskById(taskId);
    return this.ensureExists(task, "ProposalTask", taskId);
  }

  async createTask(
    data: { proposalId: string; name: string; description?: string; status?: string; ownerId?: string; parentTaskId?: string; dueDate?: string; startDate?: string },
    actorId: string,
  ): Promise<ProposalTask> {
    await this.getById(data.proposalId);
    const parsed = insertProposalTaskSchema.parse(data);

    const task = await proposalsStorage.createTask({
      ...parsed,
      ownerId: parsed.ownerId || actorId,
      createdById: actorId,
    });

    domainEvents.emit({
      type: "proposal:task_created",
      taskId: task.id,
      taskName: task.name,
      proposalId: task.proposalId,
      actorId,
      timestamp: new Date(),
    });

    return task;
  }

  async updateTask(
    proposalId: string,
    taskId: string,
    data: Record<string, unknown>,
    actorId: string,
  ): Promise<ProposalTask> {
    const existing = await this.getTaskById(taskId);
    if (existing.proposalId !== proposalId) {
      throw ServiceError.notFound("ProposalTask", taskId);
    }

    const parsed = updateProposalTaskSchema.parse(data);
    if ("ownerId" in parsed && parsed.ownerId === null) {
      throw ServiceError.validation("Task owner is required and cannot be removed");
    }
    const updated = await proposalsStorage.updateTask(taskId, parsed);

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    if (parsed.status === "done" && existing.status !== "done") {
      domainEvents.emit({
        type: "proposal:task_completed",
        taskId,
        taskName: updated.name,
        proposalId,
        actorId,
        timestamp: new Date(),
      });
    }

    domainEvents.emit({
      type: "proposal:task_updated",
      taskId,
      taskName: updated.name,
      proposalId,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return updated;
  }

  async deleteTask(
    proposalId: string,
    taskId: string,
    actorId: string,
  ): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (task.proposalId !== proposalId) {
      throw ServiceError.notFound("ProposalTask", taskId);
    }

    await proposalsStorage.deleteTask(taskId);

    domainEvents.emit({
      type: "proposal:task_deleted",
      taskId,
      taskName: task.name,
      proposalId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTaskCollaborators(taskId: string) {
    return proposalsStorage.getTaskCollaborators(taskId);
  }

  async addTaskCollaborator(taskId: string, userId: string, actorId: string) {
    const task = await this.getTaskById(taskId);
    await proposalsStorage.addTaskCollaborator(taskId, userId);

    domainEvents.emit({
      type: "proposal:collaborator_added",
      taskId,
      proposalId: task.proposalId,
      userId,
      actorId,
      timestamp: new Date(),
    });
  }

  async removeTaskCollaborator(taskId: string, userId: string, actorId: string) {
    const task = await this.getTaskById(taskId);
    await proposalsStorage.removeTaskCollaborator(taskId, userId);

    domainEvents.emit({
      type: "proposal:collaborator_removed",
      taskId,
      proposalId: task.proposalId,
      userId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTaskLinks(taskId: string) {
    return proposalsStorage.getTaskLinks(taskId);
  }

  async createTaskLink(
    taskId: string,
    data: { url: string; label?: string },
    actorId: string,
  ) {
    const task = await this.getTaskById(taskId);

    let previewTitle: string | undefined;
    let previewDescription: string | undefined;
    let previewImage: string | undefined;

    try {
      const { unfurlUrl } = await import("../../lib/unfurl");
      const meta = await unfurlUrl(data.url);
      if (meta) {
        previewTitle = meta.title ?? undefined;
        previewDescription = meta.description ?? undefined;
        previewImage = meta.image ?? undefined;
      }
    } catch {
      // unfurl is best-effort
    }

    const link = await proposalsStorage.createTaskLink({
      taskId,
      url: data.url,
      label: data.label,
      previewTitle,
      previewDescription,
      previewImage,
      createdById: actorId,
    });

    domainEvents.emit({
      type: "proposal:task_link_created",
      linkId: link.id,
      taskId,
      proposalId: task.proposalId,
      url: data.url,
      actorId,
      timestamp: new Date(),
    });

    return link;
  }

  async deleteTaskLink(
    linkId: string,
    taskId: string,
    proposalId: string,
    actorId: string,
  ) {
    await proposalsStorage.deleteTaskLink(linkId);

    domainEvents.emit({
      type: "proposal:task_link_deleted",
      linkId,
      taskId,
      proposalId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getStakeholders(proposalId: string) {
    return proposalsStorage.getStakeholders(proposalId);
  }

  async addStakeholder(
    proposalId: string,
    data: { userId?: string; contactId?: string },
    actorId: string,
  ) {
    await this.getById(proposalId);

    if (!data.userId && !data.contactId) {
      throw ServiceError.validation("Either userId or contactId is required");
    }

    const stakeholder = await proposalsStorage.addStakeholder({
      proposalId,
      userId: data.userId,
      contactId: data.contactId,
    });

    domainEvents.emit({
      type: "proposal:stakeholder_added",
      proposalId,
      stakeholderId: stakeholder.id,
      userId: data.userId,
      contactId: data.contactId,
      actorId,
      timestamp: new Date(),
    });

    return stakeholder;
  }

  async removeStakeholder(
    proposalId: string,
    stakeholderId: string,
    actorId: string,
  ) {
    const stakeholder = await proposalsStorage.getStakeholderById(stakeholderId);
    if (!stakeholder || stakeholder.proposalId !== proposalId) {
      throw ServiceError.notFound("ProposalStakeholder", stakeholderId);
    }

    await proposalsStorage.removeStakeholder(stakeholderId);

    domainEvents.emit({
      type: "proposal:stakeholder_removed",
      proposalId,
      stakeholderId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTeamMembers(proposalId: string) {
    return proposalsStorage.getTeamMembers("proposal", proposalId);
  }

  async addTeamMember(
    proposalId: string,
    data: { userId: string; role?: string },
    actorId: string,
  ) {
    await this.getById(proposalId);
    const member = await proposalsStorage.addTeamMember({
      entityType: "proposal",
      entityId: proposalId,
      userId: data.userId,
      role: data.role,
    });

    domainEvents.emit({
      type: "proposal:team_member_added",
      proposalId,
      memberId: member.id,
      userId: data.userId,
      role: data.role,
      actorId,
      timestamp: new Date(),
    });

    return member;
  }

  async updateTeamMember(
    proposalId: string,
    memberId: string,
    data: { role?: string; sortOrder?: number },
    actorId: string,
  ) {
    const existing = await proposalsStorage.getTeamMemberById(memberId);
    if (!existing || existing.entityType !== "proposal" || existing.entityId !== proposalId) {
      throw ServiceError.notFound("EntityTeamMember", memberId);
    }

    const updated = await proposalsStorage.updateTeamMember(memberId, data);

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
    );

    domainEvents.emit({
      type: "proposal:team_member_updated",
      proposalId,
      memberId,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return updated;
  }

  async removeTeamMember(proposalId: string, memberId: string, actorId: string) {
    const existing = await proposalsStorage.getTeamMemberById(memberId);
    if (!existing || existing.entityType !== "proposal" || existing.entityId !== proposalId) {
      throw ServiceError.notFound("EntityTeamMember", memberId);
    }

    await proposalsStorage.removeTeamMember(memberId);

    domainEvents.emit({
      type: "proposal:team_member_removed",
      proposalId,
      memberId,
      actorId,
      timestamp: new Date(),
    });
  }

  async getTaskTemplates() {
    return proposalsStorage.getTaskTemplates();
  }

  async createTaskTemplate(data: { name: string; description?: string; sortOrder?: number }) {
    return proposalsStorage.createTaskTemplate(data);
  }

  async updateTaskTemplate(id: string, data: { name?: string; description?: string; sortOrder?: number }) {
    return proposalsStorage.updateTaskTemplate(id, data);
  }

  async deleteTaskTemplate(id: string) {
    return proposalsStorage.deleteTaskTemplate(id);
  }

  async getStatuses() {
    return proposalsStorage.getProposalStatuses();
  }
}

export const proposalsService = new ProposalsService({} as ConstructorParameters<typeof BaseService>[0]);
