import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { User } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";

const DEFAULT_VISIBLE_COLUMNS = ["name", "title", "department", "role"];

const teamColumns: ColumnConfig<User>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "Basic Info",
    colDef: {
      width: 120,
    },
  },
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
    id: "firstName",
    headerName: "First Name",
    field: "firstName",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "lastName",
    headerName: "Last Name",
    field: "lastName",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
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
    id: "profileImageUrl",
    headerName: " Image",
    field: "profileImageUrl",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: { data: User }) => {
        const user = params.data;
        if (!user?.profileImageUrl) return null;
        const initials =
          `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
          "U";
        return (
          <div className="flex items-center h-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.profileImageUrl}
                alt={`${user.firstName} ${user.lastName}`}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        );
      },
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
  {
    id: "bio",
    headerName: "Bio",
    field: "bio",
    category: "Details",
    colDef: {
      flex: 2,
      minWidth: 150,
    },
  },
  {
    id: "isActive",
    headerName: "Status",
    field: "isActive",
    category: "Details",
    colDef: {
      flex: 1,
      width: 100,
      cellRenderer: (params: { value: boolean }) => {
        return (
          <div className="flex items-center h-full">
            <span className="capitalize">
              {params.value ? "Active" : "Inactive"}
            </span>
          </div>

        );
      },
    },
  },
  {
    id: "createdAt",
    headerName: "Created At",
    field: "createdAt",
    category: "Details",
    colDef: {
      width: 130,
      cellRenderer: (params: { value: string | Date | null }) => {
        if (!params.value) return null;
        const date = new Date(params.value);
        return (
          <div className="flex items-center h-full text-muted-foreground">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        );
      },
    },
  },
  {
    id: "updatedAt",
    headerName: "Updated At",
    field: "updatedAt",
    category: "Details",
    colDef: {
      width: 130,
      cellRenderer: (params: { value: string | Date | null }) => {
        if (!params.value) return null;
        const date = new Date(params.value);
        return (
          <div className="flex items-center h-full text-muted-foreground">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        );
      },
    },
  },
];

export default function Team() {
  const [, setLocation] = useLocation();

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
        toolbarActions={<></>}
      />
    </PageLayout>
  );
}
