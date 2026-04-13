import type { AuditAction, AuditEntityType } from "@shared/schema";
import type { DomainEvent } from "./events";

export interface EventAuditMapping {
  action: AuditAction;
  entityType: AuditEntityType;
  extractEntityId: (event: DomainEvent) => string | null;
  extractChanges?: (event: DomainEvent) => Record<string, unknown> | null;
}

export interface EventDefinition {
  type: string;
  audit: EventAuditMapping;
}

export const EVENT_REGISTRY: Record<string, EventDefinition> = {
  "deal:created": {
    type: "deal:created",
    audit: {
      action: "create",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
    },
  },
  "deal:updated": {
    type: "deal:updated",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({ after: (e as any).changes }),
    },
  },
  "deal:deleted": {
    type: "deal:deleted",
    audit: {
      action: "delete",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
    },
  },
  "deal:stage_changed": {
    type: "deal:stage_changed",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({
        before: { status: (e as any).fromStage },
        after: { status: (e as any).toStage },
      }),
    },
  },
  "deal:owner_assigned": {
    type: "deal:owner_assigned",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({
        before: { ownerId: (e as any).previousOwnerId },
        after: { ownerId: (e as any).newOwnerId },
      }),
    },
  },
  "deal:task_created": {
    type: "deal:task_created",
    audit: {
      action: "create",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).task?.id ?? null,
    },
  },
  "deal:task_updated": {
    type: "deal:task_updated",
    audit: {
      action: "update",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).task?.id ?? null,
      extractChanges: (e) => ({ after: (e as any).changes }),
    },
  },
  "deal:task_deleted": {
    type: "deal:task_deleted",
    audit: {
      action: "delete",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).taskId ?? null,
    },
  },
  "deal:reordered": {
    type: "deal:reordered",
    audit: {
      action: "reorder",
      entityType: "deals",
      extractEntityId: () => "bulk",
      extractChanges: (e) => ({ dealIds: (e as any).dealIds }),
    },
  },
  "deal_status:updated": {
    type: "deal_status:updated",
    audit: {
      action: "update",
      entityType: "deal" as AuditEntityType,
      extractEntityId: (e) => (e as any).statusId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "deal:client_linked": {
    type: "deal:client_linked",
    audit: {
      action: "link",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
      extractChanges: (e) => ({
        clientId: (e as any).clientId,
        label: (e as any).label,
      }),
    },
  },
  "deal:client_unlinked": {
    type: "deal:client_unlinked",
    audit: {
      action: "unlink",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
      extractChanges: (e) => ({
        clientId: (e as any).clientId,
      }),
    },
  },
  "deal:tags_updated": {
    type: "deal:tags_updated",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
      extractChanges: (e) => ({
        field: "tags",
        tagIds: (e as any).tagIds,
      }),
    },
  },
  "deal:link_created": {
    type: "deal:link_created",
    audit: {
      action: "create",
      entityType: "deal_link",
      extractEntityId: (e) => (e as any).linkId ?? null,
      extractChanges: (e) => ({
        dealId: (e as any).dealId,
        url: (e as any).url,
      }),
    },
  },
  "deal:link_deleted": {
    type: "deal:link_deleted",
    audit: {
      action: "delete",
      entityType: "deal_link",
      extractEntityId: (e) => (e as any).linkId ?? null,
      extractChanges: (e) => ({
        dealId: (e as any).dealId,
      }),
    },
  },
  "deal:intake_created": {
    type: "deal:intake_created",
    audit: {
      action: "create",
      entityType: "deal" as AuditEntityType,
      extractEntityId: (e) => (e as any).intakeId ?? null,
      extractChanges: (e) => ({
        dealId: (e as any).dealId,
        templateId: (e as any).templateId,
        templateName: (e as any).templateName,
      }),
    },
  },
  "deal:intake_updated": {
    type: "deal:intake_updated",
    audit: {
      action: "update",
      entityType: "deal" as AuditEntityType,
      extractEntityId: (e) => (e as any).intakeId ?? null,
      extractChanges: (e) => ({
        dealId: (e as any).dealId,
      }),
    },
  },
  "deal:intake_deleted": {
    type: "deal:intake_deleted",
    audit: {
      action: "delete",
      entityType: "deal" as AuditEntityType,
      extractEntityId: (e) => (e as any).intakeId ?? null,
      extractChanges: (e) => ({
        dealId: (e as any).dealId,
      }),
    },
  },
  "deal:intake_synced": {
    type: "deal:intake_synced",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
      extractChanges: (e) => ({
        source: "intake_sync",
        changedProperties: (e as any).changedProperties,
      }),
    },
  },
  "deal:doc_generated": {
    type: "deal:doc_generated",
    audit: {
      action: "create",
      entityType: "drive_attachment",
      extractEntityId: (e) => (e as any).attachmentId ?? null,
      extractChanges: (e) => ({
        source: "generate_sheet",
        dealId: (e as any).dealId,
        sheetId: (e as any).sheetId,
      }),
    },
  },
  "user:logged_in": {
    type: "user:logged_in",
    audit: {
      action: "login",
      entityType: "user",
      extractEntityId: (e) => (e as any).userId ?? null,
      extractChanges: (e) => (e as any).metadata ?? null,
    },
  },
  "user:logged_out": {
    type: "user:logged_out",
    audit: {
      action: "logout",
      entityType: "user",
      extractEntityId: (e) => (e as any).userId ?? null,
    },
  },
  "venue:created": {
    type: "venue:created",
    audit: {
      action: "create",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
    },
  },
  "venue:updated": {
    type: "venue:updated",
    audit: {
      action: "update",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "venue:deleted": {
    type: "venue:deleted",
    audit: {
      action: "delete",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
    },
  },
  "venue:photo_uploaded": {
    type: "venue:photo_uploaded",
    audit: {
      action: "upload",
      entityType: "venue_photo",
      extractEntityId: (e) => (e as any).photoId ?? null,
    },
  },
  "venue:photo_deleted": {
    type: "venue:photo_deleted",
    audit: {
      action: "delete",
      entityType: "venue_photo",
      extractEntityId: (e) => (e as any).photoId ?? null,
    },
  },
  "venue:file_uploaded": {
    type: "venue:file_uploaded",
    audit: {
      action: "upload",
      entityType: "venue_file",
      extractEntityId: (e) => (e as any).fileId ?? null,
    },
  },
  "venue:file_deleted": {
    type: "venue:file_deleted",
    audit: {
      action: "delete",
      entityType: "venue_file",
      extractEntityId: (e) => (e as any).fileId ?? null,
    },
  },
  "venue:file_updated": {
    type: "venue:file_updated",
    audit: {
      action: "update",
      entityType: "venue_file",
      extractEntityId: (e) => (e as any).fileId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "venue:photo_updated": {
    type: "venue:photo_updated",
    audit: {
      action: "update",
      entityType: "venue_photo",
      extractEntityId: (e) => (e as any).photoId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "venue:collection_created": {
    type: "venue:collection_created",
    audit: {
      action: "create",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
    },
  },
  "venue:collection_updated": {
    type: "venue:collection_updated",
    audit: {
      action: "update",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "venue:collection_deleted": {
    type: "venue:collection_deleted",
    audit: {
      action: "delete",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
    },
  },
  "venue:collection_venues_added": {
    type: "venue:collection_venues_added",
    audit: {
      action: "add_venues",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
      extractChanges: (e) => ({ venueIds: (e as any).venueIds }),
    },
  },
  "venue:collection_venue_removed": {
    type: "venue:collection_venue_removed",
    audit: {
      action: "remove_venue",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
      extractChanges: (e) => ({ venueId: (e as any).venueId }),
    },
  },
  "venue:collection_reordered": {
    type: "venue:collection_reordered",
    audit: {
      action: "reorder",
      entityType: "venue_collection",
      extractEntityId: (e) => (e as any).collectionId ?? null,
      extractChanges: (e) => ({ venueIds: (e as any).venueIds }),
    },
  },
  "contact:created": {
    type: "contact:created",
    audit: {
      action: "create",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
    },
  },
  "contact:updated": {
    type: "contact:updated",
    audit: {
      action: "update",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "contact:deleted": {
    type: "contact:deleted",
    audit: {
      action: "delete",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
    },
  },
  "contact:linked_client": {
    type: "contact:linked_client",
    audit: {
      action: "link",
      entityType: "client_contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => ({ clientId: (e as any).clientId, clientName: (e as any).clientName }),
    },
  },
  "contact:unlinked_client": {
    type: "contact:unlinked_client",
    audit: {
      action: "unlink",
      entityType: "client_contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => ({ clientId: (e as any).clientId }),
    },
  },
  "contact:linked_vendor": {
    type: "contact:linked_vendor",
    audit: {
      action: "link",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => ({ vendorId: (e as any).vendorId, vendorName: (e as any).vendorName }),
    },
  },
  "contact:unlinked_vendor": {
    type: "contact:unlinked_vendor",
    audit: {
      action: "unlink",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => ({ vendorId: (e as any).vendorId }),
    },
  },
  "client:created": {
    type: "client:created",
    audit: {
      action: "create",
      entityType: "client",
      extractEntityId: (e) => (e as any).clientId ?? null,
    },
  },
  "client:updated": {
    type: "client:updated",
    audit: {
      action: "update",
      entityType: "client",
      extractEntityId: (e) => (e as any).clientId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "client:deleted": {
    type: "client:deleted",
    audit: {
      action: "delete",
      entityType: "client",
      extractEntityId: (e) => (e as any).clientId ?? null,
    },
  },
  "client:linked_contact": {
    type: "client:linked_contact",
    audit: {
      action: "link",
      entityType: "client_contact",
      extractEntityId: (e) => (e as any).clientId ?? null,
      extractChanges: (e) => ({ contactId: (e as any).contactId, contactName: (e as any).contactName }),
    },
  },
  "client:unlinked_contact": {
    type: "client:unlinked_contact",
    audit: {
      action: "unlink",
      entityType: "client_contact",
      extractEntityId: (e) => (e as any).clientId ?? null,
      extractChanges: (e) => ({ contactId: (e as any).contactId }),
    },
  },
  "vendor:created": {
    type: "vendor:created",
    audit: {
      action: "create",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).vendorId ?? null,
    },
  },
  "vendor:updated": {
    type: "vendor:updated",
    audit: {
      action: "update",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).vendorId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "vendor:deleted": {
    type: "vendor:deleted",
    audit: {
      action: "delete",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).vendorId ?? null,
    },
  },
  "form_template:created": {
    type: "form_template:created",
    audit: {
      action: "create",
      entityType: "form_template",
      extractEntityId: (e) => (e as any).templateId ?? null,
    },
  },
  "form_template:updated": {
    type: "form_template:updated",
    audit: {
      action: "update",
      entityType: "form_template",
      extractEntityId: (e) => (e as any).templateId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "form_template:deleted": {
    type: "form_template:deleted",
    audit: {
      action: "delete",
      entityType: "form_template",
      extractEntityId: (e) => (e as any).templateId ?? null,
    },
  },
  "form_request:created": {
    type: "form_request:created",
    audit: {
      action: "create",
      entityType: "form_request",
      extractEntityId: (e) => (e as any).requestId ?? null,
    },
  },
  "form_request:updated": {
    type: "form_request:updated",
    audit: {
      action: "update",
      entityType: "form_request",
      extractEntityId: (e) => (e as any).requestId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "form_request:deleted": {
    type: "form_request:deleted",
    audit: {
      action: "delete",
      entityType: "form_request",
      extractEntityId: (e) => (e as any).requestId ?? null,
    },
  },
  "form_request:sent": {
    type: "form_request:sent",
    audit: {
      action: "email_sent",
      entityType: "form_request",
      extractEntityId: (e) => (e as any).requestId ?? null,
      extractChanges: (e) => ({
        recipientEmail: (e as any).recipientEmail,
      }),
    },
  },
  "vendor:linked_contact": {
    type: "vendor:linked_contact",
    audit: {
      action: "link",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).vendorId ?? null,
      extractChanges: (e) => ({ contactId: (e as any).contactId, contactName: (e as any).contactName }),
    },
  },
  "vendor:unlinked_contact": {
    type: "vendor:unlinked_contact",
    audit: {
      action: "unlink",
      entityType: "vendor",
      extractEntityId: (e) => (e as any).vendorId ?? null,
      extractChanges: (e) => ({ contactId: (e as any).contactId }),
    },
  },
  "vendor:token_generated": {
    type: "vendor:token_generated",
    audit: {
      action: "create",
      entityType: "vendor_update_token",
      extractEntityId: (e) => (e as any).vendorId ?? null,
      extractChanges: (e) => ({ expiresAt: (e as any).expiresAt }),
    },
  },
  "vendor:token_consumed": {
    type: "vendor:token_consumed",
    audit: {
      action: "update",
      entityType: "vendor_update_token",
      extractEntityId: (e) => (e as any).vendorId ?? null,
    },
  },
  "vendor:bulk_email_sent": {
    type: "vendor:bulk_email_sent",
    audit: {
      action: "email_sent",
      entityType: "vendor_update_token",
      extractEntityId: () => "batch",
      extractChanges: (e) => ({
        totalVendors: (e as any).totalVendors,
        successful: (e as any).successful,
        failed: (e as any).failed,
      }),
    },
  },
  "comment:created": {
    type: "comment:created",
    audit: {
      action: "create",
      entityType: "comment" as any,
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        entityType: (e as any).entityType,
        entityId: (e as any).entityId,
      }),
    },
  },
  "comment:reply_created": {
    type: "comment:reply_created",
    audit: {
      action: "create",
      entityType: "comment" as any,
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        entityType: (e as any).entityType,
        entityId: (e as any).entityId,
        parentCommentId: (e as any).parentCommentId,
      }),
    },
  },
  "form:submission_received": {
    type: "form:submission_received",
    audit: {
      action: "create",
      entityType: "form_response",
      extractEntityId: (e) => (e as any).formRequestId ?? null,
    },
  },
  "feature_comment:created": {
    type: "feature_comment:created",
    audit: {
      action: "create",
      entityType: "feature_comment",
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        featureId: (e as any).featureId,
      }),
    },
  },
};

export type RegisteredEventType = keyof typeof EVENT_REGISTRY;

export function isRegisteredEvent(type: string): type is RegisteredEventType {
  return type in EVENT_REGISTRY;
}

export function getEventMapping(type: string): EventAuditMapping | null {
  const definition = EVENT_REGISTRY[type];
  return definition?.audit ?? null;
}

export function getAllRegisteredEventTypes(): string[] {
  return Object.keys(EVENT_REGISTRY);
}
