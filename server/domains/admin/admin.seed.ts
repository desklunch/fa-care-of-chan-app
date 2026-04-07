import { adminStorage } from "./admin.storage";
import {
  TIER_0_PERMISSIONS,
  TIER_1_PERMISSIONS,
  TIER_2_PERMISSIONS,
  TIER_3_PERMISSIONS,
  type Permission,
} from "../../../shared/permissions";

const SYSTEM_ROLES = [
  {
    name: "admin",
    permissions: TIER_3_PERMISSIONS,
    isSystem: true,
    description: "Full access to everything",
  },
  {
    name: "manager",
    permissions: TIER_2_PERMISSIONS,
    isSystem: true,
    description: "Access to deals, sales management, and all employee permissions",
  },
  {
    name: "employee",
    permissions: TIER_1_PERMISSIONS,
    isSystem: true,
    description: "Write/delete access to venues, clients, contacts, vendors",
  },
  {
    name: "viewer",
    permissions: TIER_0_PERMISSIONS,
    isSystem: true,
    description: "Read-only access to venues, clients, contacts, vendors, team",
  },
  {
    name: "Sales Admin",
    permissions: TIER_2_PERMISSIONS,
    isSystem: false,
    description: "All Tier 2 permissions including sales management",
  },
  {
    name: "Sales",
    permissions: TIER_2_PERMISSIONS.filter((p: Permission) => p !== "sales.manage"),
    isSystem: false,
    description: "All Tier 2 permissions except sales management",
  },
];

export async function seedRoles(): Promise<void> {
  for (const roleDef of SYSTEM_ROLES) {
    const existing = await adminStorage.getRoleByName(roleDef.name);
    if (!existing) {
      await adminStorage.createRole({
        name: roleDef.name,
        permissions: roleDef.permissions,
        isSystem: roleDef.isSystem,
        description: roleDef.description,
      });
      console.log(`Seeded role: ${roleDef.name}`);
    }
  }
}
