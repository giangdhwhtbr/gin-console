import { Fragment } from "react";
import { StateGlyph } from "@/components/StateGlyph";
import { Strand } from "@/components/Strand";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS, countHint } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { formatDays, formatPercent } from "../format";
import type { MemberFigures, TeamFigures as Figures, TeamMilestone, TeamTotals } from "../teamApi";
import { formatDate } from "@/lib/dates";
import { plural, twoDecimals } from "@/features/milestones/format";
import { formatPoints, WARN_DAYS } from "./format";

const WARN = "text-state-blocked";

// REQ-REPORTS-013: the rules of the figures that DEFINITIONS does not state
const RULE = {
  points: "Points delivered: story points of closed epics in the scope, shared across members by closed tracks.",
  pace: "Pace: beads closed per working day over the last 5 working days, up to today.",
  throughput: "Throughput: beads closed per 5 working days; for a closed milestone, over the milestone.",
  cycle: "Median cycle: the median days from start to close of the closed beads.",
  onTime: "On time: the share of closed beads closed by the end of the milestone.",
  accuracy: "Estimate accuracy: planned days per point divided by actual days per point across closed epics with points; above 1 is faster than planned.",
} as const;

function Cell({ label, aside, rule, value, sub, warnValue = false, warnSub = false }: {
  label: string;
  aside?: string;
  rule: string;
  value: string;
  sub?: string | readonly string[];
  warnValue?: boolean;
  warnSub?: boolean;
}) {
  const parts = sub === undefined || sub === "" ? [] : typeof sub === "string" ? [sub] : sub;
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
      {parts.length > 0 && (
        <span className={cn("flex flex-wrap text-xs text-muted-foreground", warnSub && WARN)}>
          {parts.map((part, i) => {
            // joined facts ("3 blocked, 8 unassigned") get a strong number; a single line stays plain text
            const [, count = "", rest = part] = (parts.length > 1 ? /^(\d+(?:\.\d+)?)(.*)$/.exec(part) : null) ?? [];
            return (
              <Fragment key={part}>
                {i > 0 && <span className="whitespace-pre">, </span>}
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
      )}
    </div>
  );
}

function ScopeBar({ figures, member, period }: { figures: Figures; member: string | null; period: boolean }) {
  const counts = { done: figures.closed, inProgress: figures.in_progress, blocked: figures.blocked, ready: figures.open - figures.blocked, deferred: 0 };
  const legend = [
    { name: "Done", state: "done", n: counts.done },
    { name: "In progress", state: "in_progress", n: counts.inProgress },
    { name: "Ready", state: "ready", n: counts.ready },
    { name: "Blocked", state: "blocked", n: counts.blocked },
  ] as const;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Scope by status</h2>
        <span className="text-sm text-muted-foreground">
          {figures.scope} beads {member !== null ? `assigned to ${member}` : period ? "closed or in progress in the period" : "under the milestone's epics"}
        </span>
      </div>
      <Strand counts={counts} noun="beads" />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {legend.map((s) => (
          <li key={s.name} className="flex items-center gap-1">
            <StateGlyph state={s.state} />
            {s.name} <b>{s.n}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaceOrThroughput({ team, figures, solo, milestone }: { team: TeamTotals; figures: Figures; solo: boolean; milestone: TeamMilestone | null }) {
  if (!solo && team.pace_needed !== null && milestone !== null) {
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
      sub={milestone?.status === "closed" ? "over the milestone" : "last 5 working days"}
    />
  );
}

function accuracySub(accuracy: number | null): string {
  if (accuracy === null) return "needs a kickoff and a closed epic with points";
  if (accuracy > 1) return "faster than planned";
  return accuracy === 1 ? "as planned" : "slower than planned";
}

/** `milestone` is null for a period (REQ-REPORTS-033), which has no end date to count against. */
export function TeamFigures({ team, member, milestone }: { team: TeamTotals; member: MemberFigures | null; milestone: TeamMilestone | null }) {
  const figures: Figures = member ?? team;
  const solo = member !== null;
  const lateOpen = solo ? 0 : team.late_open;
  const slow = figures.oldest_in_progress !== null && figures.oldest_in_progress > WARN_DAYS;
  const onTime = figures.on_time;
  const accuracy = figures.accuracy;
  const scope = solo ? `beads assigned to ${member.member}` : milestone === null ? "the period" : "the milestone's epics";
  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="Key figures"
        className="grid divide-x divide-y rounded border"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
      >
        <Cell label="Done" rule={countHint("done", scope)} value={`${figures.closed} of ${figures.scope}`} sub={`${formatPercent(figures.done)} of ${solo ? "assigned" : "scope"}`} />
        <Cell label="Points delivered" rule={RULE.points} value={`${formatPoints(figures.points_delivered)} points`} />
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
          sub={solo ? `${figures.blocked} blocked` : [`${figures.blocked} blocked`, `${figures.unclaimed} unassigned`]}
          warnSub={figures.blocked > 0}
        />
        <PaceOrThroughput team={team} figures={figures} solo={solo} milestone={milestone} />
        <Cell label="Median cycle" rule={RULE.cycle} value={formatDays(figures.cycle_median)} sub="start → close" />
        <Cell
          label="On time"
          rule={RULE.onTime}
          value={formatPercent(onTime)}
          sub={lateOpen > 0 ? `${lateOpen} open after the end date` : milestone === null ? "" : `closed by ${formatDate(milestone.end)}`}
          warnValue={onTime !== null && onTime < 1}
          warnSub={lateOpen > 0}
        />
        <Cell
          label="Estimate accuracy"
          rule={RULE.accuracy}
          value={accuracy === null ? "—" : twoDecimals(accuracy)}
          sub={accuracySub(accuracy)}
          warnSub={accuracy !== null && accuracy < 1}
        />
        <Cell label="Rework" rule={DEFINITIONS.rework} value={formatPercent(figures.rework_rate)} sub={[plural(figures.reopens, "reopen"), `${plural(figures.bugs, "bug")} later`]} />
      </div>
      <ScopeBar figures={figures} member={member === null ? null : member.member} period={milestone === null} />
    </div>
  );
}
