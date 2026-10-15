import { useNow } from "@/lib/useNow";
import { isQuotaError, type CodexQuota, type CodexWindow, type QuotaError } from "./api";
import { formatAge, formatTimes, formatWindow } from "./format";
import { ProgressBar } from "./ProgressBar";

export function CodexCard({ side }: { side: CodexQuota | QuotaError }) {
  const now = useNow(30_000);

  const windows: { key: string; window: CodexWindow }[] = [];
  if (!isQuotaError(side)) {
    if (side.primary !== null) {
      windows.push({ key: "primary", window: side.primary });
    }
    if (side.secondary !== null) {
      windows.push({ key: "secondary", window: side.secondary });
    }
  }

  return (
    <section aria-label="Codex" className="flex flex-col gap-4 rounded-lg border p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Codex</h2>
      </header>
      {isQuotaError(side) ? (
        <p className="text-sm text-destructive">{side.error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {side.plan_type !== null && (
            <p className="text-sm text-muted-foreground">
              Plan: <span className="font-medium text-foreground">{side.plan_type}</span>
            </p>
          )}
          {windows.map(({ key, window }) => {
            const label = formatWindow(window.window_minutes);
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{label}</span>
                  <ProgressBar label={label} percent={window.used_percent} />
                </div>
                {window.resets_at !== null && (
                  <span className="text-xs text-muted-foreground">
                    {`Resets ${formatTimes(window.resets_at)}`}
                  </span>
                )}
              </div>
            );
          })}
          {side.primary === null && side.secondary === null && (
            <p className="text-sm text-muted-foreground">No rate-limit window reported.</p>
          )}
          {side.reset_credits_available > 0 && (
            <p className="text-sm text-muted-foreground">
              {`${side.reset_credits_available} reset credit${side.reset_credits_available === 1 ? "" : "s"} available`}
            </p>
          )}
          {(side.ordinary_usage_allowed === false || side.rate_limit_reached_type !== null) && (
            <p className="text-sm font-medium text-destructive">The Codex limit has been reached.</p>
          )}
          <span className="text-xs text-muted-foreground">
            {`Updated ${formatAge(side.fetched_at, now)}`}
          </span>
        </div>
      )}
    </section>
  );
}
