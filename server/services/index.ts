import type { IStorage } from "../storage";
import { DealsService } from "../domains/deals/deals.service";
import { ContactsService } from "../domains/contacts/contacts.service";
import { ClientsService } from "../domains/clients/clients.service";
import { VendorsService } from "../domains/vendors/vendors.service";

export { BaseService, ServiceError } from "./base.service";
export { DealsService } from "../domains/deals/deals.service";
export { ContactsService } from "../domains/contacts/contacts.service";
export { ClientsService } from "../domains/clients/clients.service";
export { VendorsService } from "../domains/vendors/vendors.service";

export interface Services {
  deals: DealsService;
  contacts: ContactsService;
  clients: ClientsService;
  vendors: VendorsService;
}

export function createServices(storage: IStorage): Services {
  return {
    deals: new DealsService(storage),
    contacts: new ContactsService(storage),
    clients: new ClientsService(storage),
    vendors: new VendorsService(storage),
  };
}
