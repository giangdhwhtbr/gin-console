import { PERIODS, type Scope } from "./filters";
import type { TeamMilestone } from "./teamApi";

type Chosen = Exclude<Scope, { kind: "default" }>;

const byStart = (a: TeamMilestone, b: TeamMilestone) => a.start.localeCompare(b.start);
const byEndDesc = (a: TeamMilestone, b: TeamMilestone) => b.end.localeCompare(a.end);

// an option value names its kind, so a milestone id never reads as a period
const valueOf = (scope: Scope): string => (scope.kind === "milestone" ? `milestone:${scope.id}` : scope.kind === "period" ? `days:${scope.days}` : "");

function scopeOf(value: string): Chosen | null {
  if (value.startsWith("milestone:")) return { kind: "milestone", id: value.slice("milestone:".length) };
  const days = PERIODS.find((p) => value === `days:${p}`);
  return days === undefined ? null : { kind: "period", days };
}

/** REQ-REPORTS-033: the one scope of every report section, the team report's milestones by group, then the three periods. */
export function ScopeSelect({ milestones, scope, onChange }: { milestones: readonly TeamMilestone[]; scope: Scope; onChange: (next: Chosen) => void }) {
  const groups: [string, TeamMilestone[]][] = [
    ["Active", milestones.filter((m) => m.status === "active")],
    ["Planned", milestones.filter((m) => m.status === "scheduled" || m.status === "planned").sort(byStart)],
    ["Closed", milestones.filter((m) => m.status === "closed").sort(byEndDesc)],
  ];
  return (
    <label className="flex min-w-0 max-w-full items-center gap-2 text-sm text-muted-foreground">
      Every report uses
      <select
        aria-label="Report scope"
        value={valueOf(scope)}
        onChange={(event) => {
          const next = scopeOf(event.target.value);
          if (next !== null) onChange(next);
        }}
        className="min-w-0 max-w-full truncate rounded border bg-background px-2 py-1 text-sm text-foreground"
      >
        {groups
          .filter(([, list]) => list.length > 0)
          .map(([label, list]) => (
            <optgroup key={label} label={label}>
              {list.map((m) => (
                <option key={m.id} value={valueOf({ kind: "milestone", id: m.id })} title={m.title}>
                  {m.title}
                </option>
              ))}
            </optgroup>
          ))}
        {PERIODS.map((days) => (
          <option key={days} value={valueOf({ kind: "period", days })}>
            Last {days} days
          </option>
        ))}
      </select>
    </label>
  );
}
