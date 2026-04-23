import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DealAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  performedBy: string | null;
  changes: unknown;
  metadata: unknown;
  status: string;
  performedAt: string;
  performerName: string | null;
}

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 dark:text-green-400",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  login: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  link: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  unlink: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  reorder: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  upload: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangesDisplay({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") return null;

  const c = changes as { before?: Record<string, unknown>; after?: Record<string, unknown> } & Record<string, unknown>;

  const hasBeforeAfter = c.before || c.after;

  if (hasBeforeAfter) {
    const beforeKeys = Object.keys(c.before || {});
    const afterKeys = Object.keys(c.after || {});
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

    if (allKeys.length === 0) return null;

    return (
      <div className="text-xs space-y-1 mt-2" data-testid="history-entry-changes">
        {allKeys.map((key) => {
          const before = c.before?.[key];
          const after = c.after?.[key];
          const hasBefore = c.before && key in c.before;
          const hasAfter = c.after && key in c.after;

          return (
            <div key={key} className="flex flex-wrap gap-1 items-baseline">
              <span className="font-medium text-foreground">{key}:</span>
              {hasBefore && hasAfter ? (
                <>
                  <span
                    className="text-red-500 line-through truncate max-w-[200px]"
                    title={formatJsonValue(before)}
                  >
                    {formatJsonValue(before)}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className="text-green-600 dark:text-green-400 truncate max-w-[200px]"
                    title={formatJsonValue(after)}
                  >
                    {formatJsonValue(after)}
                  </span>
                </>
              ) : hasAfter ? (
                <span
                  className="text-green-600 dark:text-green-400 truncate max-w-[300px]"
                  title={formatJsonValue(after)}
                >
                  {formatJsonValue(after)}
                </span>
              ) : hasBefore ? (
                <span
                  className="text-red-500 truncate max-w-[300px]"
                  title={formatJsonValue(before)}
                >
                  {formatJsonValue(before)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const entries = Object.entries(c).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;

  return (
    <div className="text-xs space-y-1 mt-2" data-testid="history-entry-changes">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap gap-1 items-baseline">
          <span className="font-medium text-foreground">{key}:</span>
          <span className="text-muted-foreground truncate max-w-[300px]" title={formatJsonValue(value)}>
            {formatJsonValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HistoryEntry({ log }: { log: DealAuditLog }) {
  const colorClass = actionColors[log.action] || "bg-muted text-muted-foreground";
  const performedAt = new Date(log.performedAt);
  const absoluteTimestamp = format(performedAt, "MMM d, yyyy 'at' h:mm a");
  const relativeTimestamp = formatDistanceToNow(performedAt, { addSuffix: true });

  return (
    <Card className="p-4" data-testid={`history-entry-${log.id}`}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span
          className={`${colorClass} capitalize font-medium text-xs px-2 py-0.5 rounded`}
          data-testid={`history-entry-action-${log.id}`}
        >
          {log.action.replace(/_/g, " ")}
        </span>
        <span className="text-sm font-medium" data-testid={`history-entry-user-${log.id}`}>
          {log.performerName || "System"}
        </span>
        {log.status === "failure" && (
          <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        )}
      </div>
      <div
        className="text-xs text-muted-foreground"
        title={absoluteTimestamp}
        data-testid={`history-entry-timestamp-${log.id}`}
      >
        {relativeTimestamp} · {absoluteTimestamp}
      </div>
      <ChangesDisplay changes={log.changes} />
    </Card>
  );
}

export function DealHistoryTab({ dealId }: { dealId: string }) {
  const { data: logs, isLoading, error } = useQuery<DealAuditLog[]>({
    queryKey: ["/api/deals", dealId, "history"],
    enabled: Boolean(dealId),
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="history-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="history-error"
      >
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-base font-semibold mb-1">Couldn't load history</h3>
        <p className="text-sm text-muted-foreground">
          Something went wrong while loading this deal's history.
        </p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="history-empty"
      >
        <Activity className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold mb-1">No history yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Actions taken on this deal will appear here as a timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="history-list">
      {logs.map((log) => (
        <HistoryEntry key={log.id} log={log} />
      ))}
    </div>
  );
}
