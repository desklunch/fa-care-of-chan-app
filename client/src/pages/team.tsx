import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowClickedEvent, ModuleRegistry, AllCommunityModule, themeQuartz, iconSetMaterial } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    browserColorScheme: "light",
    headerFontSize: 14,
    spacing: 12
  });
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

export default function Team() {
  const [, setLocation] = useLocation();
  const [searchText, setSearchText] = useState("");

  const { data: team = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/team"],
  });

  const columnDefs: ColDef<User>[] = useMemo(
    () => [

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
        minWidth: 150,
        cellRenderer: DepartmentCellRenderer,
      },
      {
        headerName: "Role",
        field: "role",
        width: 150,
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

  const filteredTeam = useMemo(() => {
    if (!searchText.trim()) return team;
    const search = searchText.toLowerCase();
    return team.filter((member) => {
      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(search) ||
        member.email?.toLowerCase().includes(search) ||
        member.title?.toLowerCase().includes(search) ||
        member.department?.toLowerCase().includes(search) ||
        member.location?.toLowerCase().includes(search)
      );
    });
  }, [team, searchText]);

  const onRowClicked = useCallback(
    (event: RowClickedEvent<User>) => {
      if (event.data) {
        setLocation(`/team/${event.data.id}`);
      }
    },
    [setLocation]
  );

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Team" }]}>
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
    <PageLayout breadcrumbs={[{ label: "Team" }]}>
      <div className="p-4 md:p-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 h-10"
              data-testid="input-search-team"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span data-testid="text-team-count">{filteredTeam.length} members</span>
          </div>
        </div>

        <div
          className="flex-1 min-h-[400px] overflow-hidden"
          data-testid="grid-team"
        >
          <AgGridReact
            rowData={filteredTeam}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            theme={gridTheme}
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
                <p>No team members found</p>
              </div>
            `}
          />
        </div>
      </div>
    </PageLayout>
  );
}
