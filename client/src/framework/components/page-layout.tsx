import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import type { Breadcrumb, ActionButton } from "../types/layout";

interface PageLayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actionButton?: ActionButton;
  customHeaderAction?: ReactNode;
}

export default function PageLayout({
  children,
  breadcrumbs,
  actionButton,
  customHeaderAction,
}: PageLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          isMobileOpen={isMobileOpen}
          onToggle={() => setIsMobileOpen(!isMobileOpen)}
          breadcrumbs={breadcrumbs}
          actionButton={actionButton}
          customAction={customHeaderAction}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
