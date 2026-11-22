import { TriangleAlert } from "lucide-react";
import { FactList, type Fact } from "@/components/FactList";
import { formatDate } from "@/lib/dates";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import type { DaysPerPoint, Forecast } from "./api";
import { oneDecimal, plural, workdaysAfter } from "./format";

/** The project forecast of `milestone list --json` (REQ-MILESTONE-UI-016); nothing without one. */
export function ForecastCard({ forecast: f, today, daysPerPoint = null }: { forecast: Forecast | null; today: string; daysPerPoint?: DaysPerPoint | null }) {
  if (f === null) return null;
  const date = (iso: string) => formatDate(iso, today);
  let compare: { text: string; late: boolean } | null = null;
  if (f.finish !== null && f.deadline !== null) {
    if (f.overflow_days > 0) compare = { text: `${plural(f.overflow_days, "working day")} past the deadline`, late: true };
    else if (f.finish === f.deadline) compare = { text: "on the deadline", late: false };
    else compare = { text: `${plural(workdaysAfter(f.finish, f.deadline), "working day")} spare`, late: false };
  }
  const facts: Fact[] = [
    { label: "Parallel lanes", hint: DEFINITIONS.parallelLanes, value: plural(f.lanes, "lane") },
    { label: "Open epics", value: plural(f.open_epics, "open epic") },
    {
      label: "Not estimated",
      hint: DEFINITIONS.notEstimated,
      title: `${f.unestimated} not estimated`,
      value:
        f.unestimated > 0 ? (
          <span className="inline-flex items-center gap-1 text-state-blocked">
            <TriangleAlert role="img" aria-label="Warning" className="size-3.5" />
            {`${f.unestimated} not estimated`}
          </span>
        ) : (
          `${f.unestimated} not estimated`
        ),
    },
    ...(daysPerPoint === null ? [] : [{ label: "Days per point", hint: DEFINITIONS.daysPerPoint, value: `${oneDecimal(daysPerPoint.value)}${daysPerPoint.assumed ? " (assumed)" : ""}` }]),
  ];
  return (
    <section aria-label="Project forecast" className="grid gap-4 rounded border bg-card px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] md:items-center">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Project forecast of open roadmap epics</span>
        <span className={cn("font-bold tabular-nums", f.finish === null ? "text-base" : "text-2xl")}>
          {f.finish === null ? "No estimate: no open epic is estimated" : `Finishes ${date(f.finish)}`}
        </span>
        {compare !== null && <span className={cn("text-sm", compare.late ? "text-state-blocked" : "text-state-ready")}>{compare.text}</span>}
        {f.deadline !== null ? (
          <span className="text-sm text-muted-foreground">{`Deadline ${date(f.deadline)}`}</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">No deadline</span> add <code className="rounded bg-muted px-1.5 font-mono text-13">- Deadline: YYYY-MM-DD</code> to the roadmap
          </span>
        )}
      </div>
      <div className="md:col-span-3">
        <FactList facts={facts} />
      </div>
      {f.error !== null && <p className="text-sm text-destructive md:col-span-4">{f.error}</p>}
    </section>
  );
}
