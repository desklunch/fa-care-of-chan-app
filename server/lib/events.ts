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

export interface DealReorderedEvent {
  type: "deal:reordered";
  dealIds: string[];
  actorId: string;
  timestamp: Date;
}

export interface DealStatusUpdatedEvent {
  type: "deal_status:updated";
  statusId: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface DealClientLinkedEvent {
  type: "deal:client_linked";
  dealId: string;
  clientId: string;
  label?: string;
  actorId: string;
  timestamp: Date;
}

export interface DealClientUnlinkedEvent {
  type: "deal:client_unlinked";
  dealId: string;
  clientId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealTagsUpdatedEvent {
  type: "deal:tags_updated";
  dealId: string;
  tagIds: string[];
  actorId: string;
  timestamp: Date;
}

export interface DealLinkCreatedEvent {
  type: "deal:link_created";
  linkId: string;
  dealId: string;
  url: string;
  actorId: string;
  timestamp: Date;
}

export interface DealLinkDeletedEvent {
  type: "deal:link_deleted";
  linkId: string;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealIntakeCreatedEvent {
  type: "deal:intake_created";
  intakeId: string;
  dealId: string;
  templateId: string;
  templateName: string;
  actorId: string;
  timestamp: Date;
}

export interface DealIntakeUpdatedEvent {
  type: "deal:intake_updated";
  intakeId: string;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealIntakeDeletedEvent {
  type: "deal:intake_deleted";
  intakeId: string;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface DealIntakeSyncedEvent {
  type: "deal:intake_synced";
  dealId: string;
  changedProperties: string[];
  actorId: string;
  timestamp: Date;
}

export interface DealDocGeneratedEvent {
  type: "deal:doc_generated";
  attachmentId: string;
  dealId: string;
  sheetId: string;
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

export interface VenueCreatedEvent {
  type: "venue:created";
  venueId: string;
  venueName: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueUpdatedEvent {
  type: "venue:updated";
  venueId: string;
  venueName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VenueDeletedEvent {
  type: "venue:deleted";
  venueId: string;
  venueName: string;
  actorId: string;
  timestamp: Date;
}

export interface VenuePhotoUploadedEvent {
  type: "venue:photo_uploaded";
  venueId: string;
  photoId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenuePhotoDeletedEvent {
  type: "venue:photo_deleted";
  venueId: string;
  photoId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueFileUploadedEvent {
  type: "venue:file_uploaded";
  venueId: string;
  fileId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueFileDeletedEvent {
  type: "venue:file_deleted";
  venueId: string;
  fileId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenuePhotoUpdatedEvent {
  type: "venue:photo_updated";
  venueId: string;
  photoId: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VenueFileUpdatedEvent {
  type: "venue:file_updated";
  venueId: string;
  fileId: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionCreatedEvent {
  type: "venue:collection_created";
  collectionId: string;
  collectionName: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionUpdatedEvent {
  type: "venue:collection_updated";
  collectionId: string;
  collectionName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionDeletedEvent {
  type: "venue:collection_deleted";
  collectionId: string;
  collectionName: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionVenuesAddedEvent {
  type: "venue:collection_venues_added";
  collectionId: string;
  venueIds: string[];
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionVenueRemovedEvent {
  type: "venue:collection_venue_removed";
  collectionId: string;
  venueId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueCollectionReorderedEvent {
  type: "venue:collection_reordered";
  collectionId: string;
  venueIds: string[];
  actorId: string;
  timestamp: Date;
}

export interface CommentCreatedEvent {
  type: "comment:created";
  commentId: string;
  body: string;
  entityType: string;
  entityId: string;
  authorId: string;
  actorId: string;
  timestamp: Date;
}

export interface CommentReplyCreatedEvent {
  type: "comment:reply_created";
  commentId: string;
  body: string;
  entityType: string;
  entityId: string;
  parentCommentId: string;
  parentCommentAuthorId: string;
  authorId: string;
  actorId: string;
  timestamp: Date;
}

export interface FormSubmissionReceivedEvent {
  type: "form:submission_received";
  formRequestId: string;
  formRequestTitle: string;
  respondentName: string;
  actorId: string;
  timestamp: Date;
}

export interface FeatureCommentCreatedEvent {
  type: "feature_comment:created";
  commentId: string;
  body: string;
  featureId: string;
  featureTitle: string;
  featureCreatedById: string;
  authorId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalCreatedEvent {
  type: "proposal:created";
  proposalId: string;
  proposalTitle: string;
  dealId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalUpdatedEvent {
  type: "proposal:updated";
  proposalId: string;
  proposalTitle: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface ProposalDeletedEvent {
  type: "proposal:deleted";
  proposalId: string;
  proposalTitle: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalStatusChangedEvent {
  type: "proposal:status_changed";
  proposalId: string;
  proposalTitle: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskCreatedEvent {
  type: "proposal:task_created";
  taskId: string;
  taskName: string;
  proposalId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskUpdatedEvent {
  type: "proposal:task_updated";
  taskId: string;
  taskName: string;
  proposalId: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskDeletedEvent {
  type: "proposal:task_deleted";
  taskId: string;
  proposalId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskCompletedEvent {
  type: "proposal:task_completed";
  taskId: string;
  taskName: string;
  proposalId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskLinkCreatedEvent {
  type: "proposal:task_link_created";
  linkId: string;
  taskId: string;
  proposalId: string;
  url: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTaskLinkDeletedEvent {
  type: "proposal:task_link_deleted";
  linkId: string;
  taskId: string;
  proposalId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalStakeholderAddedEvent {
  type: "proposal:stakeholder_added";
  proposalId: string;
  stakeholderId: string;
  userId?: string;
  contactId?: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalStakeholderRemovedEvent {
  type: "proposal:stakeholder_removed";
  proposalId: string;
  stakeholderId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTeamMemberAddedEvent {
  type: "proposal:team_member_added";
  proposalId: string;
  memberId: string;
  userId: string;
  role?: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTeamMemberUpdatedEvent {
  type: "proposal:team_member_updated";
  proposalId: string;
  memberId: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface ProposalTeamMemberRemovedEvent {
  type: "proposal:team_member_removed";
  proposalId: string;
  memberId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalCollaboratorAddedEvent {
  type: "proposal:collaborator_added";
  taskId: string;
  proposalId: string;
  userId: string;
  actorId: string;
  timestamp: Date;
}

export interface ProposalCollaboratorRemovedEvent {
  type: "proposal:collaborator_removed";
  taskId: string;
  proposalId: string;
  userId: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactCreatedEvent {
  type: "contact:created";
  contactId: string;
  contactName: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactUpdatedEvent {
  type: "contact:updated";
  contactId: string;
  contactName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface ContactDeletedEvent {
  type: "contact:deleted";
  contactId: string;
  contactName: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactLinkedClientEvent {
  type: "contact:linked_client";
  contactId: string;
  clientId: string;
  clientName: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactUnlinkedClientEvent {
  type: "contact:unlinked_client";
  contactId: string;
  clientId: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactLinkedVendorEvent {
  type: "contact:linked_vendor";
  contactId: string;
  vendorId: string;
  vendorName: string;
  actorId: string;
  timestamp: Date;
}

export interface ContactUnlinkedVendorEvent {
  type: "contact:unlinked_vendor";
  contactId: string;
  vendorId: string;
  actorId: string;
  timestamp: Date;
}
export interface ClientCreatedEvent {
  type: "client:created";
  clientId: string;
  clientName: string;
  actorId: string;
  timestamp: Date;
}

export interface ClientUpdatedEvent {
  type: "client:updated";
  clientId: string;
  clientName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface ClientDeletedEvent {
  type: "client:deleted";
  clientId: string;
  clientName: string;
  actorId: string;
  timestamp: Date;
}

export interface ClientLinkedContactEvent {
  type: "client:linked_contact";
  clientId: string;
  contactId: string;
  contactName: string;
  actorId: string;
  timestamp: Date;
}

export interface ClientUnlinkedContactEvent {
  type: "client:unlinked_contact";
  clientId: string;
  contactId: string;
  actorId: string;
  timestamp: Date;
}
export interface VendorCreatedEvent {
  type: "vendor:created";
  vendorId: string;
  vendorName: string;
  actorId: string;
  timestamp: Date;
}

export interface VendorUpdatedEvent {
  type: "vendor:updated";
  vendorId: string;
  vendorName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VendorDeletedEvent {
  type: "vendor:deleted";
  vendorId: string;
  vendorName: string;
  actorId: string;
  timestamp: Date;
}

export interface FormTemplateCreatedEvent {
  type: "form_template:created";
  templateId: string;
  templateName: string;
  actorId: string;
  timestamp: Date;
}

export interface VendorLinkedContactEvent {
  type: "vendor:linked_contact";
  vendorId: string;
  contactId: string;
  contactName: string;
  actorId: string;
  timestamp: Date;
}

export interface FormTemplateUpdatedEvent {
  type: "form_template:updated";
  templateId: string;
  templateName: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface VendorUnlinkedContactEvent {
  type: "vendor:unlinked_contact";
  vendorId: string;
  contactId: string;
  actorId: string;
  timestamp: Date;
}

export interface FormTemplateDeletedEvent {
  type: "form_template:deleted";
  templateId: string;
  templateName: string;
  actorId: string;
  timestamp: Date;
}

export interface VendorTokenGeneratedEvent {
  type: "vendor:token_generated";
  vendorId: string;
  vendorName: string;
  expiresAt: string;
  actorId: string;
  timestamp: Date;
}

export interface FormRequestCreatedEvent {
  type: "form_request:created";
  requestId: string;
  requestTitle: string;
  actorId: string;
  timestamp: Date;
}

export interface VendorTokenConsumedEvent {
  type: "vendor:token_consumed";
  vendorId: string;
  vendorName: string;
  token: string;
  actorId: string;
  timestamp: Date;
}

export interface FormRequestUpdatedEvent {
  type: "form_request:updated";
  requestId: string;
  requestTitle: string;
  changes: Record<string, unknown>;
  actorId: string;
  timestamp: Date;
}

export interface FormRequestDeletedEvent {
  type: "form_request:deleted";
  requestId: string;
  requestTitle: string;
  actorId: string;
  timestamp: Date;
}

export interface FormRequestSentEvent {
  type: "form_request:sent";
  requestId: string;
  requestTitle: string;
  recipientEmail: string;
  actorId: string;
  timestamp: Date;
}

export interface VendorBulkEmailSentEvent {
  type: "vendor:bulk_email_sent";
  totalVendors: number;
  successful: number;
  failed: number;
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
  | DealReorderedEvent
  | DealStatusUpdatedEvent
  | DealClientLinkedEvent
  | DealClientUnlinkedEvent
  | DealTagsUpdatedEvent
  | DealLinkCreatedEvent
  | DealLinkDeletedEvent
  | DealIntakeCreatedEvent
  | DealIntakeUpdatedEvent
  | DealIntakeDeletedEvent
  | DealIntakeSyncedEvent
  | DealDocGeneratedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | VenueCreatedEvent
  | VenueUpdatedEvent
  | VenueDeletedEvent
  | VenuePhotoUploadedEvent
  | VenuePhotoDeletedEvent
  | VenuePhotoUpdatedEvent
  | VenueFileUploadedEvent
  | VenueFileDeletedEvent
  | VenueFileUpdatedEvent
  | VenueCollectionCreatedEvent
  | VenueCollectionUpdatedEvent
  | VenueCollectionDeletedEvent
  | VenueCollectionVenuesAddedEvent
  | VenueCollectionVenueRemovedEvent
  | VenueCollectionReorderedEvent
  | ContactCreatedEvent
  | ContactUpdatedEvent
  | ContactDeletedEvent
  | ContactLinkedClientEvent
  | ContactUnlinkedClientEvent
  | ContactLinkedVendorEvent
  | ContactUnlinkedVendorEvent
  | ClientCreatedEvent
  | ClientUpdatedEvent
  | ClientDeletedEvent
  | ClientLinkedContactEvent
  | ClientUnlinkedContactEvent
  | VendorCreatedEvent
  | VendorUpdatedEvent
  | VendorDeletedEvent
  | VendorLinkedContactEvent
  | VendorUnlinkedContactEvent
  | VendorTokenGeneratedEvent
  | VendorTokenConsumedEvent
  | VendorBulkEmailSentEvent
  | FormTemplateCreatedEvent
  | FormTemplateUpdatedEvent
  | FormTemplateDeletedEvent
  | FormRequestCreatedEvent
  | FormRequestUpdatedEvent
  | FormRequestDeletedEvent
  | FormRequestSentEvent
  | CommentCreatedEvent
  | CommentReplyCreatedEvent
  | FormSubmissionReceivedEvent
  | FeatureCommentCreatedEvent
  | ProposalCreatedEvent
  | ProposalUpdatedEvent
  | ProposalDeletedEvent
  | ProposalStatusChangedEvent
  | ProposalTaskCreatedEvent
  | ProposalTaskUpdatedEvent
  | ProposalTaskDeletedEvent
  | ProposalTaskCompletedEvent
  | ProposalTaskLinkCreatedEvent
  | ProposalTaskLinkDeletedEvent
  | ProposalStakeholderAddedEvent
  | ProposalStakeholderRemovedEvent
  | ProposalTeamMemberAddedEvent
  | ProposalTeamMemberUpdatedEvent
  | ProposalTeamMemberRemovedEvent
  | ProposalCollaboratorAddedEvent
  | ProposalCollaboratorRemovedEvent;

type EventMap = {
  "deal:created": DealCreatedEvent;
  "deal:updated": DealUpdatedEvent;
  "deal:deleted": DealDeletedEvent;
  "deal:stage_changed": DealStageChangedEvent;
  "deal:owner_assigned": DealOwnerAssignedEvent;
  "deal:task_created": DealTaskCreatedEvent;
  "deal:task_updated": DealTaskUpdatedEvent;
  "deal:task_deleted": DealTaskDeletedEvent;
  "deal:reordered": DealReorderedEvent;
  "deal_status:updated": DealStatusUpdatedEvent;
  "deal:client_linked": DealClientLinkedEvent;
  "deal:client_unlinked": DealClientUnlinkedEvent;
  "deal:tags_updated": DealTagsUpdatedEvent;
  "deal:link_created": DealLinkCreatedEvent;
  "deal:link_deleted": DealLinkDeletedEvent;
  "deal:intake_created": DealIntakeCreatedEvent;
  "deal:intake_updated": DealIntakeUpdatedEvent;
  "deal:intake_deleted": DealIntakeDeletedEvent;
  "deal:intake_synced": DealIntakeSyncedEvent;
  "deal:doc_generated": DealDocGeneratedEvent;
  "user:logged_in": UserLoggedInEvent;
  "user:logged_out": UserLoggedOutEvent;
  "venue:created": VenueCreatedEvent;
  "venue:updated": VenueUpdatedEvent;
  "venue:deleted": VenueDeletedEvent;
  "venue:photo_uploaded": VenuePhotoUploadedEvent;
  "venue:photo_deleted": VenuePhotoDeletedEvent;
  "venue:file_uploaded": VenueFileUploadedEvent;
  "venue:file_deleted": VenueFileDeletedEvent;
  "venue:file_updated": VenueFileUpdatedEvent;
  "venue:photo_updated": VenuePhotoUpdatedEvent;
  "venue:collection_created": VenueCollectionCreatedEvent;
  "venue:collection_updated": VenueCollectionUpdatedEvent;
  "venue:collection_deleted": VenueCollectionDeletedEvent;
  "venue:collection_venues_added": VenueCollectionVenuesAddedEvent;
  "venue:collection_venue_removed": VenueCollectionVenueRemovedEvent;
  "venue:collection_reordered": VenueCollectionReorderedEvent;
  "contact:created": ContactCreatedEvent;
  "contact:updated": ContactUpdatedEvent;
  "contact:deleted": ContactDeletedEvent;
  "contact:linked_client": ContactLinkedClientEvent;
  "contact:unlinked_client": ContactUnlinkedClientEvent;
  "contact:linked_vendor": ContactLinkedVendorEvent;
  "contact:unlinked_vendor": ContactUnlinkedVendorEvent;
  "client:created": ClientCreatedEvent;
  "client:updated": ClientUpdatedEvent;
  "client:deleted": ClientDeletedEvent;
  "client:linked_contact": ClientLinkedContactEvent;
  "client:unlinked_contact": ClientUnlinkedContactEvent;
  "vendor:created": VendorCreatedEvent;
  "vendor:updated": VendorUpdatedEvent;
  "vendor:deleted": VendorDeletedEvent;
  "vendor:linked_contact": VendorLinkedContactEvent;
  "vendor:unlinked_contact": VendorUnlinkedContactEvent;
  "vendor:token_generated": VendorTokenGeneratedEvent;
  "vendor:token_consumed": VendorTokenConsumedEvent;
  "vendor:bulk_email_sent": VendorBulkEmailSentEvent;
  "form_template:created": FormTemplateCreatedEvent;
  "form_template:updated": FormTemplateUpdatedEvent;
  "form_template:deleted": FormTemplateDeletedEvent;
  "form_request:created": FormRequestCreatedEvent;
  "form_request:updated": FormRequestUpdatedEvent;
  "form_request:deleted": FormRequestDeletedEvent;
  "form_request:sent": FormRequestSentEvent;
  "comment:created": CommentCreatedEvent;
  "comment:reply_created": CommentReplyCreatedEvent;
  "form:submission_received": FormSubmissionReceivedEvent;
  "feature_comment:created": FeatureCommentCreatedEvent;
  "proposal:created": ProposalCreatedEvent;
  "proposal:updated": ProposalUpdatedEvent;
  "proposal:deleted": ProposalDeletedEvent;
  "proposal:status_changed": ProposalStatusChangedEvent;
  "proposal:task_created": ProposalTaskCreatedEvent;
  "proposal:task_updated": ProposalTaskUpdatedEvent;
  "proposal:task_deleted": ProposalTaskDeletedEvent;
  "proposal:task_completed": ProposalTaskCompletedEvent;
  "proposal:task_link_created": ProposalTaskLinkCreatedEvent;
  "proposal:task_link_deleted": ProposalTaskLinkDeletedEvent;
  "proposal:stakeholder_added": ProposalStakeholderAddedEvent;
  "proposal:stakeholder_removed": ProposalStakeholderRemovedEvent;
  "proposal:team_member_added": ProposalTeamMemberAddedEvent;
  "proposal:team_member_updated": ProposalTeamMemberUpdatedEvent;
  "proposal:team_member_removed": ProposalTeamMemberRemovedEvent;
  "proposal:collaborator_added": ProposalCollaboratorAddedEvent;
  "proposal:collaborator_removed": ProposalCollaboratorRemovedEvent;
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
