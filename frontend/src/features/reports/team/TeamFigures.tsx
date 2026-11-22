import { Fragment } from "react";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS, countHint } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { formatDays, formatPercent } from "../format";
import type { MemberFigures, TeamFigures as Figures, TeamMilestone, TeamTotals } from "../teamApi";
import { formatDate } from "@/lib/dates";
import { WARN_DAYS } from "./format";

const WARN = "text-state-blocked";

// REQ-REPORTS-013: the rules of the figures that DEFINITIONS does not state
const RULE = {
  pace: "Pace: beads closed per working day over the last 5 working days, up to today.",
  throughput: "Throughput: beads closed per 5 working days; for a closed milestone, over the milestone.",
  cycle: "Median cycle: the median days from start to close of the closed beads.",
  onTime: "On time: the share of closed beads closed by the end of the milestone.",
} as const;

function Cell({ label, aside, rule, value, sub, warnValue = false, warnSub = false }: {
  label: string;
  aside?: string;
  rule: string;
  value: string;
  sub: string;
  warnValue?: boolean;
  warnSub?: boolean;
}) {
  const parts = sub.split(" · ");
  return (
    <div className="flex flex-col gap-1 p-3">
      <span className="text-xs text-muted-foreground">
        {label}
        {aside !== undefined && <span className="ml-1">{aside}</span>}
      </span>
      <Hint text={rule}>
        <span tabIndex={0} className={cn("w-fit rounded text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-ring", warnValue && WARN)}>
          {value}
        </span>
      </Hint>
      <span className={cn("flex flex-wrap text-xs text-muted-foreground", warnSub && WARN)}>
        {parts.map((part, i) => {
          // joined facts ("3 blocked · 8 unassigned") get a strong number; a single line stays plain text
          const [, count = "", rest = part] = (parts.length > 1 ? /^(\d+(?:\.\d+)?)(.*)$/.exec(part) : null) ?? [];
          return (
            <Fragment key={part}>
              {i > 0 && <span className="whitespace-pre"> · </span>}
              {part.endsWith(" unassigned") ? (
                <Hint text={DEFINITIONS.unassigned}>
                  <span>
                    {count !== "" && <b className="font-semibold">{count}</b>}
                    {rest}
                  </span>
                </Hint>
              ) : (
                <span>
                  {count !== "" && <b className="font-semibold">{count}</b>}
                  {rest}
                </span>
              )}
            </Fragment>
          );
        })}
      </span>
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
        rule={RULE.pace}
        value={`${team.pace.toFixed(1)} done per day`}
        sub={`needs ${team.pace_needed.toFixed(1)} done per day to finish by ${formatDate(milestone.end)}`}
        warnValue={behind}
        warnSub={behind}
      />
    );
  }
  return (
    <Cell
      label="Throughput"
      rule={RULE.throughput}
      value={`${figures.throughput.toFixed(1)} done per week`}
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
  const scope = solo ? `beads assigned to ${member.member}` : "the milestone's epics";
  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="Key figures"
        className="grid divide-x divide-y rounded border"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
      >
        <Cell label="Done" rule={countHint("done", scope)} value={`${figures.closed} / ${figures.scope}`} sub={`${formatPercent(figures.done)} of ${solo ? "assigned" : "scope"}`} />
        <Cell
          label="In progress"
          rule={countHint("inProgress", scope)}
          value={String(figures.in_progress)}
          sub={figures.oldest_in_progress === null ? "nothing started" : `oldest ${formatDays(figures.oldest_in_progress)}`}
          warnSub={slow}
        />
        <Cell
          label="Open"
          rule={`${countHint("open", scope)} ${DEFINITIONS.blocked}`}
          value={String(figures.open)}
          sub={solo ? `${figures.blocked} blocked` : `${figures.blocked} blocked · ${figures.unclaimed} unassigned`}
          warnSub={figures.blocked > 0}
        />
        <PaceOrThroughput team={team} figures={figures} solo={solo} milestone={milestone} />
        <Cell label="Median cycle" rule={RULE.cycle} value={formatDays(figures.cycle_median)} sub="start → close" />
        <Cell
          label="On time"
          rule={RULE.onTime}
          value={formatPercent(onTime)}
          sub={lateOpen > 0 ? `${lateOpen} open after the end date` : `closed by ${formatDate(milestone.end)}`}
          warnValue={onTime !== null && onTime < 1}
          warnSub={lateOpen > 0}
        />
        <Cell label="Rework" rule={DEFINITIONS.rework} value={formatPercent(figures.rework_rate)} sub={`${figures.reopens} reopens · ${figures.bugs} bugs later`} />
      </div>
      <ScopeBar figures={figures} member={member === null ? null : member.member} />
    </div>
  );
}
