import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { loadPermissions, checkPermission } from "../../middleware/permissions";
import { handleServiceError } from "../../lib/route-helpers";
import { entityLinksService, ValidationError, NotFoundError, ForbiddenError } from "./entity-links.service";

function handleDomainError(res: any, error: unknown, fallbackMessage: string) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return res.status(403).json({ message: error.message });
  }
  handleServiceError(res, error, fallbackMessage);
}

export function registerEntityLinksRoutes(app: Express): void {
  app.get(
    "/api/entity-links/:entityType/:entityId",
    isAuthenticated,
    loadPermissions,
    async (req: any, res) => {
      try {
        const { entityType, entityId } = req.params;

        if (!entityLinksService.isValidEntityType(entityType)) {
          return res.status(400).json({ message: "Invalid entity type" });
        }

        const prefix = entityLinksService.getPermissionPrefix(entityType);
        if (!checkPermission(req, `${prefix}.read`)) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const links = await entityLinksService.getLinks(entityType, entityId);
        res.json(links);
      } catch (error) {
        handleDomainError(res, error, "Failed to fetch entity links");
      }
    },
  );

  app.post(
    "/api/entity-links/:entityType/:entityId",
    isAuthenticated,
    loadPermissions,
    async (req: any, res) => {
      try {
        const { entityType, entityId } = req.params;
        const actorId = req.user.claims.sub;

        if (!entityLinksService.isValidEntityType(entityType)) {
          return res.status(400).json({ message: "Invalid entity type" });
        }

        const prefix = entityLinksService.getPermissionPrefix(entityType);
        if (!checkPermission(req, `${prefix}.write`)) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const link = await entityLinksService.createLink(
          entityType,
          entityId,
          req.body,
          actorId,
        );

        res.status(201).json(link);
      } catch (error) {
        handleDomainError(res, error, "Failed to create entity link");
      }
    },
  );

  app.delete(
    "/api/entity-links/:entityType/:entityId/:linkId",
    isAuthenticated,
    loadPermissions,
    async (req: any, res) => {
      try {
        const { entityType, entityId, linkId } = req.params;
        const actorId = req.user.claims.sub;

        if (!entityLinksService.isValidEntityType(entityType)) {
          return res.status(400).json({ message: "Invalid entity type" });
        }

        const prefix = entityLinksService.getPermissionPrefix(entityType);
        if (!checkPermission(req, `${prefix}.write`)) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const hasDeletePermission = checkPermission(req, `${prefix}.delete`);
        await entityLinksService.deleteLink(linkId, entityType, entityId, actorId, hasDeletePermission);

        res.status(204).send();
      } catch (error) {
        handleDomainError(res, error, "Failed to delete entity link");
      }
    },
  );
}
