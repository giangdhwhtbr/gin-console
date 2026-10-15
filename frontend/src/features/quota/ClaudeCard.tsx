import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/useNow";
import { isQuotaError, type ClaudeQuota, type QuotaError } from "./api";
import { formatAge, formatTimes } from "./format";
import { ProgressBar } from "./ProgressBar";

export function ClaudeCard({
  side,
  pending,
  onRefresh,
}: {
  side: ClaudeQuota | QuotaError;
  pending: boolean;
  onRefresh: () => void;
}) {
  const now = useNow(30_000);

  return (
    <section aria-label="Claude" className="flex flex-col gap-4 rounded-lg border p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Claude</h2>
        <Button variant="outline" size="sm" disabled={pending} onClick={onRefresh}>
          Refresh
        </Button>
      </header>
      {isQuotaError(side) ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-destructive">{side.error}</p>
          {typeof side.raw === "string" && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Raw output</summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-words">
                {side.raw}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {side.windows.map((window) => (
            <div key={window.label} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{window.label}</span>
                <ProgressBar label={window.label} percent={window.used_percent} />
              </div>
              <span className="text-xs text-muted-foreground">
                {`Resets ${formatTimes(window.resets_at)}`}
              </span>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">
            {`Updated ${formatAge(side.fetched_at, now)}`}
          </span>
        </div>
      )}
    </section>
  );
}
