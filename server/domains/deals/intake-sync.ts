import { dealsStorage } from "./deals.storage";
import { DealsService } from "./deals.service";
import {
  buildIntakeFieldKey,
  type FormSection,
  type FormField,
  mappableEntities,
} from "@shared/schema";
import { domainEvents } from "../../lib/events";

export interface IntakeSyncChange {
  propertyKey: string;
  label: string;
  currentValue: unknown;
  newValue: unknown;
  fieldId: string;
}

export interface IntakeSyncResult {
  changes: IntakeSyncChange[];
  applied: boolean;
  message?: string;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, i) => key === bKeys[i] && deepEqual(aObj[key], bObj[key]));
  }
  return a === b;
}

export async function computeIntakeSync(
  dealsService: DealsService,
  dealId: string,
): Promise<{ changes: IntakeSyncChange[]; dealUpdates: Record<string, unknown>; tagIds: string[] | null } | null> {
  const intake = await dealsStorage.getDealIntake(dealId);
  if (!intake) return null;

  const deal = await dealsService.getById(dealId);
  const formSchema = intake.formSchema as FormSection[];
  const responseData = intake.responseData as Record<string, unknown>;

  const mappedFields: { field: FormField; key: string }[] = [];
  for (const section of formSchema) {
    for (const field of section.fields) {
      if (field.entityMapping?.entityType === "deal" && field.entityMapping?.propertyKey) {
        mappedFields.push({
          field,
          key: buildIntakeFieldKey(section.templateNamespace, field.id),
        });
      }
    }
  }

  const changes: IntakeSyncChange[] = [];
  const dealUpdates: Record<string, unknown> = {};
  let tagIds: string[] | null = null;

  for (const { field, key } of mappedFields) {
    const propKey = field.entityMapping!.propertyKey;
    const responseValue = responseData[key];

    if (responseValue === undefined || responseValue === null || responseValue === "") continue;
    if (Array.isArray(responseValue) && responseValue.length === 0) continue;
    if (typeof responseValue === "object" && !Array.isArray(responseValue) && Object.keys(responseValue as object).length === 0) continue;

    const propDef = mappableEntities.deal.properties.find((p) => p.key === propKey);
    if (!propDef) continue;

    const parseResult = propDef.valueSchema.safeParse(responseValue);
    if (!parseResult.success) continue;

    if (propKey === "tags") {
      const currentTagIds = await dealsStorage.getDealTagIds(dealId);
      const newTagIds = responseValue as string[];
      const sortedCurrent = [...currentTagIds].sort();
      const sortedNew = [...newTagIds].sort();
      const tagsMatch =
        sortedCurrent.length === sortedNew.length &&
        sortedCurrent.every((v, i) => v === sortedNew[i]);
      if (!tagsMatch) {
        tagIds = newTagIds;
        changes.push({
          propertyKey: "tags",
          label: propDef.label,
          currentValue: currentTagIds,
          newValue: tagIds,
          fieldId: field.id,
        });
      }
    } else {
      const currentValue = (deal as Record<string, unknown>)[propKey];
      if (!deepEqual(currentValue, responseValue)) {
        changes.push({
          propertyKey: propKey,
          label: propDef.label,
          currentValue,
          newValue: responseValue,
          fieldId: field.id,
        });
        dealUpdates[propKey] = responseValue;
      }
    }
  }

  return { changes, dealUpdates, tagIds };
}

export async function applyIntakeSync(
  dealsService: DealsService,
  dealId: string,
  actorId: string,
): Promise<IntakeSyncResult> {
  const computed = await computeIntakeSync(dealsService, dealId);
  if (!computed) {
    return { changes: [], applied: false, message: "No intake found for this deal" };
  }
  const { changes, dealUpdates, tagIds } = computed;
  if (changes.length === 0) {
    return { changes: [], applied: false, message: "No data to sync" };
  }
  if (Object.keys(dealUpdates).length > 0) {
    await dealsService.update(dealId, dealUpdates, actorId);
  }
  if (tagIds !== null) {
    await dealsStorage.setDealTags(dealId, tagIds);
  }
  domainEvents.emit({
    type: "deal:intake_synced",
    dealId,
    changedProperties: changes.map((c) => c.propertyKey),
    actorId,
    timestamp: new Date(),
  });
  return { changes, applied: true };
}
