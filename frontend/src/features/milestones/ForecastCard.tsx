import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Forecast } from "./api";
import { plural, shortDate, workdaysAfter } from "./format";

/** The project forecast of `milestone list --json` (REQ-MILESTONE-UI-016); nothing without one. */
export function ForecastCard({ forecast: f, today }: { forecast: Forecast | null; today: string }) {
  if (f === null) return null;
  const date = (iso: string) => shortDate(iso, today);
  let compare: { text: string; late: boolean } | null = null;
  if (f.finish !== null && f.deadline !== null) {
    if (f.overflow_days > 0) compare = { text: `${plural(f.overflow_days, "working day")} past the deadline`, late: true };
    else if (f.finish === f.deadline) compare = { text: "on the deadline", late: false };
    else compare = { text: `${plural(workdaysAfter(f.finish, f.deadline), "working day")} spare`, late: false };
  }
  return (
    <section aria-label="Project forecast" className="grid gap-4 rounded border bg-card px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Project forecast · open roadmap epics</span>
        <span className="text-lg font-semibold">{f.finish === null ? "No estimate: every open epic is unestimated" : `Finishes ${date(f.finish)}`}</span>
        {compare !== null && <span className={cn("text-sm", compare.late ? "text-state-blocked" : "text-state-ready")}>{compare.text}</span>}
        {f.deadline !== null ? (
          <span className="text-sm text-muted-foreground">{`Deadline ${date(f.deadline)}`}</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1 text-sm">
            No deadline · add <code className="rounded bg-muted px-1.5 font-mono text-xs">- Deadline: YYYY-MM-DD</code> to the roadmap
          </span>
        )}
      </div>
      <Figure label="Default lanes" value={plural(f.lanes, "lane")} />
      <Figure label="Open epics" value={plural(f.open_epics, "open epic")} />
      <Figure label="Unestimated" value={`${f.unestimated} unestimated`} warn={f.unestimated > 0} />
      {f.error !== null && <p className="text-sm text-destructive md:col-span-4">{f.error}</p>}
    </section>
  );
}

function Figure({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", warn && "text-state-blocked")}>
        {warn && <TriangleAlert role="img" aria-label="Warning" className="size-3.5" />}
        {value}
      </span>
    </div>
  );
}
