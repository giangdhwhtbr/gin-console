import { Hint } from "@/components/ui/tooltip";
import { countHint } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { formatPercent } from "../format";
import type { TeamMilestone } from "../teamApi";
import type { StatusKpis } from "./statusApi";
import { kpiFigures } from "./statusView";

const WARN = "text-state-blocked";

function FigureCell({
  label,
  rule,
  value,
  sub,
  warnSub = false,
}: {
  label: string;
  rule: string;
  value: string;
  sub?: string | null;
  warnSub?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Hint text={rule}>
        <span tabIndex={0} className="w-fit rounded text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-ring">
          {value}
        </span>
      </Hint>
      {sub != null && sub !== "" && <span className={cn("text-xs text-muted-foreground", warnSub && WARN)}>{sub}</span>}
    </div>
  );
}

/**
 * REQ-REPORTS-028 and REQ-REPORTS-032: five milestone KPI figures (5/2/1 columns) or three period figures without change lines.
 */
export function StatusFigures({ kpis, milestone, today }: { kpis: StatusKpis; milestone: TeamMilestone | null; today: string }) {
  if (milestone === null) {
    const scope = "the period";
    return (
      <div role="group" aria-label="Key figures" className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <FigureCell label="Beads done" rule={countHint("done", scope)} value={`${kpis.beads.done ?? 0} closed`} />
        <FigureCell label="Rework" rule={countHint("rework", scope)} value={formatPercent(kpis.rework.rate)} />
        <FigureCell label="Blocked" rule={countHint("blocked", scope)} value={String(kpis.blocked.count)} />
      </div>
    );
  }

  const figures = kpiFigures(kpis, milestone, today);

  return (
    <div
      role="group"
      aria-label="Key figures"
      className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-2 sm:divide-x lg:grid-cols-5 lg:divide-y-0"
    >
      {figures.map((figure) => (
        <FigureCell key={figure.label} label={figure.label} rule={figure.rule} value={figure.value} sub={figure.sub} warnSub={figure.warn} />
      ))}
    </div>
  );
}
