/**
 * Reference Data Domain Module
 * 
 * Manages reference/lookup data used across the application:
 * - Tags (venue categorization)
 * - Amenities (venue features)
 * - Industries (client classification)
 * - Deal Services (service offerings)
 * - Brands (client brands)
 */

export { registerReferenceDataRoutes } from './reference-data.routes';
export { 
  type IReferenceDataStorage, 
  ReferenceDataStorage, 
  referenceDataStorage 
} from './reference-data.storage';
