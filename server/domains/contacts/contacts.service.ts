import { BaseService, ServiceError } from "../../services/base.service";
import { domainEvents } from "../../lib/events";
import { contactsStorage } from "./contacts.storage";
import { getChangedFields } from "../../audit";
import type { Contact, CreateContact, UpdateContact } from "@shared/schema";
import { insertContactSchema, updateContactSchema } from "@shared/schema";
import type { ContactLocation } from "@shared/schema";
import { validateAndEnrichLocation } from "../places/places.service";

async function enrichLocationOrThrow(
  location: ContactLocation | null | undefined,
): Promise<ContactLocation | null | undefined> {
  if (location === undefined) return undefined;
  if (location === null) return null;
  if (!location.placeId) {
    throw ServiceError.validation(
      "Contact location must be selected from the city picker (placeId required)",
    );
  }
  try {
    return await validateAndEnrichLocation(location);
  } catch (err: any) {
    throw ServiceError.validation(
      err?.message || "Invalid contact location",
    );
  }
}

export class ContactsService extends BaseService {
  async create(data: CreateContact, actorId: string): Promise<Contact> {
    const parsed = insertContactSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid contact data", {
        errors: parsed.error.flatten(),
      });
    }

    const enrichedLocation = await enrichLocationOrThrow(
      parsed.data.location as ContactLocation | null | undefined,
    );
    const toCreate =
      enrichedLocation !== undefined
        ? { ...parsed.data, location: enrichedLocation }
        : parsed.data;

    const contact = await contactsStorage.createContact(toCreate);

    domainEvents.emit({
      type: "contact:created",
      contactId: contact.id,
      contactName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      actorId,
      timestamp: new Date(),
    });

    return contact;
  }

  async update(id: string, data: UpdateContact, actorId: string): Promise<Contact> {
    const parsed = updateContactSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid contact update data", {
        errors: parsed.error.flatten(),
      });
    }

    const existing = await contactsStorage.getContactById(id);
    this.ensureExists(existing, "Contact", id);

    const enrichedLocation = await enrichLocationOrThrow(
      parsed.data.location as ContactLocation | null | undefined,
    );
    const toUpdate =
      enrichedLocation !== undefined
        ? { ...parsed.data, location: enrichedLocation }
        : parsed.data;

    const contact = await contactsStorage.updateContact(id, toUpdate);
    if (!contact) {
      throw ServiceError.notFound("Contact", id);
    }

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      parsed.data as unknown as Record<string, unknown>,
    );

    domainEvents.emit({
      type: "contact:updated",
      contactId: id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return contact;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const existing = await contactsStorage.getContactById(id);
    this.ensureExists(existing, "Contact", id);

    await contactsStorage.deleteContact(id);

    domainEvents.emit({
      type: "contact:deleted",
      contactId: id,
      contactName: `${existing!.firstName} ${existing!.lastName}`,
      actorId,
      timestamp: new Date(),
    });
  }

  async linkClient(contactId: string, clientId: string, actorId: string): Promise<void> {
    const contact = await contactsStorage.getContactById(contactId);
    this.ensureExists(contact, "Contact", contactId);

    const client = await contactsStorage.getClientById(clientId);
    this.ensureExists(client, "Client", clientId);

    await contactsStorage.linkClientContact(clientId, contactId);

    domainEvents.emit({
      type: "contact:linked_client",
      contactId,
      clientId,
      clientName: client!.name,
      actorId,
      timestamp: new Date(),
    });
  }

  async unlinkClient(contactId: string, clientId: string, actorId: string): Promise<void> {
    await contactsStorage.unlinkClientContact(clientId, contactId);

    domainEvents.emit({
      type: "contact:unlinked_client",
      contactId,
      clientId,
      actorId,
      timestamp: new Date(),
    });
  }

  async linkVendor(contactId: string, vendorId: string, actorId: string): Promise<void> {
    const contact = await contactsStorage.getContactById(contactId);
    this.ensureExists(contact, "Contact", contactId);

    const vendor = await contactsStorage.getVendorById(vendorId);
    this.ensureExists(vendor, "Vendor", vendorId);

    await contactsStorage.linkVendorContact(vendorId, contactId);

    domainEvents.emit({
      type: "contact:linked_vendor",
      contactId,
      vendorId,
      vendorName: vendor!.businessName,
      actorId,
      timestamp: new Date(),
    });
  }

  async unlinkVendor(contactId: string, vendorId: string, actorId: string): Promise<void> {
    await contactsStorage.unlinkVendorContact(vendorId, contactId);

    domainEvents.emit({
      type: "contact:unlinked_vendor",
      contactId,
      vendorId,
      actorId,
      timestamp: new Date(),
    });
  }
}
