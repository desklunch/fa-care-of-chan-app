import { BaseService, ServiceError } from "../../services/base.service";
import { domainEvents } from "../../lib/events";
import { clientsStorage } from "./clients.storage";
import { getChangedFields } from "../../audit";
import type { Client, CreateClient, UpdateClient } from "@shared/schema";
import { insertClientSchema, updateClientSchema } from "@shared/schema";

export class ClientsService extends BaseService {
  async create(data: CreateClient, actorId: string): Promise<Client> {
    const parsed = insertClientSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid client data", {
        errors: parsed.error.flatten(),
      });
    }

    const client = await clientsStorage.createClient(parsed.data);

    domainEvents.emit({
      type: "client:created",
      clientId: client.id,
      clientName: client.name,
      actorId,
      timestamp: new Date(),
    });

    return client;
  }

  async update(id: string, data: UpdateClient, actorId: string): Promise<Client> {
    const existing = await clientsStorage.getClientById(id);
    this.ensureExists(existing, "Client", id);

    const parsed = updateClientSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid client update data", {
        errors: parsed.error.flatten(),
      });
    }

    const client = await clientsStorage.updateClient(id, parsed.data);
    if (!client) {
      throw ServiceError.notFound("Client", id);
    }

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      client as unknown as Record<string, unknown>,
    );

    domainEvents.emit({
      type: "client:updated",
      clientId: id,
      clientName: client.name,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return client;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const existing = await clientsStorage.getClientById(id);
    this.ensureExists(existing, "Client", id);

    await clientsStorage.deleteClient(id);

    domainEvents.emit({
      type: "client:deleted",
      clientId: id,
      clientName: existing!.name,
      actorId,
      timestamp: new Date(),
    });
  }

  async linkContact(clientId: string, contactId: string, actorId: string): Promise<void> {
    const client = await clientsStorage.getClientById(clientId);
    this.ensureExists(client, "Client", clientId);

    const contact = await clientsStorage.getContactById(contactId);
    this.ensureExists(contact, "Contact", contactId);

    await clientsStorage.linkClientContact(clientId, contactId);

    domainEvents.emit({
      type: "client:linked_contact",
      clientId,
      contactId,
      contactName: `${contact!.firstName} ${contact!.lastName}`,
      actorId,
      timestamp: new Date(),
    });
  }

  async unlinkContact(clientId: string, contactId: string, actorId: string): Promise<void> {
    await clientsStorage.unlinkClientContact(clientId, contactId);

    domainEvents.emit({
      type: "client:unlinked_contact",
      clientId,
      contactId,
      actorId,
      timestamp: new Date(),
    });
  }
}
