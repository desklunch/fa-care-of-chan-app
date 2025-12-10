import { useState } from "react";
import { PageLayout } from "@/framework";
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
    id: "sales",
    title: "Sales",
    icon: Contact,
    isStub: true,
    subsections: [
      { id: "contacts-overview", title: "Overview" },
      { id: "contacts-managing", title: "Managing Contacts" },
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
  {
    id: "vendors",
    title: "Vendors",
    icon: Briefcase,
    isStub: true,
    subsections: [
      { id: "vendors-overview", title: "Overview" },
      { id: "vendors-directory", title: "Vendor Directory" },
      { id: "vendors-services", title: "Services" },
    ],
  },
  {
    id: "Contacts",
    title: "Contacts",
    icon: Users,
    isStub: true,
    subsections: [
      { id: "team-overview", title: "Overview" },
      { id: "team-profiles", title: "Team Profiles" },
      { id: "team-invites", title: "Inviting Team Members" },
    ],
  },


  {
    id: "Application",
    title: "Feature Requests",
    icon: Lightbulb,
    isStub: true,
    subsections: [
      { id: "features-overview", title: "Overview" },
      { id: "features-submitting", title: "Submitting Requests" },
      { id: "features-voting", title: "Voting" },
    ],
  },
  {
    id: "admin",
    title: "Admin Settings",
    icon: Settings,
    isStub: true,
    subsections: [
      { id: "admin-overview", title: "Overview" },
      { id: "admin-users", title: "User Management" },
      { id: "admin-logs", title: "Audit Logs" },
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
            <h4>Key Features</h4>
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
          <Search className="h-6 w-6" />
          Venues Directory
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Venues Directory is your main interface for browsing all venues in the system. It provides multiple ways to find exactly what you're looking for.
            </p>
            
            <h4>Searching Venues</h4>
            <p>
              Use the search bar at the top of the page to find venues by name, location, or description. The search updates results in real-time as you type.
            </p>
            
            <h4>Filtering by Tags</h4>
            <p>
              Click on any tag badge to filter venues by that tag. You can select multiple tags to narrow down your results. Active filters appear at the top of the page and can be cleared individually or all at once.
            </p>
            
            <h4>Selecting Multiple Venues</h4>
            <p>
              Use the checkboxes on venue cards to select multiple venues at once. This is useful for:
            </p>
            <ul>
              <li>Adding multiple venues to a collection at once</li>
              <li>Bulk operations (coming soon)</li>
            </ul>
            
            <h4>Venue Cards</h4>
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
          <Eye className="h-6 w-6" />
          Venue Detail Page
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The venue detail page provides a comprehensive view of all information about a specific venue.
            </p>
            
            <h4>Page Layout</h4>
            <p>The detail page is organized into two main tabs:</p>
            <ul>
              <li><strong>Overview</strong> - All venue information, photos, and files</li>
              <li><strong>Comments</strong> - Team discussion and notes about the venue</li>
            </ul>
            
            <h4>Overview Tab</h4>
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
            
            <h4>Actions</h4>
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
          <MessageSquare className="h-6 w-6" />
          Comments
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              The Comments feature allows your team to collaborate and share notes about venues directly within the app.
            </p>
            
            <h4>Adding Comments</h4>
            <p>
              Navigate to the "Comments" tab on any venue detail page. Type your comment in the text field and click "Post" to add it. Comments are visible to all team members.
            </p>
            
            <h4>Comment Features</h4>
            <ul>
              <li>Comments show the author's name and profile picture</li>
              <li>Timestamps indicate when each comment was posted</li>
              <li>You can edit or delete your own comments</li>
              <li>Admins can moderate all comments</li>
            </ul>
            
            <h4>Best Practices</h4>
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
          <Plus className="h-6 w-6" />
          Creating Venues
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Admins can create new venues to add to the directory. The venue creation form guides you through entering all relevant information.
            </p>
            
            <h4>Google Places Integration</h4>
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
            
            <h4>Importing Photos from Google</h4>
            <p>
              After selecting a venue from Google Places, click "Import Photos" to browse available photos from Google. Select the photos you want to add, and they'll be automatically imported and stored in your system.
            </p>
            
            <h4>Manual Entry</h4>
            <p>
              You can also enter venue information manually. Required fields are:
            </p>
            <ul>
              <li><strong>Name</strong> - The venue's name</li>
            </ul>
            <p>All other fields are optional but recommended for a complete profile.</p>
            
            <h4>Form Sections</h4>
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
          <Layout className="h-6 w-6" />
          Floorplans
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Floorplans help your team understand venue layouts for event planning. Upload architectural drawings, CAD files, or simple sketches.
            </p>
            
            <h4>Supported File Types</h4>
            <ul>
              <li>Images (JPG, PNG, WebP)</li>
              <li>PDF documents</li>
              <li>Design files (AI, PSD - view in external app)</li>
            </ul>
            
            <h4>Uploading Floorplans</h4>
            <p>
              In the venue form, scroll to the Floorplans section. Click to upload or drag and drop files. Each floorplan can have:
            </p>
            <ul>
              <li><strong>Title</strong> - A descriptive name (e.g., "Main Floor Layout")</li>
              <li><strong>Caption</strong> - Additional notes or dimensions</li>
            </ul>
            
            <h4>Viewing Floorplans</h4>
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
          <Paperclip className="h-6 w-6" />
          Attachments
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Attachments allow you to store any additional documents related to a venue that don't fit in other categories.
            </p>
            
            <h4>Common Attachment Types</h4>
            <ul>
              <li>Contracts and agreements</li>
              <li>Pricing sheets and menus</li>
              <li>Technical specifications</li>
              <li>Vendor lists</li>
              <li>Event proposals</li>
              <li>Brochures and marketing materials</li>
            </ul>
            
            <h4>Supported Formats</h4>
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
            
            <h4>Managing Attachments</h4>
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
          <FolderOpen className="h-6 w-6" />
          Venue Collections
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Collections let you organize venues into custom groups. Create collections for specific events, client proposals, or any grouping that makes sense for your workflow.
            </p>
            
            <h4>Creating a Collection</h4>
            <ol>
              <li>Navigate to Venues → Collections in the sidebar</li>
              <li>Click "New Collection"</li>
              <li>Enter a name and optional description</li>
              <li>Click "Create Collection"</li>
            </ol>
            
            <h4>Adding Venues to Collections</h4>
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
            
            <h4>Managing Collections</h4>
            <p>
              Within a collection, you can:
            </p>
            <ul>
              <li><strong>Reorder venues</strong> - Drag and drop to arrange in your preferred order</li>
              <li><strong>Remove venues</strong> - Remove a venue from the collection (doesn't delete the venue)</li>
              <li><strong>Edit details</strong> - Update the collection name and description</li>
              <li><strong>Delete collection</strong> - Remove the entire collection (venues are preserved)</li>
            </ul>
            
            <h4>Use Cases</h4>
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
          <Tag className="h-6 w-6" />
          Amenities & Tags
        </h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <p>
              Amenities and Tags help categorize venues for easy filtering and discovery.
            </p>
            
            <h4>Amenities</h4>
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
            
            <h4>Tags</h4>
            <p>
              Tags are flexible labels for categorization. Unlike amenities, tags can be anything you define:
            </p>
            <ul>
              <li>Venue types: Restaurant, Hotel, Gallery, Loft</li>
              <li>Styles: Modern, Classic, Industrial, Rustic</li>
              <li>Capacity: Small (under 50), Medium (50-150), Large (150+)</li>
              <li>Price tier: $, $$, $$$, $$$$</li>
            </ul>
            
            <h4>Managing Tags & Amenities</h4>
            <p>
              Admins can manage the master list of tags and amenities from the sidebar:
            </p>
            <ul>
              <li><strong>Amenities</strong> - Add, edit, or remove available amenities</li>
              <li><strong>Tags</strong> - Create and manage venue tags with colors</li>
            </ul>
            
            <h4>Filtering by Tags</h4>
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
  const [activeSection, setActiveSection] = useState("venues");

  const currentSection = guideSections.find((s) => s.id === activeSection);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <PageLayout breadcrumbs={[{ label: "App " }, { label: "Guide" }]}>
      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-muted/30 hidden lg:block">
          <ScrollArea className="h-full py-4">
            <div className="px-4 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                User Guide
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Learn how to use the app
              </p>
            </div>
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
                      <Icon className="h-4 w-4" />
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
                  {currentSection && <currentSection.icon className="h-8 w-8" />}
                  {currentSection?.title}
                </h1>
                {currentSection?.isStub && (
                  <p className="text-muted-foreground mt-2">
                    Documentation coming soon
                  </p>
                )}
              </div>

              {/* Section Content */}
              {activeSection === "venues" && <VenuesGuideContent />}
              {activeSection === "team" && <StubContent title="Team Directory Documentation" />}
              {activeSection === "contacts" && <StubContent title="Contacts Documentation" />}
              {activeSection === "vendors" && <StubContent title="Vendors Documentation" />}
              {activeSection === "features" && <StubContent title="Feature Requests Documentation" />}
              {activeSection === "admin" && <StubContent title="Admin Settings Documentation" />}
            </div>
          </ScrollArea>
        </main>
      </div>
    </PageLayout>
  );
}
