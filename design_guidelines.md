# Design Guidelines: Enterprise Employee Directory

## Design Approach

**Selected Approach**: Design System - Fluent Design/Carbon Design hybrid

**Justification**: Enterprise productivity application with information-dense data tables (AG Grid), role-based admin functions, and utility-focused workflows. Design should prioritize clarity, efficiency, and professional aesthetics over visual experimentation.

**Key Design Principles**:
- Enterprise-grade professionalism with clean, structured layouts
- Data-first presentation optimized for scanning and quick access
- Consistent component patterns across admin and employee experiences
- Accessibility and keyboard navigation throughout

---

## Core Design Elements

### A. Typography

**Font Family**: 
- Primary: `'Inter', sans-serif` (via Google Fonts)
- Monospace: `'JetBrains Mono', monospace` (for invite codes/technical data)

**Type Scale**:
- Hero/Page Titles: `text-3xl font-semibold` (30px)
- Section Headers: `text-xl font-semibold` (20px)
- Subsection Headers: `text-base font-semibold` (16px)
- Body Text: `text-sm` (14px)
- Small/Meta: `text-xs` (12px)
- Table Headers: `text-xs font-medium uppercase tracking-wide`

**Hierarchy Rules**:
- Page titles always paired with breadcrumbs
- Section headers use consistent spacing (mb-4)
- Data labels use font-medium weight, values use font-normal

### B. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**

**Common Patterns**:
- Component padding: `p-6`
- Section gaps: `gap-6` or `gap-8`
- Card spacing: `p-4` or `p-6`
- Form field spacing: `space-y-4`
- Page container: `max-w-7xl mx-auto px-6 py-8`

**Grid Systems**:
- Admin dashboard: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Form layouts: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Profile sections: Single column `max-w-4xl`

### C. Component Library

**Cards**:
- Background: `bg-white` with `border border-border`
- Rounded: `rounded-lg`
- Shadow: `shadow-sm`
- Structure: Header (title + action), body content, optional footer

**Buttons** (Radix UI):
- Primary: Solid background, full click target
- Secondary: Border with transparent background
- Ghost: Minimal style for table actions
- Sizes: Default `h-10 px-4`, Small `h-8 px-3`

**Forms**:
- Input fields: `h-10` height, `px-3` padding, `border border-input` with `rounded-md`
- Labels: `text-sm font-medium mb-2` positioned above inputs
- Required indicators: Red asterisk after label
- Error messages: `text-xs text-destructive mt-1`
- Form sections in cards with clear visual separation

**Navigation** (via fa-shell):
- Sidebar: Collapsed 72px, expanded 320px
- Top-level items standalone, grouped items under headings
- Active state with accent background
- Icons from Lucide React (Home, Users, Settings, UserPlus, FileText, LogOut)

**Data Table** (AG Grid):
- Theme: `ag-theme-alpine` (clean, professional)
- Row height: 48px for comfortable scanning
- Column headers: Uppercase, medium weight
- Hover: Subtle row highlight
- Clickable rows: Cursor pointer with onClick navigation
- Integrated search/filter in toolbar above grid

---

## Page Designs

### 1. Invite Activation Page (Public)
**Layout**: Centered card on neutral background
- Card: `max-w-md mx-auto mt-20 p-8`
- Logo at top
- Heading: "Activate Your Account"
- Instructions paragraph
- Single button: "Sign in with Replit" (full width)
- Footer link: "Already have an account? Sign in"

### 2. Admin Dashboard
**Layout**: fa-shell PageLayout with breadcrumbs
- Page title: "Admin Dashboard" with `actionButton` for "New Employee"
- Stats cards grid (3 columns): Total Employees, Active Invites, Recent Signups
- Two-section layout:
  - Left: "Recent Employees" table (last 5, click to view)
  - Right: "Pending Invitations" list with copy/revoke actions
- Each section in card with header and "View All" link

### 3. Employee Directory (Main View)
**Layout**: fa-shell PageLayout with full-width content
- Page title: "Employee Directory"
- Toolbar above AG Grid: Search input (left), Filter dropdown (right)
- AG Grid configuration:
  - Columns: Avatar (40px fixed), Name, Title, Department, Email, Phone
  - Name column: Bold with clickable link styling
  - Pagination: 50 rows per page
  - onRowClicked navigates to profile
- Grid height: `calc(100vh - 220px)` for full viewport usage

### 4. Employee Profile View
**Layout**: fa-shell PageLayout with breadcrumbs
- Breadcrumbs: Directory > [Employee Name]
- Two-column layout (md:grid-cols-3):
  - Left sidebar (1 col): 
    - Avatar (large, 160px circle)
    - Name and title
    - Department badge
    - Contact quick actions (email/phone buttons)
  - Right content (2 cols):
    - "About" section (bio/description)
    - "Details" section (grid: Join Date, Location, Manager, etc.)
    - If viewing own profile: "Edit Profile" button (top right of content area)

### 5. Profile Edit Form
**Layout**: fa-shell PageLayout with form in card
- Page title: "Edit Profile" with breadcrumbs
- Single card `max-w-3xl`:
  - Avatar upload section (left aligned, with "Change Photo" button)
  - Form grid (2 columns):
    - First Name*, Last Name*
    - Title, Department
    - Email (disabled), Phone
    - Location, Bio (full width textarea)
  - Footer: "Cancel" (ghost) and "Save Changes" (primary) buttons

---

## Visual Enhancements

**No hero images** - Utility app focuses on data and workflows
**Avatar strategy**: Use initials fallback circles with consistent background colors
**Empty states**: Illustrations or icons with helper text for empty tables/lists
**Loading states**: Skeleton loaders for tables, spinner for actions
**Micro-interactions**: Minimal - fade transitions only, no distracting animations