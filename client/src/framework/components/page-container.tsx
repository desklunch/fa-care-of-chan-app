import { ReactNode } from "react";
import { usePageHeader } from "../hooks/page-header-context";
import type { Breadcrumb, ActionButton } from "../types/layout";

interface PageContainerProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ActionButton;
  additionalActions?: ActionButton[];
}

export default function PageContainer({
  children,
  breadcrumbs,
  primaryAction,
  additionalActions,
}: PageContainerProps) {
  usePageHeader({
    breadcrumbs,
    primaryAction,
    additionalActions,
  });

  return <>{children}</>;
}
