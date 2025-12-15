import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { PageHeaderProvider, usePageHeaderContext } from "../hooks/page-header-context";
import { CommandPalette, useCommandPalette } from "./command-palette";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { headerState } = usePageHeaderContext();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  return (
    <div className="flex flex-col bg-muted overflow-hidden overscroll-contain w-screen h-screen">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <div className="flex flex-1 bg-background rounded-none md:rounded-xl ring ring-[1.5px] ring-black/5 shadow-lg overflow-hidden overscroll-contain md:m-3 shadow-4xl">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
          onSearch={() => setCommandPaletteOpen(true)}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden overscroll-contain">
          <Header
            isMobileOpen={isMobileOpen}
            onToggle={() => setIsMobileOpen(!isMobileOpen)}
            breadcrumbs={headerState.breadcrumbs}
            primaryAction={headerState.primaryAction}
            additionalActions={headerState.additionalActions}
          />
          <main className="flex-1 overflow-auto overscroll-contain">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <PageHeaderProvider>
      <AppShellContent>{children}</AppShellContent>
    </PageHeaderProvider>
  );
}
