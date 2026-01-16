import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent } from "../../audit";
import { releasesStorage } from "./releases.storage";
import {
  insertAppReleaseSchema,
  updateAppReleaseSchema,
  insertAppReleaseChangeSchema,
  releaseStatuses,
  type ReleaseStatus,
} from "@shared/schema";

export function registerReleasesRoutes(app: Express): void {
  app.get("/api/releases", isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as ReleaseStatus | undefined;
      if (status && !releaseStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const releases = await releasesStorage.getReleases(status);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  app.get("/api/releases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      res.json(release);
    } catch (error) {
      console.error("Error fetching release:", error);
      res.status(500).json({ message: "Failed to fetch release" });
    }
  });

  app.post("/api/releases", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const result = insertAppReleaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const userId = req.user.claims.sub;
      const release = await releasesStorage.createRelease(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "app_release",
        entityId: release.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      res.status(201).json(release);
    } catch (error: any) {
      console.error("Error creating release:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Version label already exists" });
      }
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  app.put("/api/releases/:id", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const existing = await releasesStorage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Cannot edit a published release" });
      }

      const result = updateAppReleaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const release = await releasesStorage.updateRelease(req.params.id, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "app_release",
        entityId: req.params.id,
        changes: { before: existing, after: result.data as Record<string, unknown> },
      });

      res.json(release);
    } catch (error: any) {
      console.error("Error updating release:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Version label already exists" });
      }
      res.status(500).json({ message: "Failed to update release" });
    }
  });

  app.post("/api/releases/:id/publish", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const existing = await releasesStorage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Release is already published" });
      }

      const release = await releasesStorage.publishRelease(req.params.id);

      await logAuditEvent(req, {
        action: "update",
        entityType: "app_release",
        entityId: req.params.id,
        metadata: { action: "publish" },
      });

      res.json(release);
    } catch (error) {
      console.error("Error publishing release:", error);
      res.status(500).json({ message: "Failed to publish release" });
    }
  });

  app.delete("/api/releases/:id", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const existing = await releasesStorage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Cannot delete a published release" });
      }

      await releasesStorage.deleteRelease(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "app_release",
        entityId: req.params.id,
        changes: { before: { versionLabel: existing.versionLabel } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting release:", error);
      res.status(500).json({ message: "Failed to delete release" });
    }
  });

  app.post("/api/releases/:id/features", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const { featureId, notes } = req.body;
      if (!featureId) {
        return res.status(400).json({ message: "featureId is required" });
      }

      const releaseFeature = await releasesStorage.addFeatureToRelease(req.params.id, featureId, notes);

      await logAuditEvent(req, {
        action: "link_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { featureId, releaseVersion: release.versionLabel },
      });

      res.status(201).json(releaseFeature);
    } catch (error: any) {
      console.error("Error adding feature to release:", error);
      await logAuditEvent(req, {
        action: "link_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { featureId: req.body.featureId, error: (error as Error).message },
      });
      if (error.code === "23505") {
        return res.status(400).json({ message: "Feature already added to this release" });
      }
      res.status(500).json({ message: "Failed to add feature to release" });
    }
  });

  app.delete("/api/releases/:id/features/:featureId", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await releasesStorage.removeFeatureFromRelease(req.params.id, req.params.featureId);

      await logAuditEvent(req, {
        action: "unlink_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { featureId: req.params.featureId, releaseVersion: release.versionLabel },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing feature from release:", error);
      await logAuditEvent(req, {
        action: "unlink_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { featureId: req.params.featureId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove feature from release" });
    }
  });

  app.post("/api/releases/:id/issues", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const { issueId, notes } = req.body;
      if (!issueId) {
        return res.status(400).json({ message: "issueId is required" });
      }

      const releaseIssue = await releasesStorage.addIssueToRelease(req.params.id, issueId, notes);

      await logAuditEvent(req, {
        action: "link_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { issueId, releaseVersion: release.versionLabel },
      });

      res.status(201).json(releaseIssue);
    } catch (error: any) {
      console.error("Error adding issue to release:", error);
      await logAuditEvent(req, {
        action: "link_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { issueId: req.body.issueId, error: (error as Error).message },
      });
      if (error.code === "23505") {
        return res.status(400).json({ message: "Issue already added to this release" });
      }
      res.status(500).json({ message: "Failed to add issue to release" });
    }
  });

  app.delete("/api/releases/:id/issues/:issueId", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await releasesStorage.removeIssueFromRelease(req.params.id, req.params.issueId);

      await logAuditEvent(req, {
        action: "unlink_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { issueId: req.params.issueId, releaseVersion: release.versionLabel },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing issue from release:", error);
      await logAuditEvent(req, {
        action: "unlink_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { issueId: req.params.issueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove issue from release" });
    }
  });

  app.post("/api/releases/:id/changes", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const result = insertAppReleaseChangeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const userId = req.user.claims.sub;
      const change = await releasesStorage.addChangeToRelease(req.params.id, result.data, userId);

      await logAuditEvent(req, {
        action: "add_change",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { changeId: change.id, title: change.title, releaseVersion: release.versionLabel },
      });

      res.status(201).json(change);
    } catch (error) {
      console.error("Error adding change to release:", error);
      await logAuditEvent(req, {
        action: "add_change",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { title: req.body.title, category: req.body.category, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to add change to release" });
    }
  });

  app.delete("/api/releases/:id/changes/:changeId", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const release = await releasesStorage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await releasesStorage.removeChangeFromRelease(req.params.changeId);

      await logAuditEvent(req, {
        action: "remove_change",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { changeId: req.params.changeId, releaseVersion: release.versionLabel },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing change from release:", error);
      await logAuditEvent(req, {
        action: "remove_change",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { changeId: req.params.changeId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove change from release" });
    }
  });

  app.get("/api/releases/suggestions/features", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const lastRelease = await releasesStorage.getLatestReleasedVersion();
      const sinceDate = lastRelease?.releaseDate || undefined;
      const features = await releasesStorage.getCompletedFeaturesNotInRelease(sinceDate);
      res.json(features);
    } catch (error) {
      console.error("Error fetching suggested features:", error);
      res.status(500).json({ message: "Failed to fetch suggested features" });
    }
  });

  app.get("/api/releases/suggestions/issues", isAuthenticated, requirePermission("releases.manage"), async (req: any, res) => {
    try {
      const lastRelease = await releasesStorage.getLatestReleasedVersion();
      const sinceDate = lastRelease?.releaseDate || undefined;
      const issues = await releasesStorage.getFixedIssuesNotInRelease(sinceDate);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching suggested issues:", error);
      res.status(500).json({ message: "Failed to fetch suggested issues" });
    }
  });
}
