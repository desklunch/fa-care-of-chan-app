import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import type { VendorUpdateTokenWithRelations } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

type TokenStatus = "used" | "expired" | "active";

function getTokenStatus(token: VendorUpdateTokenWithRelations): TokenStatus {
  if (token.used) return "used";
  if (new Date(token.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusCellRenderer({ value }: ICellRendererParams<VendorUpdateTokenWithRelations, TokenStatus>) {
  if (!value) return null;
  
  const config: Record<TokenStatus, { label: string; variant: "default" | "destructive" | "secondary"; icon: typeof CheckCircle }> = {
    used: { label: "Used", variant: "default", icon: CheckCircle },
    expired: { label: "Expired", variant: "destructive", icon: XCircle },
    active: { label: "Active", variant: "secondary", icon: Clock },
  };
  
  const { label, variant, icon: Icon } = config[value];
  
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function VendorLinkCellRenderer({ data }: ICellRendererParams<VendorUpdateTokenWithRelations>) {
  if (!data?.vendor) return <span className="text-muted-foreground">—</span>;
  
  return (
    <a
      href={`/vendors/${data.vendorId}`}
      className="flex items-center gap-1 text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
      data-testid={`link-vendor-${data.vendorId}`}
    >
      {data.vendor.businessName}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function CreatedByCellRenderer({ data }: ICellRendererParams<VendorUpdateTokenWithRelations>) {
  if (!data?.createdBy) return <span className="text-muted-foreground">—</span>;
  
  const firstName = data.createdBy.firstName || "";
  const lastName = data.createdBy.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  
  return <span>{fullName || "Unknown"}</span>;
}

function TokenCellRenderer({ data }: ICellRendererParams<VendorUpdateTokenWithRelations>) {
  if (!data?.token) return <span className="text-muted-foreground">—</span>;
  
  const truncatedToken = `${data.token.substring(0, 12)}...`;
  
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {truncatedToken}
    </span>
  );
}

const tokenColumns: ColumnConfig<VendorUpdateTokenWithRelations>[] = [
  {
    id: "vendorName",
    headerName: "Business Name",
    category: "Vendor",
    colDef: {
      flex: 2,
      minWidth: 200,
      valueGetter: (params) => params.data?.vendor?.businessName || "",
      cellRenderer: VendorLinkCellRenderer,
    },
  },
  {
    id: "token",
    headerName: "Token",
    field: "token",
    category: "Token",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: TokenCellRenderer,
    },
  },
  {
    id: "status",
    headerName: "Status",
    category: "Status",
    colDef: {
      width: 120,
      valueGetter: (params) => params.data ? getTokenStatus(params.data) : null,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "createdBy",
    headerName: "Created By",
    category: "User",
    colDef: {
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        if (!params.data?.createdBy) return "";
        const first = params.data.createdBy.firstName || "";
        const last = params.data.createdBy.lastName || "";
        return `${first} ${last}`.trim();
      },
      cellRenderer: CreatedByCellRenderer,
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Dates",
    colDef: {
      width: 120,
      cellRenderer: DateCellRenderer,
    },
  },
  {
    id: "expiresAt",
    headerName: "Expires",
    field: "expiresAt",
    category: "Dates",
    colDef: {
      width: 120,
      cellRenderer: DateCellRenderer,
    },
  },
];

const defaultVisibleColumns = [
  "vendorName",
  "token",
  "status",
  "createdBy",
  "createdAt",
  "expiresAt",
];

export default function AdminVendorTokens() {
  const { user, isLoading, error } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
    if (error && isUnauthorizedError(error)) {
      setLocation("/");
    }
    if (user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, isLoading, error, setLocation]);

  const handleRowClick = useCallback((token: VendorUpdateTokenWithRelations) => {
    if (token.vendorId) {
      setLocation(`/vendors/${token.vendorId}`);
    }
  }, [setLocation]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="p-6">Loading...</div>
      </PageLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <PageLayout>
      <DataGridPage
        queryKey="/api/vendor-update-tokens"
        columns={tokenColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        searchFields={[
          (item: VendorUpdateTokenWithRelations) => item.vendor?.businessName || "",
          (item: VendorUpdateTokenWithRelations) => {
            if (!item.createdBy) return "";
            return `${item.createdBy.firstName || ""} ${item.createdBy.lastName || ""}`.trim();
          },
        ]}
        searchPlaceholder="Search by vendor name or creator..."
        onRowClick={handleRowClick}
        getRowId={(item: VendorUpdateTokenWithRelations) => item.id}
        emptyMessage="No update tokens generated yet"
        emptyDescription="Generate update links from the vendor detail page to allow vendors to update their own profiles."
      />
    </PageLayout>
  );
}
