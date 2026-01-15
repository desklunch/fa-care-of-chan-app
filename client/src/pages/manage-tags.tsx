import { usePageTitle } from "@/hooks/use-page-title";
import { ManagePage, type ManageSectionConfig } from "@/components/manage-page";
import { usePermissions } from "@/hooks/usePermissions";
import { NoPermissionMessage } from "@/components/no-permission-message";
import type { Amenity, Tag, Industry, DealService, VendorService } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { z } from "zod";
import { Sparkles, UtensilsCrossed, Lightbulb, Building2, Briefcase, Wrench } from "lucide-react";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[name];
  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  return <IconComponent className={className} />;
}

function AmenityIconCellRenderer({ data }: { data: Amenity }) {
  if (!data) return null;
  return (
    <div className="flex items-center justify-start h-full">
      <DynamicIcon name={data.icon} className="w-5 h-5 [&_svg]:stroke-[1.5px]" />
    </div>
  );
}

function AmenityNameCellRenderer({ data }: { data: Amenity }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-amenity-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function AmenityDescriptionCellRenderer({ data }: { data: Amenity }) {
  if (!data?.description) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.description}
    </span>
  );
}

function TagNameCellRenderer({ data }: { data: Tag }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-tag-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function IndustryNameCellRenderer({ data }: { data: Industry }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-industry-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function DescriptionCellRenderer({ data }: { data: Industry | DealService | VendorService }) {
  if (!data?.description) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.description}
    </span>
  );
}

function ServiceNameCellRenderer({ data }: { data: DealService | VendorService }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-service-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function VendorServiceIconCellRenderer({ data }: { data: VendorService }) {
  if (!data?.icon) return null;
  return (
    <div className="flex items-center justify-start h-full">
      <DynamicIcon name={data.icon} className="w-5 h-5 [&_svg]:stroke-[1.5px]" />
    </div>
  );
}

const amenityFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  icon: z.string().min(1, "Icon is required").max(100),
});

const styleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.literal("Style").default("Style"),
});

const cuisineFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.literal("Cuisine").default("Cuisine"),
});

const industryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

const dealServiceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

const vendorServiceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

const amenityColumns: ColumnConfig<Amenity>[] = [
  {
    id: "icon",
    headerName: "Icon",
    field: "icon",
    colDef: {
      flex: 0.5,
      maxWidth: 100,
      minWidth: 100,
      cellRenderer: (params: { data: Amenity }) => <AmenityIconCellRenderer data={params.data} />,
    },
  },
  {
    id: "name",
    headerName: "Name",
    field: "name",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: Amenity }) => <AmenityNameCellRenderer data={params.data} />,
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    colDef: {
      flex: 3,
      minWidth: 200,
      cellRenderer: (params: { data: Amenity }) => <AmenityDescriptionCellRenderer data={params.data} />,
    },
  },
];

const tagColumns: ColumnConfig<Tag>[] = [
  {
    id: "name",
    headerName: "Name",
    field: "name",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: Tag }) => <TagNameCellRenderer data={params.data} />,
    },
  },
];

const industryColumns: ColumnConfig<Industry>[] = [
  {
    id: "name",
    headerName: "Name",
    field: "name",
    colDef: {
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: { data: Industry }) => <IndustryNameCellRenderer data={params.data} />,
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    colDef: {
      flex: 3,
      minWidth: 300,
      cellRenderer: (params: { data: Industry }) => <DescriptionCellRenderer data={params.data} />,
    },
  },
];

const dealServiceColumns: ColumnConfig<DealService>[] = [
  {
    id: "name",
    headerName: "Name",
    field: "name",
    colDef: {
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: { data: DealService }) => <ServiceNameCellRenderer data={params.data} />,
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    colDef: {
      flex: 3,
      minWidth: 300,
      cellRenderer: (params: { data: DealService }) => <DescriptionCellRenderer data={params.data} />,
    },
  },
];

