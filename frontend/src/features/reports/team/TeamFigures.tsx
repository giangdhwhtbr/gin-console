import { cn } from "@/lib/utils";
import { formatDays, formatPercent } from "../format";
import type { MemberFigures, TeamFigures as Figures, TeamMilestone, TeamTotals } from "../teamApi";
import { formatDate, WARN_DAYS } from "./format";

const WARN = "text-state-blocked";

function Cell({ label, aside, value, sub, warnValue = false, warnSub = false }: {
  label: string;
  aside?: string;
  value: string;
  sub: string;
  warnValue?: boolean;
  warnSub?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-3">
      <span className="text-xs text-muted-foreground">
        {label}
        {aside !== undefined && <span className="ml-1 opacity-70">{aside}</span>}
      </span>
      <span className={cn("text-2xl font-semibold", warnValue && WARN)}>{value}</span>
      <span className={cn("text-xs text-muted-foreground", warnSub && WARN)}>{sub}</span>
    </div>
  );
}

const STRIPES = "repeating-linear-gradient(45deg, var(--color-state-blocked) 0 3px, transparent 3px 6px)";

function ScopeBar({ figures, member }: { figures: Figures; member: string | null }) {
  const open = figures.open - figures.blocked;
  const segments = [
    { name: "Closed", n: figures.closed, className: "bg-state-ready", style: undefined },
    { name: "In progress", n: figures.in_progress, className: "bg-state-progress", style: undefined },
    { name: "Open", n: open, className: "bg-muted-foreground/40", style: undefined },
    { name: "Blocked", n: figures.blocked, className: "border border-state-blocked", style: { background: STRIPES } },
  ];
  const label = `${figures.closed} closed, ${figures.in_progress} in progress, ${open} open, ${figures.blocked} blocked`;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Scope by status</h2>
        <span className="text-sm text-muted-foreground">
          {figures.scope} beads {member === null ? "under the milestone's epics" : `assigned to ${member}`}
        </span>
      </div>
      <div role="img" aria-label={label} className="flex h-3 overflow-hidden rounded bg-muted">
        {segments.map((s) => (
          <span key={s.name} className={s.className} style={{ ...s.style, width: `${figures.scope === 0 ? 0 : (s.n / figures.scope) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-1">
            <span aria-hidden className={cn("size-2.5 rounded-full", s.className)} style={s.style} />
            {s.name} <b>{s.n}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaceOrThroughput({ team, figures, solo, milestone }: { team: TeamTotals; figures: Figures; solo: boolean; milestone: TeamMilestone }) {
  if (!solo && team.pace_needed !== null) {
    const behind = team.pace_needed > team.pace;
    return (
      <Cell
        label="Pace"
        aside="last 5 days"
        value={`${team.pace.toFixed(1)} / day`}
        sub={`needs ${team.pace_needed.toFixed(1)} / day to end on ${formatDate(milestone.end)}`}
        warnValue={behind}
        warnSub={behind}
      />
    );
  }
  return (
    <Cell
      label="Throughput"
      value={`${figures.throughput.toFixed(1)} / week`}
      sub={milestone.status === "closed" ? "over the milestone" : "last 5 working days"}
    />
  );
}

export function TeamFigures({ team, member, milestone }: { team: TeamTotals; member: MemberFigures | null; milestone: TeamMilestone }) {
  const figures: Figures = member ?? team;
  const solo = member !== null;
  const lateOpen = solo ? 0 : team.late_open;
  const slow = figures.oldest_in_progress !== null && figures.oldest_in_progress > WARN_DAYS;
  const onTime = figures.on_time;
  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="Key figures"
        className="grid divide-x divide-y rounded border"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
      >
        <Cell label="Done" value={`${figures.closed} / ${figures.scope}`} sub={`${formatPercent(figures.done)} of ${solo ? "assigned" : "scope"}`} />
        <Cell
          label="In progress"
          value={String(figures.in_progress)}
          sub={figures.oldest_in_progress === null ? "nothing started" : `oldest ${formatDays(figures.oldest_in_progress)}`}
          warnSub={slow}
        />
        <Cell
          label="Open"
          value={String(figures.open)}
          sub={solo ? `${figures.blocked} blocked` : `${figures.blocked} blocked · ${figures.unclaimed} unclaimed`}
          warnSub={figures.blocked > 0}
        />
        <PaceOrThroughput team={team} figures={figures} solo={solo} milestone={milestone} />
        <Cell label="Median cycle" value={formatDays(figures.cycle_median)} sub="start → close" />
        <Cell
          label="On time"
          value={formatPercent(onTime)}
          sub={lateOpen > 0 ? `${lateOpen} still open after end` : `closed by ${formatDate(milestone.end)}`}
          warnValue={onTime !== null && onTime < 1}
          warnSub={lateOpen > 0}
        />
        <Cell label="Rework" value={formatPercent(figures.rework_rate)} sub={`${figures.reopens} reopens · ${figures.bugs} bugs later`} />
      </div>
      <ScopeBar figures={figures} member={member === null ? null : member.member} />
    </div>
  );
}
