import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowClickedEvent, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);
import { PageLayout } from "@/framework";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import type { User } from "@shared/schema";

function AvatarCellRenderer(params: { value: string; data: User }) {
  const user = params.data;
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  
  return (
    <div className="flex items-center h-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function NameCellRenderer(params: { data: User }) {
  const user = params.data;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
  
  return (
    <div className="flex items-center h-full">
      <span className="font-medium text-foreground hover:text-primary transition-colors">
        {fullName}
      </span>
    </div>
  );
}

function DepartmentCellRenderer(params: { value: string }) {
  if (!params.value) return null;
  
  return (
    <div className="flex items-center h-full">
      <Badge variant="secondary" className="font-normal">
        {params.value}
      </Badge>
    </div>
  );
}

function RoleCellRenderer(params: { value: string }) {
  const isAdmin = params.value === "admin";
  
  return (
    <div className="flex items-center h-full">
      <Badge variant={isAdmin ? "default" : "outline"} className="font-normal capitalize">
        {params.value}
      </Badge>
    </div>
  );
}

export default function Directory() {
  const [, setLocation] = useLocation();
  const [searchText, setSearchText] = useState("");

  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  const columnDefs: ColDef<User>[] = useMemo(
    () => [
      {
        headerName: "",
        field: "profileImageUrl",
        width: 60,
        sortable: false,
        filter: false,
        cellRenderer: AvatarCellRenderer,
        cellClass: "flex items-center",
      },
      {
        headerName: "Name",
        field: "firstName",
        flex: 1.5,
        minWidth: 180,
        cellRenderer: NameCellRenderer,
        valueGetter: (params) => {
          const user = params.data;
          return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
        },
      },
      {
        headerName: "Title",
        field: "title",
        flex: 1.2,
        minWidth: 150,
      },
      {
        headerName: "Department",
        field: "department",
        flex: 1,
        minWidth: 130,
        cellRenderer: DepartmentCellRenderer,
      },
      {
        headerName: "Email",
        field: "email",
        flex: 1.5,
        minWidth: 200,
      },
      {
        headerName: "Phone",
        field: "phone",
        flex: 1,
        minWidth: 130,
      },
      {
        headerName: "Location",
        field: "location",
        flex: 1,
        minWidth: 130,
      },
      {
        headerName: "Role",
        field: "role",
        width: 100,
        cellRenderer: RoleCellRenderer,
      },
    ],
    []
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const filteredEmployees = useMemo(() => {
    if (!searchText.trim()) return employees;
    const search = searchText.toLowerCase();
    return employees.filter((emp) => {
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(search) ||
        emp.email?.toLowerCase().includes(search) ||
        emp.title?.toLowerCase().includes(search) ||
        emp.department?.toLowerCase().includes(search) ||
        emp.location?.toLowerCase().includes(search)
      );
    });
  }, [employees, searchText]);

  const onRowClicked = useCallback(
    (event: RowClickedEvent<User>) => {
      if (event.data) {
        setLocation(`/employees/${event.data.id}`);
      }
    },
    [setLocation]
  );

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Employee Directory" }]}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Employee Directory" }]}>
      <div className="p-4 md:p-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 h-10"
              data-testid="input-search-employees"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span data-testid="text-employee-count">{filteredEmployees.length} employees</span>
          </div>
        </div>

        <div
          className="ag-theme-alpine flex-1 min-h-[400px] rounded-lg border border-border overflow-hidden"
          style={{ 
            "--ag-header-height": "48px",
            "--ag-row-height": "56px",
            "--ag-header-background-color": "hsl(var(--card))",
            "--ag-background-color": "hsl(var(--background))",
            "--ag-odd-row-background-color": "hsl(var(--card) / 0.5)",
            "--ag-row-hover-color": "hsl(var(--accent))",
            "--ag-border-color": "hsl(var(--border))",
            "--ag-header-foreground-color": "hsl(var(--foreground))",
            "--ag-foreground-color": "hsl(var(--foreground))",
            "--ag-secondary-foreground-color": "hsl(var(--muted-foreground))",
            "--ag-font-family": "var(--font-sans)",
            "--ag-font-size": "14px",
          } as React.CSSProperties}
          data-testid="grid-employees"
        >
          <AgGridReact
            rowData={filteredEmployees}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            rowSelection={{ mode: "singleRow" }}
            theme="legacy"
            onRowClicked={onRowClicked}
            suppressCellFocus={true}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
            domLayout="normal"
            getRowId={(params) => params.data?.id}
            overlayNoRowsTemplate={`
              <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <svg class="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>No employees found</p>
              </div>
            `}
          />
        </div>
      </div>
    </PageLayout>
  );
}
