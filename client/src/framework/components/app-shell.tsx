import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { PageHeaderProvider, usePageHeaderContext } from "../hooks/page-header-context";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { QuickCreateProvider } from "./quick-create-dialogs";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { headerState } = usePageHeaderContext();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  return (
    <div className="flex flex-col bg-muted overflow-hidden overscroll-contain w-screen h-dvh">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <div className="flex flex-1 bg-background rounded-none md:rounded-lg md:rounded-tl-[32px] ring ring-0 md:ring-[1.5px] ring-border shadow-lg overflow-hidden overscroll-contain md:m-3 shadow-4xl ">
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
          <main className="flex-1 overflow-auto overscroll-contain pb-safe">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <PageHeaderProvider>
      <QuickCreateProvider>
        <AppShellContent>{children}</AppShellContent>
      </QuickCreateProvider>
    </PageHeaderProvider>
  );
}