const vendorServiceColumns: ColumnConfig<VendorService>[] = [
  {
    id: "icon",
    headerName: "Icon",
    field: "icon",
    colDef: {
      flex: 0.5,
      maxWidth: 100,
      minWidth: 100,
      cellRenderer: (params: { data: VendorService }) => <VendorServiceIconCellRenderer data={params.data} />,
    },
  },
  {
    id: "name",
    headerName: "Name",
    field: "name",
    colDef: {
      flex: 1,
      minWidth: 200,
      cellRenderer: (params: { data: VendorService }) => <ServiceNameCellRenderer data={params.data} />,
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    colDef: {
      flex: 3,
      minWidth: 300,
      cellRenderer: (params: { data: VendorService }) => <DescriptionCellRenderer data={params.data} />,
    },
  },
];

const amenitiesSection: ManageSectionConfig<Amenity> = {
  id: "amenities",
  label: "Amenities",
  icon: Sparkles,
  description: "Manage venue amenities like WiFi, Parking, etc.",
  queryKey: "/api/amenities",
  columns: amenityColumns,
  defaultVisibleColumns: ["icon", "name", "description"],
  searchFields: ["name", "description"],
  searchPlaceholder: "Search amenities...",
  emptyMessage: "No amenities yet",
  emptyDescription: "Create your first amenity to get started.",
  getRowId: (amenity) => amenity.id,
  formSchema: amenityFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., WiFi, Parking, Pool",
      required: true,
    },
    {
      name: "icon",
      label: "Icon",
      type: "icon",
      placeholder: "e.g., Wifi, Car, Waves",
      description: "Enter a Lucide icon name (e.g., Wifi, Car, Waves, Utensils).",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Optional description of the amenity",
    },
  ],
  createDialogTitle: "New Amenity",
  createDialogDescription: "Add a new amenity that can be assigned to venues.",
  editDialogTitle: "Edit Amenity",
  editDialogDescription: "Update the amenity details below.",
  createEndpoint: "/api/amenities",
  updateEndpoint: (id) => `/api/amenities/${id}`,
  deleteEndpoint: (id) => `/api/amenities/${id}`,
  invalidateKeys: ["/api/amenities"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    description: item?.description || "",
    icon: item?.icon || "",
  }),
  entityName: "Amenity",
};

const stylesSection: ManageSectionConfig<Tag> = {
  id: "styles",
  label: "Styles",
  icon: Lightbulb,
  description: "Manage venue style tags like Casual, Formal, etc.",
  queryKey: "/api/tags?category=Style",
  columns: tagColumns,
  defaultVisibleColumns: ["name"],
  searchFields: ["name"],
  searchPlaceholder: "Search styles...",
  emptyMessage: "No styles yet",
  emptyDescription: "Create your first style tag to get started.",
  getRowId: (tag) => tag.id,
  formSchema: styleFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., Casual, Formal, Trendy",
      required: true,
    },
  ],
  createDialogTitle: "New Style",
  createDialogDescription: "Add a new style tag that can be assigned to venues.",
  editDialogTitle: "Edit Style",
  editDialogDescription: "Update the style tag details below.",
  createEndpoint: "/api/tags",
  updateEndpoint: (id) => `/api/tags/${id}`,
  deleteEndpoint: (id) => `/api/tags/${id}`,
  invalidateKeys: ["/api/tags", "/api/tags?category=Style"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    category: "Style",
  }),
  entityName: "Style",
};

const cuisinesSection: ManageSectionConfig<Tag> = {
  id: "cuisines",
  label: "Cuisines",
  icon: UtensilsCrossed,
  description: "Manage venue cuisine tags like Italian, Japanese, etc.",
  queryKey: "/api/tags?category=Cuisine",
  columns: tagColumns,
  defaultVisibleColumns: ["name"],
  searchFields: ["name"],
  searchPlaceholder: "Search cuisines...",
  emptyMessage: "No cuisines yet",
  emptyDescription: "Create your first cuisine tag to get started.",
  getRowId: (tag) => tag.id,
  formSchema: cuisineFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., Italian, Japanese, Mexican",
      required: true,
    },
  ],
  createDialogTitle: "New Cuisine",
  createDialogDescription: "Add a new cuisine tag that can be assigned to venues.",
  editDialogTitle: "Edit Cuisine",
  editDialogDescription: "Update the cuisine tag details below.",
  createEndpoint: "/api/tags",
  updateEndpoint: (id) => `/api/tags/${id}`,
  deleteEndpoint: (id) => `/api/tags/${id}`,
  invalidateKeys: ["/api/tags", "/api/tags?category=Cuisine"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    category: "Cuisine",
  }),
  entityName: "Cuisine",
};

