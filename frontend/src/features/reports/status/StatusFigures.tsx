import { Hint } from "@/components/ui/tooltip";
import { plural } from "@/features/milestones/format";
import { formatDate } from "@/lib/dates";
import { countHint } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { formatPercent } from "../format";
import type { TeamMilestone } from "../teamApi";
import type { StatusKpis } from "./statusApi";

const WARN = "text-state-blocked";
const formatNum = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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

  const scope = "the milestone's epics";
  const beadsVal = kpis.beads.done !== null && kpis.beads.scope !== null ? `${kpis.beads.done} of ${kpis.beads.scope}` : "—";
  const beadsSub =
    kpis.beads.done !== null && kpis.beads.done_week_ago !== null ? `+${kpis.beads.done - kpis.beads.done_week_ago} this week` : null;

  const pointsVal =
    kpis.points.done !== null && kpis.points.scope !== null ? `${formatNum(kpis.points.done)} of ${formatNum(kpis.points.scope)}` : "—";
  const pointsAdded =
    kpis.points.scope !== null && kpis.points.at_kickoff !== null ? Math.round((kpis.points.scope - kpis.points.at_kickoff) * 10) / 10 : null;
  const pointsSub =
    pointsAdded === null ? null : pointsAdded > 0 ? `+${formatNum(pointsAdded)} added after kickoff` : "scope unchanged since kickoff";

  const paceVal = kpis.pace.pace !== null ? `${kpis.pace.pace.toFixed(1)} a day` : "—";
  const paceBehind = kpis.pace.pace !== null && kpis.pace.pace_needed !== null && kpis.pace.pace_needed > kpis.pace.pace;
  const paceSub =
    kpis.pace.pace_needed !== null
      ? `needs ${kpis.pace.pace_needed.toFixed(1)} to end on ${formatDate(milestone.end, today)}`
      : kpis.pace.pace_week_ago !== null
        ? `${kpis.pace.pace_week_ago.toFixed(1)} a day last week`
        : null;

  const blockedSub =
    kpis.blocked.count === 0
      ? "nothing blocked"
      : kpis.blocked.oldest_days !== null
        ? `oldest waiting ${plural(kpis.blocked.oldest_days, "day")}`
        : null;

  const reworkVal = formatPercent(kpis.rework.rate);
  let reworkSub: string | null = null;
  let reworkWarn = false;
  if (kpis.rework.rate !== null && kpis.rework.rate_week_ago !== null) {
    const nowPct = Math.round(kpis.rework.rate * 100);
    const agoPct = Math.round(kpis.rework.rate_week_ago * 100);
    if (nowPct === agoPct) {
      reworkSub = "same as last week";
    } else if (nowPct > agoPct) {
      reworkSub = `up from ${formatPercent(kpis.rework.rate_week_ago)} last week`;
      reworkWarn = true;
    } else {
      reworkSub = `down from ${formatPercent(kpis.rework.rate_week_ago)} last week`;
    }
  }

  return (
    <div
      role="group"
      aria-label="Key figures"
      className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-2 sm:divide-x lg:grid-cols-5 lg:divide-y-0"
    >
      <FigureCell label="Beads done" rule={countHint("done", scope)} value={beadsVal} sub={beadsSub} />
      <FigureCell
        label="Points done"
        rule="Points done: story points completed across the milestone's epics, proportional to closed tracks."
        value={pointsVal}
        sub={pointsSub}
        warnSub={pointsAdded !== null && pointsAdded > 0}
      />
      <FigureCell
        label="Pace"
        rule="Pace: beads closed per working day over the last 5 working days, up to today. Counted in the milestone's epics."
        value={paceVal}
        sub={paceSub}
        warnSub={paceBehind}
      />
      <FigureCell label="Blocked" rule={countHint("blocked", scope)} value={String(kpis.blocked.count)} sub={blockedSub} />
      <FigureCell label="Rework" rule={countHint("rework", scope)} value={reworkVal} sub={reworkSub} warnSub={reworkWarn} />
    </div>
  );
}
