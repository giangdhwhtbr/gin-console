import { useCallback } from "react";
import { fetchTrends, TREND_WINDOWS, browserZone, useFetched, type Trends } from "./api";
import { FlakyList } from "./FlakyList";
import type { CaseFilters } from "./filters";
import { PassRateChart } from "./PassRateChart";
import { QaError } from "./QaError";
import { TimeToFix } from "./TimeToFix";
import { cn } from "@/lib/utils";

const SELECT = "min-w-0 max-w-full rounded border bg-background px-2 py-1 text-sm text-foreground";

const hasRuns = (data: Trends) => data.pass_rate.some((row) => row.points.some((point) => point.passed + point.failed > 0));

/** REQ-QA-018, REQ-QA-019: the trends of the project over a window of days, filtered by the shared capability. */
export function TrendsTab({ project, filters, onChange }: { project: string; filters: CaseFilters; onChange: (next: CaseFilters) => void }) {
  const { days, capability } = filters;
  const { state, retry } = useFetched(useCallback(() => fetchTrends(project, days, browserZone(), capability), [project, days, capability]));
  const names = state.status === "ok" ? state.data.pass_rate.map((row) => row.name) : [];
  const capabilities = capability !== null && !names.includes(capability) ? [...names, capability] : names;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <div role="group" aria-label="Window" className="flex gap-1">
          {TREND_WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              aria-pressed={days === window}
              onClick={() => onChange({ ...filters, days: window })}
              className={cn("min-h-9 rounded border px-3", days === window ? "border-identity bg-muted font-medium" : "text-muted-foreground")}
            >
              {`${window} days`}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1">
          Capability
          <select className={SELECT} value={capability ?? ""} onChange={(e) => onChange({ ...filters, capability: e.target.value || null })}>
            <option value="">All</option>
            {capabilities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state.status === "loading" && <p className="text-muted-foreground">Loading trends…</p>}
      {state.status === "error" && <QaError failure={state.failure} onRetry={retry} />}
      {state.status === "ok" && (
        <>
          {state.data.problems.length > 0 && <p className="text-sm text-muted-foreground">{`${state.data.problems.length} lines of the run history could not be read`}</p>}
          {hasRuns(state.data) ? (
            <>
              <PassRateChart rows={state.data.pass_rate} days={state.data.days} />
              <FlakyList project={project} rows={state.data.flaky} />
              <TimeToFix project={project} data={{ ...state.data.time_to_fix, still_failing: state.data.still_failing }} />
            </>
          ) : (
            <p>{`No test runs in the last ${days} days. gin-qa records them when a case result, an e2e run or a tests run is written.`}</p>
          )}
        </>
      )}
    </div>
  );
}
