import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { Building2, Shield } from "lucide-react";
import type { User } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";

const DEFAULT_VISIBLE_COLUMNS = ["name", "title", "department", "role"];

const teamFilters: FilterConfig<User>[] = [
  {
    id: "department",
    label: "Department",
    icon: Building2,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const departments = new Set<string>();
        data.forEach((user) => {
          if (user.department) {
            departments.add(user.department);
          }
        });
        return Array.from(departments)
          .sort()
          .map((dept) => ({ id: dept, label: dept }));
      },
    },
    matchFn: (user, selectedValues) => {
      if (!user.department) return false;
      return selectedValues.includes(user.department);
    },
  },
  {
    id: "role",
    label: "Role",
    icon: Shield,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const roles = new Set<string>();
        data.forEach((user) => {
          if (user.role) {
            roles.add(user.role);
          }
        });
        return Array.from(roles)
          .sort()
          .map((role) => ({ 
            id: role, 
            label: role.charAt(0).toUpperCase() + role.slice(1) 
          }));
      },
    },
    matchFn: (user, selectedValues) => {
      if (!user.role) return false;
      return selectedValues.includes(user.role);
    },
  },
];

const teamColumns: ColumnConfig<User>[] = [
  {
    id: "name",
    headerName: "Name",
    field: "firstName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { data: User }) => {
        const user = params.data;
        if (!user) return null;
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          "Unknown";
        return (
          <div className="flex items-center h-full">
            <span className="text-foreground">{fullName}</span>
          </div>
        );
      },
      valueGetter: (params: { data: User | undefined }) => {
        const user = params.data;
        return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
      },
    },
  },
  {
    id: "email",
    headerName: "Email",
    field: "email",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 150,
    },
  },
  {
    id: "title",
    headerName: "Title",
    field: "title",
    category: "Work",
    colDef: {
      flex: 1.2,
      minWidth: 150,
    },
  },
  {
    id: "department",
    headerName: "Department",
    field: "department",
    category: "Work",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "role",
    headerName: "Role",
    field: "role",
    category: "Work",
    colDef: {
      flex: 1,
      width: 120,
      cellRenderer: (params: { value: string }) => {
        const isAdmin = params.value === "admin";
      return (
        <div className="flex items-center h-full">
          <span className="capitalize">
            {params.value}
          </span>
        </div>

      );      },
    },
  },
  {
    id: "phone",
    headerName: "Phone",
    field: "phone",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 140,
    },
  },
  {
    id: "location",
    headerName: "Location",
    field: "location",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
];

export default function Team() {
  usePageTitle("Team");
  const [, setLocation] = useProtectedLocation();

  return (
    <PageLayout breadcrumbs={[{ label: "Team" }]}>
      <DataGridPage
        queryKey="/api/team"
        columns={teamColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          (user) => `${user.firstName || ""} ${user.lastName || ""}`,
          "email",
          "title",
          "department",
          "location",
        ]}
        searchPlaceholder="Search team..."
        onRowClick={(user) => setLocation(`/team/${user.id}`)}
        getRowId={(user) => user.id || ""}
        emptyMessage="No team members found"
        filters={teamFilters}
        toolbarActions={<></>}
      />
    </PageLayout>
  );
}