const industriesSection: ManageSectionConfig<Industry> = {
  id: "industries",
  label: "Industries",
  icon: Building2,
  description: "Manage client industries like Technology, Healthcare, etc.",
  queryKey: "/api/industries",
  columns: industryColumns,
  defaultVisibleColumns: ["name", "description"],
  searchFields: ["name", "description"],
  searchPlaceholder: "Search industries...",
  emptyMessage: "No industries yet",
  emptyDescription: "Create your first industry to get started.",
  getRowId: (industry) => industry.id,
  formSchema: industryFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., Technology, Healthcare, Finance",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Optional description of the industry",
    },
  ],
  createDialogTitle: "New Industry",
  createDialogDescription: "Add a new industry that can be assigned to clients.",
  editDialogTitle: "Edit Industry",
  editDialogDescription: "Update the industry details below.",
  createEndpoint: "/api/industries",
  updateEndpoint: (id) => `/api/industries/${id}`,
  deleteEndpoint: (id) => `/api/industries/${id}`,
  invalidateKeys: ["/api/industries"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    description: item?.description || "",
  }),
  entityName: "Industry",
};

type DealServiceWithStringId = Omit<DealService, 'id'> & { id: string };

const dealServicesSection: ManageSectionConfig<DealServiceWithStringId> = {
  id: "deal-services",
  label: "Deal Services",
  icon: Briefcase,
  description: "Manage services that can be assigned to deals.",
  queryKey: "/api/deal-services",
  columns: dealServiceColumns as unknown as ColumnConfig<DealServiceWithStringId>[],
  defaultVisibleColumns: ["name", "description"],
  searchFields: ["name", "description"],
  searchPlaceholder: "Search deal services...",
  emptyMessage: "No deal services yet",
  emptyDescription: "Create your first deal service to get started.",
  getRowId: (service) => String(service.id),
  formSchema: dealServiceFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., Catering, Production, Event Planning",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Optional description of the service",
    },
  ],
  createDialogTitle: "New Deal Service",
  createDialogDescription: "Add a new service that can be assigned to deals.",
  editDialogTitle: "Edit Deal Service",
  editDialogDescription: "Update the deal service details below.",
  createEndpoint: "/api/deal-services",
  updateEndpoint: (id) => `/api/deal-services/${id}`,
  deleteEndpoint: (id) => `/api/deal-services/${id}`,
  invalidateKeys: ["/api/deal-services"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    description: item?.description || "",
  }),
  entityName: "Deal Service",
};

const vendorServicesSection: ManageSectionConfig<VendorService> = {
  id: "vendor-services",
  label: "Vendor Services",
  icon: Wrench,
  description: "Manage services that can be provided by vendors.",
  queryKey: "/api/vendor-services",
  columns: vendorServiceColumns,
  defaultVisibleColumns: ["icon", "name", "description"],
  searchFields: ["name", "description"],
  searchPlaceholder: "Search vendor services...",
  emptyMessage: "No vendor services yet",
  emptyDescription: "Create your first vendor service to get started.",
  getRowId: (service) => service.id,
  formSchema: vendorServiceFormSchema,
  formFields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g., Photography, Catering, DJ",
      required: true,
    },
    {
      name: "icon",
      label: "Icon",
      type: "icon",
      placeholder: "e.g., Camera, Utensils, Music",
      description: "Enter a Lucide icon name (optional).",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Optional description of the service",
    },
  ],
  createDialogTitle: "New Vendor Service",
  createDialogDescription: "Add a new service that can be provided by vendors.",
  editDialogTitle: "Edit Vendor Service",
  editDialogDescription: "Update the vendor service details below.",
  createEndpoint: "/api/vendor-services",
  updateEndpoint: (id) => `/api/vendor-services/${id}`,
  deleteEndpoint: (id) => `/api/vendor-services/${id}`,
  invalidateKeys: ["/api/vendor-services"],
  getDefaultValues: (item) => ({
    name: item?.name || "",
    description: item?.description || "",
    icon: item?.icon || "",
  }),
  entityName: "Vendor Service",
};

export default function ManageTagsPage() {
  usePageTitle("Manage Tags");
  const { can } = usePermissions();
  
  const canManageVenues = can("venues.write");
  const canManageSales = can("sales.manage");
  const canManageVendors = can("vendors.write");
  
  const hasAnyPermission = canManageVenues || canManageSales || canManageVendors;
  
  const sections: ManageSectionConfig<any>[] = [];
  
  if (canManageVenues) {
    sections.push(amenitiesSection, stylesSection, cuisinesSection);
  }
  
  if (canManageSales) {
    sections.push(industriesSection, dealServicesSection);
  }
  
  if (canManageVendors) {
    sections.push(vendorServicesSection);
  }

  if (!hasAnyPermission) {
    return <NoPermissionMessage />;
  }

  return (
    <ManagePage
      title="Manage Tags"
      sections={sections}
      breadcrumbs={[{ label: "Tags" }]}
    />
  );
}
