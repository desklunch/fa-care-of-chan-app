import { EntityTaskGrid } from "@/components/entity-task-grid";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { PageLayout } from "@/framework";

export default function TasksPage() {
  const { can } = usePermissions();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!can("admin.settings")) {
      navigate("/");
    }
  }, [can, navigate]);

  if (!can("admin.settings")) {
    return null;
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Tasks" }]}>
      <div className="p-6" data-testid="page-tasks">
        <EntityTaskGrid showEntityType />
      </div>
    </PageLayout>
  );
}
