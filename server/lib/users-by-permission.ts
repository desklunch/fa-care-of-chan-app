import { db } from "../db";
import { users, roles } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getPermissionsForRole,
  type Permission,
  type Role,
} from "@shared/permissions";

export async function getUserIdsWithPermission(
  permission: Permission,
): Promise<string[]> {
  const [allRoles, allUsers] = await Promise.all([
    db.select().from(roles),
    db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.isActive, true)),
  ]);

  const roleMap = new Map<string, string[]>();
  for (const r of allRoles) {
    roleMap.set(r.name, (r.permissions ?? []) as string[]);
  }

  const matching: string[] = [];
  for (const u of allUsers) {
    const roleName = u.role || "viewer";
    const perms =
      roleMap.get(roleName) ??
      (getPermissionsForRole(roleName as Role) as string[]);
    if (perms.includes(permission)) {
      matching.push(u.id);
    }
  }
  return matching;
}
