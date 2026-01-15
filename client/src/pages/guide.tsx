import { useState } from "react";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Store,
  FolderOpen,
  MessageSquare,
  Tag,
  FileText,
  Layout,
  Paperclip,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Users,
  Contact,
  Briefcase,
  Building2,
  Lightbulb,
  Settings,
  BookOpen,
  ChevronRight,
} from "lucide-react";

type GuideSection = {
  id: string;
  title: string;
  icon: typeof Store;
  subsections?: { id: string; title: string }[];
  isStub?: boolean;
};

const guideSections: GuideSection[] = [
  {
    id: "deals",
    title: "Deals",
    icon: Briefcase,
    subsections: [
      { id: "deals-overview", title: "Overview" },
      { id: "deals-grid", title: "Deals Data Grid" },
      { id: "deals-columns", title: "Column Visibility & Repositioning" },
      { id: "deals-sorting", title: "Sorting" },
      { id: "deals-search-filters", title: "Search & Filters" },
      { id: "deals-inline-editing", title: "Inline Editing" },
      { id: "deals-creating", title: "Creating Deals" },
      { id: "deals-detail", title: "Deal Detail Page" },
      { id: "deals-editing", title: "Editing Deals" },
      { id: "deals-deleting", title: "Deleting Deals" },
    ],
  },
  {
    id: "clients",
    title: "Clients",
    icon: Users,
    subsections: [
      { id: "clients-overview", title: "Overview" },
      { id: "clients-grid", title: "Clients Data Grid" },
      { id: "clients-search-filters", title: "Search & Filters" },
      { id: "clients-creating", title: "Creating Clients" },
      { id: "clients-detail", title: "Client Detail Page" },
      { id: "clients-contacts", title: "Linking Contacts" },
      { id: "clients-deals", title: "Associated Deals" },
      { id: "clients-editing", title: "Editing Clients" },
      { id: "clients-deleting", title: "Deleting Clients" },
    ],
  },
  {
    id: "vendors",
    title: "Vendors",
    icon: Building2,
    subsections: [
      { id: "vendors-overview", title: "Overview" },
      { id: "vendors-grid", title: "Vendors Data Grid" },
      { id: "vendors-search-filters", title: "Search & Filters" },
      { id: "vendors-creating", title: "Creating Vendors" },
      { id: "vendors-detail", title: "Vendor Detail Page" },
      { id: "vendors-contacts", title: "Linking Contacts" },
      { id: "vendors-services", title: "Services & Locations" },
      { id: "vendors-editing", title: "Editing Vendors" },
      { id: "vendors-deleting", title: "Deleting Vendors" },
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    icon: Contact,
    subsections: [
      { id: "contacts-overview", title: "Overview" },
      { id: "contacts-grid", title: "Contacts Data Grid" },
      { id: "contacts-search-filters", title: "Search & Filters" },
      { id: "contacts-detail", title: "Contact Detail Page" },
      { id: "contacts-clients", title: "Linking Clients" },
      { id: "contacts-editing", title: "Editing Contacts" },
      { id: "contacts-deleting", title: "Deleting Contacts" },
    ],
  },
  {
    id: "venues",
    title: "Venues",
    icon: Store,
    subsections: [
      { id: "venues-overview", title: "Overview" },
      { id: "venues-directory", title: "Venues Directory" },
      { id: "venues-detail", title: "Venue Detail Page" },
      { id: "venues-comments", title: "Comments" },
      { id: "venues-creating", title: "Creating Venues" },
      { id: "venues-floorplans", title: "Floorplans" },
      { id: "venues-attachments", title: "Attachments" },
      { id: "venues-collections", title: "Venue Collections" },
      { id: "venues-amenities-tags", title: "Amenities & Tags" },
    ],
  },
];

function StubContent({ title }: { title: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Documentation for this section is coming soon. Check back later for comprehensive guides and tutorials.
        </p>
      </CardContent>
    </Card>
  );
}

function DealsGuideContent() {
  return (
    <div className="space-y-12">
      <section id="deals-overview" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deals Overview</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Deals module is your central hub for managing your sales pipeline. Track opportunities from initial lead through to closed deals, with comprehensive tools for managing budgets, proposals, contacts, and more.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li><strong>Pipeline Management</strong> - Track deals through customizable status stages</li>
              <li><strong>Budget Tracking</strong> - Monitor deal values and compare to proposals</li>
              <li><strong>Client & Contact Linking</strong> - Associate deals with clients and their contacts</li>
              <li><strong>Service Selection</strong> - Specify which services each deal includes</li>
              <li><strong>Location Management</strong> - Track venue locations for each deal</li>
              <li><strong>Notes & Documentation</strong> - Add markdown-formatted notes to each deal</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-grid" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deals Data Grid</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Deals page displays all your deals in a powerful data grid powered by AG Grid. This provides a spreadsheet-like experience for viewing and managing your deals.
            </p>
            <h3>Grid Features</h3>
            <ul>
              <li><strong>Resizable Columns</strong> - Drag column borders to adjust width</li>
              <li><strong>Row Selection</strong> - Click any row to view deal details</li>
              <li><strong>Status Badges</strong> - Color-coded status indicators for quick scanning</li>
              <li><strong>Responsive Layout</strong> - Grid adapts to your screen size</li>
            </ul>
            <h3>Available Columns</h3>
            <p>The grid can display the following information:</p>
            <ul>
              <li>Deal name and client</li>
              <li>Status, owner, and creation date</li>
              <li>Budget and proposal amounts</li>
              <li>Services and locations</li>
              <li>Event dates and notes</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-columns" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Column Visibility & Repositioning</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Showing/Hiding Columns</h3>
            <p>
              Click the "Columns" button in the toolbar to open the column visibility panel. From here you can:
            </p>
            <ul>
              <li>Toggle individual columns on or off using the checkboxes</li>
              <li>See columns organized by category (Basic Info, Financial, etc.)</li>
              <li>Quickly identify which columns are currently visible</li>
            </ul>
            <p>Your column preferences are saved automatically and persist across sessions.</p>
            
            <h3>Repositioning Columns</h3>
            <p>
              Rearrange columns by dragging their headers to a new position:
            </p>
            <ol>
              <li>Click and hold a column header</li>
              <li>Drag it left or right to the desired position</li>
              <li>Release to drop the column in place</li>
            </ol>
            <p>Column order is saved automatically.</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-sorting" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Sorting</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Sorting by Column</h3>
            <p>
              Click any column header to sort the grid by that column:
            </p>
            <ul>
              <li>First click: Sort ascending (A-Z, lowest to highest)</li>
              <li>Second click: Sort descending (Z-A, highest to lowest)</li>
              <li>Third click: Clear sort</li>
            </ul>
            <p>The sort indicator arrow shows the current sort direction.</p>
            
            <h3>Manual Sorting with Drag & Drop</h3>
            <p>
              For custom ordering, use the drag handle on the left side of each row:
            </p>
            <ol>
              <li>Hover over a row to see the drag handle (grip icon)</li>
              <li>Click and hold the drag handle</li>
              <li>Drag the row up or down to reposition it</li>
              <li>Release to drop the row in its new position</li>
            </ol>
            <p>
              Manual sort order is saved automatically. Note that when using manual sorting, column-based sorting is temporarily disabled to preserve your custom order.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-search-filters" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Search & Filters</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Quick Search</h3>
            <p>
              Use the search box in the toolbar to find deals by name, client, or other text fields. Results update in real-time as you type.
            </p>
            
            <h3>Filter Options</h3>
            <p>Click the filter buttons in the toolbar to filter deals by:</p>
            <ul>
              <li><strong>Owner</strong> - Filter by deal owner/assignee</li>
              <li><strong>Status</strong> - Show only deals in specific pipeline stages</li>
              <li><strong>Location</strong> - Filter by venue location</li>
              <li><strong>Services</strong> - Show deals with specific services</li>
            </ul>
            
            <h3>Using Filters</h3>
            <ol>
              <li>Click a filter button to open the selection dropdown</li>
              <li>Check one or more options to filter by</li>
              <li>Active filters show as badges on the button</li>
              <li>Click the X on a filter badge to clear it</li>
            </ol>
            <p>Multiple filters combine to show only deals matching all criteria.</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-inline-editing" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Inline Editing</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Edit deal information directly in the grid without opening the detail page. This enables rapid updates when working through multiple deals.
            </p>
            
            <h3>How to Edit Inline</h3>
            <ol>
              <li>Double-click on any editable cell in the grid</li>
              <li>The cell enters edit mode with a text input or dropdown</li>
              <li>Make your changes</li>
              <li>Press Enter to save, or Escape to cancel</li>
              <li>Click outside the cell to save changes</li>
            </ol>
            
            <h3>Editable Fields</h3>
            <p>The following fields can be edited inline:</p>
            <ul>
              <li>Deal name</li>
              <li>Status (dropdown selection)</li>
              <li>Budget and proposal amounts</li>
              <li>Event dates</li>
            </ul>
            
            <h3>Tips</h3>
            <ul>
              <li>Tab between cells to move quickly through edits</li>
              <li>Changes save automatically when you leave the cell</li>
              <li>A brief confirmation indicates successful save</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-creating" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Creating Deals</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Create new deals to track opportunities through your pipeline.
            </p>
            
            <h3>Creating a New Deal</h3>
            <ol>
              <li>Click the "New Deal" button in the top right</li>
              <li>Fill in the deal information in the form</li>
              <li>Click "Create Deal" to save</li>
            </ol>
            
            <h3>Required Fields</h3>
            <ul>
              <li><strong>Name</strong> - A descriptive name for the deal</li>
              <li><strong>Status</strong> - Initial pipeline stage</li>
            </ul>
            
            <h3>Optional Fields</h3>
            <ul>
              <li><strong>Client</strong> - Link to an existing client</li>
              <li><strong>Owner</strong> - Assign a team member</li>
              <li><strong>Budget</strong> - Expected deal value</li>
              <li><strong>Services</strong> - Services included in the deal</li>
              <li><strong>Locations</strong> - Venue locations for the deal</li>
              <li><strong>Event Dates</strong> - When the event will occur</li>
              <li><strong>Notes</strong> - Additional details (supports markdown)</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-detail" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deal Detail Page</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Click any row in the deals grid to open the full detail page for that deal.
            </p>
            
            <h3>Page Layout</h3>
            <p>The detail page shows comprehensive deal information:</p>
            <ul>
              <li><strong>Header</strong> - Deal name, status badge, and action buttons</li>
              <li><strong>Details Section</strong> - All deal properties with inline editing</li>
              <li><strong>Client Information</strong> - Linked client with quick access</li>
              <li><strong>Contacts</strong> - Associated contacts for this deal</li>
              <li><strong>Services</strong> - Selected services displayed as badges</li>
              <li><strong>Locations</strong> - Venue information</li>
              <li><strong>Notes</strong> - Markdown-rendered notes section</li>
            </ul>
            
            <h3>Quick Actions</h3>
            <p>From the detail page you can:</p>
            <ul>
              <li>Edit the deal using the Edit button</li>
              <li>Delete the deal (with confirmation)</li>
              <li>Navigate to linked client or contacts</li>
              <li>Update individual fields with inline editing</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-editing" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Editing Deals</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>There are multiple ways to edit deal information:</p>
            
            <h3>Inline Editing on Detail Page</h3>
            <p>
              On the deal detail page, hover over any field to see an edit icon. Click the icon or double-click the field value to enter edit mode:
            </p>
            <ul>
              <li>Text fields open an inline input</li>
              <li>Dropdowns show a selection menu</li>
              <li>Press Enter to save or Escape to cancel</li>
            </ul>
            
            <h3>Full Edit Form</h3>
            <p>
              For comprehensive editing, click the "Edit" button to open the full edit form. This provides access to all fields including:
            </p>
            <ul>
              <li>All basic deal properties</li>
              <li>Client and contact associations</li>
              <li>Multi-select for services</li>
              <li>Location management</li>
              <li>Rich text notes editor</li>
            </ul>
            
            <h3>Grid Inline Editing</h3>
            <p>
              As described in the Inline Editing section, you can also edit directly in the data grid by double-clicking cells.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="deals-deleting" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deleting Deals</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Deals can be deleted when they're no longer needed. This action is permanent.
            </p>
            
            <h3>How to Delete</h3>
            <ol>
              <li>Open the deal detail page</li>
              <li>Click the "Delete" button (or trash icon)</li>
              <li>Confirm the deletion in the dialog that appears</li>
            </ol>
            
            <h3>What Happens When You Delete</h3>
            <ul>
              <li>The deal is permanently removed from the system</li>
              <li>Associations with clients and contacts are removed</li>
              <li>This action cannot be undone</li>
            </ul>
            
            <h3>Alternative: Changing Status</h3>
            <p>
              Instead of deleting, consider changing the deal status to "Cancelled" or "No Go" to preserve the record for historical reference and reporting.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ClientsGuideContent() {
  return (
    <div className="space-y-12">
      <section id="clients-overview" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Clients Overview</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Clients module helps you manage your business relationships. Clients represent companies or organizations you work with, and can be linked to multiple contacts and deals.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li><strong>Client Directory</strong> - Browse and search all clients in a data grid</li>
              <li><strong>Industry Tracking</strong> - Categorize clients by industry for easy filtering</li>
              <li><strong>Contact Associations</strong> - Link multiple contacts to each client</li>
              <li><strong>Deal Relationships</strong> - View all deals associated with a client</li>
              <li><strong>Inline Editing</strong> - Update client information directly on the detail page</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-grid" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Clients Data Grid</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Clients page displays all your clients in a powerful data grid format, making it easy to browse, search, and manage your client base.
            </p>
            
            <h3>Default Columns</h3>
            <ul>
              <li><strong>Name</strong> - Client/company name</li>
              <li><strong>Industry</strong> - Business sector displayed as a badge</li>
              <li><strong>Website</strong> - Company website URL</li>
            </ul>
            
            <h3>Additional Columns</h3>
            <p>Use the Columns button to show or hide:</p>
            <ul>
              <li><strong>Updated</strong> - Last modification date</li>
            </ul>
            
            <h3>Grid Features</h3>
            <ul>
              <li>Click any row to view the full client details</li>
              <li>Resize columns by dragging column borders</li>
              <li>Sort by clicking column headers</li>
              <li>Customize visible columns via the Columns button</li>
              <li>Reorder columns by dragging column headers</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-search-filters" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Search & Filters</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Quick Search</h3>
            <p>
              Use the search box to find clients by name or website. Results update instantly as you type.
            </p>
            
            <h3>Industry Filter</h3>
            <p>
              Click the "Industry" filter button to show only clients in specific industries:
            </p>
            <ol>
              <li>Click the Industry filter button</li>
              <li>Select one or more industries from the list</li>
              <li>The grid updates to show matching clients</li>
              <li>Clear the filter by clicking X on the badge</li>
            </ol>
            <p>
              The industry filter dynamically shows all industries present in your client data, sorted alphabetically.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-creating" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Creating Clients</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Create new clients to build your client directory and track business relationships.
            </p>
            
            <h3>Creating a New Client</h3>
            <ol>
              <li>Click the "New Client" button in the top right</li>
              <li>Fill in the client information</li>
              <li>Click "Create Client" to save</li>
            </ol>
            
            <h3>Required Fields</h3>
            <ul>
              <li><strong>Name</strong> - The company or organization name</li>
            </ul>
            
            <h3>Optional Fields</h3>
            <ul>
              <li><strong>Industry</strong> - Select from available industry categories</li>
              <li><strong>Website</strong> - Company website URL</li>
            </ul>
            
            <h3>Tips</h3>
            <ul>
              <li>Use a consistent naming convention for client names</li>
              <li>Add the website to help identify the client later</li>
              <li>You can add contacts and deals after creating the client</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-detail" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Client Detail Page</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Click any client row in the grid to open the detail page with comprehensive information.
            </p>
            
            <h3>Page Sections</h3>
            <ul>
              <li><strong>Header</strong> - Client name (editable) and action buttons (Edit, Delete)</li>
              <li><strong>Basic Information</strong> - Industry and website with inline editing</li>
              <li><strong>Contacts</strong> - All contacts linked to this client with ability to add/remove</li>
              <li><strong>Deals</strong> - All deals associated with this client with status badges</li>
            </ul>
            
            <h3>Inline Editing</h3>
            <p>
              Edit client fields directly on the detail page by hovering over a field and clicking the edit icon, or by double-clicking the field value. Changes save automatically.
            </p>
            
            <h3>Quick Actions</h3>
            <ul>
              <li>Click on a contact name to view their details</li>
              <li>Click on a deal to view deal details</li>
              <li>Use the "Add" button to link new contacts</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-contacts" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Linking Contacts</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Clients can have multiple contacts associated with them. This helps you track all the people you work with at each company.
            </p>
            
            <h3>Adding a Contact to a Client</h3>
            <ol>
              <li>Open the client detail page</li>
              <li>Find the Contacts section</li>
              <li>Click the "Add" button</li>
              <li>Search for an existing contact by name</li>
              <li>Select the contact to link them</li>
            </ol>
            
            <h3>Removing a Contact Link</h3>
            <ol>
              <li>In the Contacts section, find the contact to unlink</li>
              <li>Click the trash icon next to the contact</li>
            </ol>
            <p>
              Note: Unlinking a contact does not delete the contact itself, it only removes the association with this client.
            </p>
            
            <h3>Contact Display</h3>
            <p>
              Each linked contact shows their name and job title (if available). Click on a contact's name to navigate to their full detail page.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-deals" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Associated Deals</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Deals section on the client detail page shows all deals linked to this client.
            </p>
            
            <h3>Deal Information</h3>
            <p>Each deal in the list displays:</p>
            <ul>
              <li>Deal name</li>
              <li>Status badge with color coding</li>
            </ul>
            
            <h3>Quick Navigation</h3>
            <p>
              Click on any deal to navigate directly to the deal detail page where you can view and manage all deal information.
            </p>
            
            <h3>Creating Deals for a Client</h3>
            <p>
              To create a new deal for this client, navigate to the Deals section and create a new deal, then select this client in the deal form.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-editing" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Editing Clients</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Inline Editing</h3>
            <p>
              On the client detail page, hover over any field to see an edit icon:
            </p>
            <ul>
              <li>Click the icon or double-click the value to edit</li>
              <li>Make your changes in the input field or dropdown</li>
              <li>Press Enter to save, Escape to cancel</li>
              <li>Changes save automatically</li>
            </ul>
            
            <h3>Editable Fields</h3>
            <ul>
              <li><strong>Name</strong> - Client/company name (click the title to edit)</li>
              <li><strong>Industry</strong> - Select from dropdown</li>
              <li><strong>Website</strong> - Enter or update the URL</li>
            </ul>
            
            <h3>Full Edit Form</h3>
            <p>
              Click the "Edit Client" button to open the complete edit form where you can update all fields at once.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="clients-deleting" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deleting Clients</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>How to Delete a Client</h3>
            <ol>
              <li>Open the client detail page</li>
              <li>Click the "Delete Client" button</li>
              <li>Confirm the deletion in the dialog that appears</li>
            </ol>
            
            <h3>Important Considerations</h3>
            <ul>
              <li>Deleting a client is permanent and cannot be undone</li>
              <li>Associated contacts will be unlinked but not deleted</li>
              <li>Deals linked to this client will need to be updated or reassigned</li>
            </ul>
            
            <h3>Before Deleting</h3>
            <p>
              Consider whether you need to preserve any associated data. You may want to reassign deals to a different client before deletion, or export any important information.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function VendorsGuideContent() {
  return (
    <div className="space-y-12">
      <section id="vendors-overview" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Vendors Overview</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Vendors module helps you manage your vendor and supplier relationships. Vendors represent businesses that provide services to your organization, such as caterers, florists, photographers, and other event service providers.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li><strong>Vendor Directory</strong> - Browse and search all vendors in a data grid</li>
              <li><strong>Service Tracking</strong> - Categorize vendors by the services they provide</li>
              <li><strong>Location Management</strong> - Track which locations/regions vendors serve</li>
              <li><strong>Contact Associations</strong> - Link contacts to vendor organizations</li>
              <li><strong>Preferred Vendors</strong> - Mark and filter preferred vendor partners</li>
              <li><strong>Financial Details</strong> - Track sales tax and diversity information</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-grid" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Vendors Data Grid</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Vendors page displays all your vendors in a powerful data grid format for easy browsing and management.
            </p>
            
            <h3>Default Columns</h3>
            <ul>
              <li><strong>Business Name</strong> - Vendor name with preferred star indicator</li>
              <li><strong>Services</strong> - Services the vendor provides (displayed as badges)</li>
              <li><strong>Locations</strong> - Service locations/regions</li>
            </ul>
            
            <h3>Additional Columns</h3>
            <p>Use the Columns button to show or hide:</p>
            <ul>
              <li><strong>Email</strong> - Primary contact email</li>
              <li><strong>Phone</strong> - Contact phone number</li>
              <li><strong>Website</strong> - Vendor website URL</li>
              <li><strong>Address</strong> - Physical address</li>
              <li><strong>Employees</strong> - Employee count</li>
              <li><strong>Diversity</strong> - Diversity certifications or information</li>
              <li><strong>Preferred</strong> - Preferred vendor status</li>
              <li><strong>Sales Tax</strong> - Whether vendor charges sales tax</li>
              <li><strong>Tax Notes</strong> - Additional tax information</li>
              <li><strong>Notes</strong> - General notes</li>
              <li><strong>Capabilities Deck</strong> - Link to capabilities document</li>
            </ul>
            
            <h3>Grid Features</h3>
            <ul>
              <li>Click any row to view full vendor details</li>
              <li>Resize columns by dragging column borders</li>
              <li>Sort by clicking column headers</li>
              <li>Customize visible columns via the Columns button</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-search-filters" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Search & Filters</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Quick Search</h3>
            <p>
              Use the search box to find vendors by business name, email, phone, website, address, or diversity info. Results update instantly as you type.
            </p>
            
            <h3>Filter Options</h3>
            <p>Click the "Filters" button to access filtering options:</p>
            <ul>
              <li><strong>Locations</strong> - Filter by service locations/regions</li>
              <li><strong>Services</strong> - Filter by services provided</li>
            </ul>
            
            <h3>Using Filters</h3>
            <ol>
              <li>Click the Filters button to expand filter options</li>
              <li>Select filter criteria from the dropdowns</li>
              <li>Multiple selections within a filter show vendors matching any selected option</li>
              <li>Multiple filters combine to show only vendors matching all criteria</li>
              <li>Active filter count shows as an indicator on the Filters button</li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-creating" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Creating Vendors</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Create new vendors to build your vendor directory and track supplier relationships.
            </p>
            
            <h3>Creating a New Vendor</h3>
            <ol>
              <li>Click the "New Vendor" button in the top right</li>
              <li>Fill in the vendor information</li>
              <li>Click "Save" to create the vendor</li>
            </ol>
            
            <h3>Required Fields</h3>
            <ul>
              <li><strong>Business Name</strong> - The vendor's company name</li>
            </ul>
            
            <h3>Optional Fields</h3>
            <ul>
              <li><strong>Contact Info</strong> - Email, phone, website, address</li>
              <li><strong>Services</strong> - Select services this vendor provides</li>
              <li><strong>Locations</strong> - Add locations/regions the vendor serves using Google Places</li>
              <li><strong>Employee Count</strong> - Number of employees</li>
              <li><strong>Diversity Info</strong> - Diversity certifications or details</li>
              <li><strong>Sales Tax</strong> - Whether vendor charges sales tax and related notes</li>
              <li><strong>Preferred</strong> - Mark as a preferred vendor</li>
              <li><strong>Notes</strong> - General notes about the vendor</li>
              <li><strong>Capabilities Deck</strong> - Link to vendor's capabilities document</li>
            </ul>
            
            <h3>Adding Service Locations</h3>
            <p>
              Use the location search powered by Google Places to add cities or regions where the vendor provides services. You can add multiple locations.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-detail" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Vendor Detail Page</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Click any vendor row in the grid to open the detail page with comprehensive information.
            </p>
            
            <h3>Page Sections</h3>
            <ul>
              <li><strong>Header</strong> - Business name (editable), preferred badge, and action buttons</li>
              <li><strong>Services</strong> - Services this vendor provides (editable)</li>
              <li><strong>Service Locations</strong> - Regions/cities the vendor serves</li>
              <li><strong>Contact Info</strong> - Email, phone, website, address (all editable)</li>
              <li><strong>Business Details</strong> - Employee count, diversity info, sales tax details</li>
              <li><strong>Contacts</strong> - People associated with this vendor</li>
              <li><strong>Notes</strong> - General notes about the vendor</li>
            </ul>
            
            <h3>Inline Editing</h3>
            <p>
              Managers and admins can edit vendor fields directly on the detail page by hovering over a field and clicking the edit icon, or by double-clicking the field value.
            </p>
            
            <h3>Quick Actions</h3>
            <ul>
              <li><strong>Edit Vendor</strong> - Open the full edit form</li>
              <li><strong>Generate Update Link</strong> - Create a link for the vendor to update their own information</li>
              <li><strong>Delete Vendor</strong> - Remove the vendor from the system</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-contacts" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Linking Contacts</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Vendors can have multiple contacts associated with them. This helps you track the people you work with at each vendor organization.
            </p>
            
            <h3>Adding a Contact to a Vendor</h3>
            <ol>
              <li>Open the vendor detail page</li>
              <li>Find the Contacts section</li>
              <li>Click the "Add" button</li>
              <li>Search for an existing contact by name</li>
              <li>Select the contact to link them to this vendor</li>
            </ol>
            
            <h3>Removing a Contact Link</h3>
            <ol>
              <li>In the Contacts section, find the contact to unlink</li>
              <li>Click the trash icon next to the contact</li>
              <li>Confirm the action</li>
            </ol>
            <p>
              Note: Unlinking a contact does not delete the contact itself, it only removes the association with this vendor.
            </p>
            
            <h3>Contact Display</h3>
            <p>
              Each linked contact shows their name and job title (if available). Click on a contact's name to navigate to their full detail page.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-services" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Services & Locations</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Managing Services</h3>
            <p>
              Services categorize what each vendor provides. On the vendor detail page:
            </p>
            <ol>
              <li>Click the edit icon next to Services</li>
              <li>Click on service badges to toggle them on or off</li>
              <li>Selected services appear with a filled background</li>
              <li>Click the checkmark to save your changes</li>
            </ol>
            
            <h3>Service Categories</h3>
            <p>
              Services are managed by administrators in the Admin section. Common service categories include catering, photography, florals, entertainment, and more.
            </p>
            
            <h3>Service Locations</h3>
            <p>
              Locations indicate which cities or regions a vendor serves. Locations are added when creating or editing a vendor using Google Places search.
            </p>
            
            <h3>Filtering by Services and Locations</h3>
            <p>
              On the Vendors directory page, use the Filters to find vendors by specific services or locations. This is useful when searching for vendors that can serve a particular area or provide specific services.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-editing" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Editing Vendors</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Inline Editing</h3>
            <p>
              On the vendor detail page, managers and admins can hover over any field to see an edit icon:
            </p>
            <ul>
              <li>Click the icon or double-click the value to edit</li>
              <li>Make your changes in the input field</li>
              <li>Press Enter to save, Escape to cancel</li>
              <li>Changes save automatically</li>
            </ul>
            
            <h3>Editable Fields</h3>
            <ul>
              <li><strong>Business Name</strong> - Click the title to edit</li>
              <li><strong>Services</strong> - Toggle services on/off</li>
              <li><strong>Contact Info</strong> - Email, phone, website, address</li>
              <li><strong>Business Details</strong> - Employee count, diversity info, tax settings</li>
              <li><strong>Preferred Status</strong> - Mark as preferred vendor</li>
              <li><strong>Notes</strong> - Update general notes</li>
            </ul>
            
            <h3>Full Edit Form</h3>
            <p>
              Click "Edit Vendor" to open the complete edit form where you can update all fields including service locations.
            </p>
            
            <h3>Vendor Self-Update</h3>
            <p>
              Admins can generate a special update link that allows vendors to update their own information. This link expires after a set period and provides limited access to edit vendor details.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="vendors-deleting" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deleting Vendors</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>How to Delete a Vendor</h3>
            <ol>
              <li>Open the vendor detail page</li>
              <li>Click the "Delete Vendor" button</li>
              <li>Confirm the deletion in the dialog that appears</li>
            </ol>
            
            <h3>Important Considerations</h3>
            <ul>
              <li>Deleting a vendor is permanent and cannot be undone</li>
              <li>Associated contacts will be unlinked but not deleted</li>
              <li>Any active update tokens for this vendor will be invalidated</li>
            </ul>
            
            <h3>Before Deleting</h3>
            <p>
              Consider whether you need to preserve any vendor information or contact associations. Make sure no active deals or projects depend on this vendor before removing them from the system.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ContactsGuideContent() {
  return (
    <div className="space-y-12">
      <section id="contacts-overview" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Contacts Overview</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Contacts module helps you manage individual people you work with. Contacts can be associated with clients and linked to deals for comprehensive relationship management.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li><strong>Contact Directory</strong> - Searchable list of all contacts</li>
              <li><strong>Contact Details</strong> - Store names, titles, emails, phones</li>
              <li><strong>Client Associations</strong> - Link contacts to their companies</li>
              <li><strong>Social Profiles</strong> - Track LinkedIn, Twitter, and other profiles</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-grid" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Contacts Data Grid</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Contacts page displays all contacts in a data grid for easy browsing and management.
            </p>
            
            <h3>Grid Columns</h3>
            <ul>
              <li><strong>Name</strong> - Contact's full name</li>
              <li><strong>Title</strong> - Job title or role</li>
              <li><strong>Email</strong> - Primary email address</li>
              <li><strong>Phone</strong> - Contact phone number</li>
              <li><strong>Client</strong> - Associated company (if linked)</li>
            </ul>
            
            <h3>Grid Features</h3>
            <ul>
              <li>Click rows to view full contact details</li>
              <li>Sort by any column header</li>
              <li>Resize and reorder columns</li>
              <li>Customize visible columns</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-search-filters" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Search & Filters</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Quick Search</h3>
            <p>
              Use the search box to find contacts by name, email, title, or company. Search results update in real-time.
            </p>
            
            <h3>Filtering Contacts</h3>
            <p>
              Use the available filter buttons to narrow your view:
            </p>
            <ul>
              <li>Select filter criteria from the dropdowns</li>
              <li>Multiple filters combine to refine results</li>
              <li>Clear filters by clicking X on filter badges</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-detail" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Contact Detail Page</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Click any contact to open their full detail page.
            </p>
            
            <h3>Page Sections</h3>
            <ul>
              <li><strong>Header</strong> - Contact name and action buttons</li>
              <li><strong>Personal Info</strong> - Name, title, and other details</li>
              <li><strong>Contact Methods</strong> - Email, phone, and other ways to reach them</li>
              <li><strong>Social Profiles</strong> - LinkedIn, Twitter, and other social links</li>
              <li><strong>Associated Clients</strong> - Companies this contact is linked to</li>
              <li><strong>Related Deals</strong> - Deals this contact is involved with</li>
            </ul>
            
            <h3>Inline Editing</h3>
            <p>
              Edit contact fields directly on the page by hovering over a field and clicking the edit icon, or double-clicking the field value.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-clients" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Linking Clients</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Contacts can be associated with one or more clients, helping you track which people work at which companies.
            </p>
            
            <h3>Linking to a Client</h3>
            <ol>
              <li>Open the contact detail page</li>
              <li>Find the Clients section</li>
              <li>Click "Link Client" or the add button</li>
              <li>Search for and select an existing client</li>
              <li>The contact is now linked to that client</li>
            </ol>
            
            <h3>Unlinking a Client</h3>
            <ol>
              <li>In the Clients section, find the client to unlink</li>
              <li>Click the unlink or remove button</li>
              <li>Confirm the action</li>
            </ol>
            <p>
              Unlinking removes the association but does not delete the client.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-editing" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Editing Contacts</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>Inline Editing</h3>
            <p>
              On the contact detail page, hover over any field to see an edit icon:
            </p>
            <ul>
              <li>Click the icon or double-click the value to edit</li>
              <li>Make your changes in the input field</li>
              <li>Press Enter to save, Escape to cancel</li>
            </ul>
            
            <h3>Full Edit Form</h3>
            <p>
              Click the "Edit" button to access the complete edit form:
            </p>
            <ul>
              <li>First and last name</li>
              <li>Job title</li>
              <li>Email and phone</li>
              <li>Social profile URLs</li>
              <li>Notes about this contact</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section id="contacts-deleting" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4">Deleting Contacts</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <h3>How to Delete a Contact</h3>
            <ol>
              <li>Open the contact detail page</li>
              <li>Click the "Delete" button</li>
              <li>Confirm the deletion in the dialog</li>
            </ol>
            
            <h3>Important Considerations</h3>
            <ul>
              <li>Deleting a contact is permanent and cannot be undone</li>
              <li>The contact will be unlinked from all associated clients</li>
              <li>Deal associations will be removed</li>
            </ul>
            
            <h3>Before Deleting</h3>
            <p>
              Make sure you no longer need the contact's information. Consider whether they have any active deals or important client associations before proceeding.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function VenuesGuideContent() {
  return (
    <div className="space-y-12">
      {/* Venues Overview */}
      <section id="venues-overview" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Venues Overview
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Venues module is your central hub for managing all venue information. Whether you're tracking potential event spaces, restaurants, or any other locations, this system helps you organize, search, and collaborate on venue data.
            </p>
            <h3>Key Features</h3>
            <ul>
              <li><strong>Comprehensive Directory</strong> - Browse and search all venues with powerful filtering</li>
              <li><strong>Detailed Profiles</strong> - Store contact info, photos, floorplans, and more</li>
              <li><strong>Collections</strong> - Group venues for events, proposals, or client presentations</li>
              <li><strong>Collaboration</strong> - Add comments and notes that your team can see</li>
              <li><strong>Tags & Amenities</strong> - Categorize venues for easy discovery</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Venues Directory */}
      <section id="venues-directory" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Venues Directory
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Venues Directory is your main interface for browsing all venues in the system. It provides multiple ways to find exactly what you're looking for.
            </p>
            
            <h3>Searching Venues</h3>
            <p>
              Use the search bar at the top of the page to find venues by name, location, or description. The search updates results in real-time as you type.
            </p>
            
            <h3>Filtering by Tags</h3>
            <p>
              Click on any tag badge to filter venues by that tag. You can select multiple tags to narrow down your results. Active filters appear at the top of the page and can be cleared individually or all at once.
            </p>
            
            <h3>Selecting Multiple Venues</h3>
            <p>
              Use the checkboxes on venue cards to select multiple venues at once. This is useful for:
            </p>
            <ul>
              <li>Adding multiple venues to a collection at once</li>
              <li>Bulk operations (coming soon)</li>
            </ul>
            
            <h3>Venue Cards</h3>
            <p>
              Each venue card displays:
            </p>
            <ul>
              <li>Primary photo (if available)</li>
              <li>Venue name and short description</li>
              <li>Location (city, state)</li>
              <li>Tags for quick categorization</li>
            </ul>
            <p>
              Click anywhere on a card to view the full venue details.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Venue Detail Page */}
      <section id="venues-detail" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Venue Detail Page
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The venue detail page provides a comprehensive view of all information about a specific venue.
            </p>
            
            <h3>Page Layout</h3>
            <p>The detail page is organized into two main tabs:</p>
            <ul>
              <li><strong>Overview</strong> - All venue information, photos, and files</li>
              <li><strong>Comments</strong> - Team discussion and notes about the venue</li>
            </ul>
            
            <h3>Overview Tab</h3>
            <p>The Overview tab contains several sections:</p>
            <ul>
              <li><strong>Hero Image</strong> - The primary photo displayed prominently at the top</li>
              <li><strong>About</strong> - Full description of the venue with a copy button</li>
              <li><strong>Location</strong> - Address, phone number, and Google Maps link</li>
              <li><strong>Online</strong> - Website, Instagram, and other social links</li>
              <li><strong>Photos</strong> - Gallery of all venue photos with lightbox view</li>
              <li><strong>Floorplans</strong> - Uploaded floor plan documents</li>
              <li><strong>Attachments</strong> - Additional files and documents</li>
              <li><strong>Amenities</strong> - Available amenities at the venue</li>
              <li><strong>Map</strong> - Interactive map showing the venue location</li>
            </ul>
            
            <h3>Actions</h3>
            <p>From the venue detail page, you can:</p>
            <ul>
              <li><strong>Add to Collection</strong> - Add this venue to an existing or new collection</li>
              <li><strong>Edit</strong> (Admin only) - Modify venue information</li>
              <li><strong>Delete</strong> (Admin only) - Remove the venue from the system</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Comments */}
      <section id="venues-comments" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Comments
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Comments feature allows your team to collaborate and share notes about venues directly within the app.
            </p>
            
            <h3>Adding Comments</h3>
            <p>
              Navigate to the "Comments" tab on any venue detail page. Type your comment in the text field and click "Post" to add it. Comments are visible to all team members.
            </p>
            
            <h3>Comment Features</h3>
            <ul>
              <li>Comments show the author's name and profile picture</li>
              <li>Timestamps indicate when each comment was posted</li>
              <li>You can edit or delete your own comments</li>
              <li>Admins can moderate all comments</li>
            </ul>
            
            <h3>Best Practices</h3>
            <ul>
              <li>Use comments to share visit notes, client feedback, or important updates</li>
              <li>Tag specific details like pricing, availability, or contact experiences</li>
              <li>Keep comments professional as they're visible to the entire team</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Creating Venues */}
      <section id="venues-creating" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Creating Venues
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Admins can create new venues to add to the directory. The venue creation form guides you through entering all relevant information.
            </p>
            
            <h3>Google Places Integration</h3>
            <p>
              The easiest way to create a venue is to use the Google Places search. Start typing a venue name and select from the suggestions. This automatically populates:
            </p>
            <ul>
              <li>Venue name</li>
              <li>Full address (street, city, state, zip)</li>
              <li>Phone number</li>
              <li>Website</li>
              <li>Google Place ID (for map integration)</li>
            </ul>
            
            <h3>Importing Photos from Google</h3>
            <p>
              After selecting a venue from Google Places, click "Import Photos" to browse available photos from Google. Select the photos you want to add, and they'll be automatically imported and stored in your system.
            </p>
            
            <h3>Manual Entry</h3>
            <p>
              You can also enter venue information manually. Required fields are:
            </p>
            <ul>
              <li><strong>Name</strong> - The venue's name</li>
            </ul>
            <p>All other fields are optional but recommended for a complete profile.</p>
            
            <h3>Form Sections</h3>
            <ul>
              <li><strong>Basic Info</strong> - Name, tagline, and description</li>
              <li><strong>Location</strong> - Full address details</li>
              <li><strong>Contact</strong> - Phone, email, website, social media</li>
              <li><strong>Photos</strong> - Upload or import venue images</li>
              <li><strong>Floorplans</strong> - Upload floor plan documents</li>
              <li><strong>Attachments</strong> - Add any additional files</li>
              <li><strong>Amenities</strong> - Select available amenities</li>
              <li><strong>Tags</strong> - Categorize the venue</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Floorplans */}
      <section id="venues-floorplans" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Floorplans
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Floorplans help your team understand venue layouts for event planning. Upload architectural drawings, CAD files, or simple sketches.
            </p>
            
            <h3>Supported File Types</h3>
            <ul>
              <li>Images (JPG, PNG, WebP)</li>
              <li>PDF documents</li>
              <li>Design files (AI, PSD - view in external app)</li>
            </ul>
            
            <h3>Uploading Floorplans</h3>
            <p>
              In the venue form, scroll to the Floorplans section. Click to upload or drag and drop files. Each floorplan can have:
            </p>
            <ul>
              <li><strong>Title</strong> - A descriptive name (e.g., "Main Floor Layout")</li>
              <li><strong>Caption</strong> - Additional notes or dimensions</li>
            </ul>
            
            <h3>Viewing Floorplans</h3>
            <p>
              On the venue detail page, floorplans appear in a dedicated section. Click any floorplan to view it full-size. For PDFs, they'll open in a new tab or your default PDF viewer.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Attachments */}
      <section id="venues-attachments" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Attachments
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Attachments allow you to store any additional documents related to a venue that don't fit in other categories.
            </p>
            
            <h3>Common Attachment Types</h3>
            <ul>
              <li>Contracts and agreements</li>
              <li>Pricing sheets and menus</li>
              <li>Technical specifications</li>
              <li>Vendor lists</li>
              <li>Event proposals</li>
              <li>Brochures and marketing materials</li>
            </ul>
            
            <h3>Supported Formats</h3>
            <p>
              The system accepts most common file formats including:
            </p>
            <ul>
              <li>Documents (PDF, DOC, DOCX)</li>
              <li>Spreadsheets (XLS, XLSX)</li>
              <li>Presentations (PPT, PPTX)</li>
              <li>Images (JPG, PNG, GIF, WebP)</li>
              <li>Archives (ZIP)</li>
            </ul>
            
            <h3>Managing Attachments</h3>
            <p>
              Each attachment displays the file type icon, title, and who uploaded it. You can:
            </p>
            <ul>
              <li>Download the file</li>
              <li>Copy a direct link to share</li>
              <li>Edit the title and caption</li>
              <li>Delete attachments you've uploaded (admins can delete any)</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Venue Collections */}
      <section id="venues-collections" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Venue Collections
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Collections let you organize venues into custom groups. Create collections for specific events, client proposals, or any grouping that makes sense for your workflow.
            </p>
            
            <h3>Creating a Collection</h3>
            <ol>
              <li>Navigate to Venues → Collections in the sidebar</li>
              <li>Click "New Collection"</li>
              <li>Enter a name and optional description</li>
              <li>Click "Create Collection"</li>
            </ol>
            
            <h3>Adding Venues to Collections</h3>
            <p>There are two ways to add venues:</p>
            
            <p><strong>From the Venues Directory:</strong></p>
            <ol>
              <li>Select multiple venues using the checkboxes</li>
              <li>Click "Add to Collection" in the selection toolbar</li>
              <li>Choose an existing collection or create a new one</li>
            </ol>
            
            <p><strong>From a Venue Detail Page:</strong></p>
            <ol>
              <li>Click "Add to Collection" button</li>
              <li>Select one or more collections</li>
              <li>The venue is immediately added</li>
            </ol>
            
            <h3>Managing Collections</h3>
            <p>
              Within a collection, you can:
            </p>
            <ul>
              <li><strong>Reorder venues</strong> - Drag and drop to arrange in your preferred order</li>
              <li><strong>Remove venues</strong> - Remove a venue from the collection (doesn't delete the venue)</li>
              <li><strong>Edit details</strong> - Update the collection name and description</li>
              <li><strong>Delete collection</strong> - Remove the entire collection (venues are preserved)</li>
            </ul>
            
            <h3>Use Cases</h3>
            <ul>
              <li>Create a "Client X Event Options" collection for a proposal</li>
              <li>Group "Preferred Venues" for quick access</li>
              <li>Organize by category like "Rooftop Venues" or "Downtown Locations"</li>
              <li>Track venues visited during a scouting trip</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Amenities & Tags */}
      <section id="venues-amenities-tags" className="scroll-mt-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Amenities & Tags
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Amenities and Tags help categorize venues for easy filtering and discovery.
            </p>
            
            <h3>Amenities</h3>
            <p>
              Amenities represent features or facilities available at a venue. Examples include:
            </p>
            <ul>
              <li>WiFi, A/V Equipment, Projector</li>
              <li>Private Dining, Outdoor Space, Rooftop</li>
              <li>Wheelchair Accessible, Parking, Valet</li>
              <li>Kitchen, Bar, Catering Allowed</li>
            </ul>
            <p>
              When editing a venue, toggle amenities on or off in the Amenities section. On the detail page, amenities display with checkmarks for quick scanning.
            </p>
            
            <h3>Tags</h3>
            <p>
              Tags are flexible labels for categorization. Unlike amenities, tags can be anything you define:
            </p>
            <ul>
              <li>Venue types: Restaurant, Hotel, Gallery, Loft</li>
              <li>Styles: Modern, Classic, Industrial, Rustic</li>
              <li>Capacity: Small (under 50), Medium (50-150), Large (150+)</li>
              <li>Price tier: $, $$, $$$, $$$$</li>
            </ul>
            
            <h3>Managing Tags & Amenities</h3>
            <p>
              Admins can manage the master list of tags and amenities from the sidebar:
            </p>
            <ul>
              <li><strong>Amenities</strong> - Add, edit, or remove available amenities</li>
              <li><strong>Tags</strong> - Create and manage venue tags with colors</li>
            </ul>
            
            <h3>Filtering by Tags</h3>
            <p>
              On the Venues Directory page, click any tag to filter venues. Multiple tags can be selected for an "AND" filter (venues must have all selected tags).
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function GuidePage() {
  usePageTitle("Guide");
  const [activeSection, setActiveSection] = useState("deals");

  const currentSection = guideSections.find((s) => s.id === activeSection);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <PageLayout breadcrumbs={[{ label: "Guide" }]}>
      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r  hidden lg:block">
          <ScrollArea className="h-full py-4">

            <nav className="space-y-1 px-2">
              {guideSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`button-guide-section-${section.id}`}
                    >
                      <span className="flex-1 text-left">{section.title}</span>
                      {section.isStub && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Soon</span>
                      )}
                    </button>
                    {isActive && section.subsections && !section.isStub && (
                      <div className="ml-6 mt-1 space-y-1">
                        {section.subsections.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => scrollToSection(sub.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`button-guide-subsection-${sub.id}`}
                          >
                            <ChevronRight className="h-3 w-3" />
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-6 pb-24">
              {/* Mobile section selector */}
              <div className="lg:hidden mb-6">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  data-testid="select-guide-section-mobile"
                >
                  {guideSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title} {section.isStub ? "(Coming Soon)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {currentSection?.title}
                </h1>
                {currentSection?.isStub && (
                  <p className="text-muted-foreground mt-2">
                    Documentation coming soon
                  </p>
                )}
              </div>

              {/* Section Content */}
              {activeSection === "deals" && <DealsGuideContent />}
              {activeSection === "clients" && <ClientsGuideContent />}
              {activeSection === "vendors" && <VendorsGuideContent />}
              {activeSection === "contacts" && <ContactsGuideContent />}
              {activeSection === "venues" && <VenuesGuideContent />}
              {activeSection === "team" && <StubContent title="Team Directory Documentation" />}
              {activeSection === "features" && <StubContent title="Feature Requests Documentation" />}
              {activeSection === "admin" && <StubContent title="Admin Settings Documentation" />}
            </div>
          </ScrollArea>
        </main>
      </div>
    </PageLayout>
  );
}
