import type { MilestoneOption } from "./api";
import type { MilestoneInEffect, MilestonesState } from "./milestoneChoice";

const byStart = (a: MilestoneOption, b: MilestoneOption) => (a.start ?? "").localeCompare(b.start ?? "");
const byLatestEnd = (a: MilestoneOption, b: MilestoneOption) => (b.end ?? "").localeCompare(a.end ?? "");

function Group({ label, items }: { label: string; items: readonly MilestoneOption[] }) {
  if (items.length === 0) return null;
  return (
    <optgroup label={label}>
      {items.map((m) => (
        <option key={m.id} value={m.id}>
          {m.title}
        </option>
      ))}
    </optgroup>
  );
}

export function MilestoneFilter({
  state,
  value,
  onChange,
  disabled = false,
}: {
  state: MilestonesState;
  value: MilestoneInEffect;
  onChange: (value: MilestoneInEffect) => void;
  disabled?: boolean;
}) {
  const milestones = state.status === "ok" ? state.data.milestones : [];
  return (
    <label className="flex items-center gap-1 text-sm">
      Milestone
      <select
        aria-label="Milestone"
        value={state.status === "error" ? "unavailable" : value}
        disabled={disabled || state.status !== "ok"}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border bg-background px-2 py-1"
      >
        {state.status === "error" ? (
          <option value="unavailable" disabled>
            Milestones unavailable
          </option>
        ) : (
          <>
            <option value="all">All</option>
            <option value="none">No milestone</option>
            <Group label="Active" items={milestones.filter((m) => m.status === "active")} />
            <Group
              label="Planned"
              items={milestones.filter((m) => m.status === "scheduled" || m.status === "planned").sort(byStart)}
            />
            <Group label="Closed" items={milestones.filter((m) => m.status === "closed").sort(byLatestEnd)} />
          </>
        )}
      </select>
    </label>
  );
}
