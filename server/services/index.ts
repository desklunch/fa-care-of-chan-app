import type { IStorage } from "../storage";
import { DealsService } from "../domains/deals/deals.service";

export { BaseService, ServiceError } from "./base.service";
export { DealsService } from "../domains/deals/deals.service";

export interface Services {
  deals: DealsService;
}

export function createServices(storage: IStorage): Services {
  return {
    deals: new DealsService(storage),
  };
}
