import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import logoImage from "@assets/coc-icon-1_1769700566602.png";

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-6 py-3">
          <Link href="/">
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover-elevate rounded-md px-2 py-1" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </a>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <img src={logoImage} alt="Care of Chan" className="h-10 w-10 rounded-lg" />
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{title}</h1>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
