import { entityLinksStorage } from "./entity-links.storage";
import { domainEvents } from "../../lib/events";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { entityLinkEntityTypes, deals, proposalTasks, type EntityLinkEntityType, type EntityLink, type EntityLinkWithUser } from "@shared/schema";

function isValidEntityType(value: string): value is EntityLinkEntityType {
  return (entityLinkEntityTypes as readonly string[]).includes(value);
}

function getPermissionPrefix(entityType: string): string {
  switch (entityType) {
    case "deal":
      return "deals";
    case "proposal_task":
      return "proposals";
    default:
      return entityType;
  }
}

export const entityLinksService = {
  isValidEntityType,
  getPermissionPrefix,

  async getLinks(entityType: string, entityId: string): Promise<EntityLinkWithUser[]> {
    return entityLinksStorage.getLinks(entityType, entityId);
  },

  async verifyEntityExists(entityType: string, entityId: string): Promise<void> {
    if (entityType === "deal") {
      const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, entityId));
      if (!deal) throw new NotFoundError("Deal not found");
    } else if (entityType === "proposal_task") {
      const [task] = await db.select({ id: proposalTasks.id }).from(proposalTasks).where(eq(proposalTasks.id, entityId));
      if (!task) throw new NotFoundError("Task not found");
    }
  },

  async createLink(
    entityType: string,
    entityId: string,
    data: { url: string; label?: string },
    actorId: string,
  ): Promise<EntityLink> {
    await this.verifyEntityExists(entityType, entityId);

    if (!data.url || typeof data.url !== "string") {
      throw new ValidationError("url is required");
    }

    if (data.url.length > 2000) {
      throw new ValidationError("URL must be 2000 characters or fewer");
    }

    if (entityType === "deal") {
      if (!data.label || typeof data.label !== "string" || !data.label.trim()) {
        throw new ValidationError("label is required");
      }
    }

    if (data.label && data.label.length > 500) {
      throw new ValidationError("Label must be 500 characters or fewer");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(data.url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new ValidationError("URL must use http or https");
      }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError("Invalid URL format");
    }

    let previewTitle: string | null = null;
    let previewDescription: string | null = null;
    let previewImage: string | null = null;

    try {
      const { unfurlUrl } = await import("../../lib/unfurl");
      const preview = await unfurlUrl(parsedUrl.href);
      if (preview) {
        previewTitle = preview.title ?? null;
        previewDescription = preview.description ?? null;
        previewImage = preview.image ?? null;
      }
    } catch (e) {
      console.debug(`[entity-links] Unfurl failed for ${parsedUrl.href}:`, (e as Error).message);
    }

    const link = await entityLinksStorage.createLink({
      entityType,
      entityId,
      url: parsedUrl.href,
      label: data.label?.trim() || null,
      previewTitle,
      previewDescription,
      previewImage,
      createdById: actorId,
    });

    domainEvents.emit({
      type: "entity_link:created",
      linkId: link.id,
      entityType,
      entityId,
      url: parsedUrl.href,
      actorId,
      timestamp: new Date(),
    });

    return link;
  },

  async deleteLink(
    linkId: string,
    entityType: string,
    entityId: string,
    actorId: string,
    hasDeletePermission: boolean,
  ): Promise<void> {
    const link = await entityLinksStorage.getLinkById(linkId);

    if (!link) {
      throw new NotFoundError("Link not found");
    }

    if (link.entityType !== entityType || link.entityId !== entityId) {
      throw new NotFoundError("Link not found");
    }

    if (entityType === "deal") {
      if (link.createdById !== actorId && !hasDeletePermission) {
        throw new ForbiddenError("You can only delete links you created");
      }
    }

    await entityLinksStorage.deleteLink(linkId);

    domainEvents.emit({
      type: "entity_link:deleted",
      linkId,
      entityType,
      entityId,
      actorId,
      timestamp: new Date(),
    });
  },
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
