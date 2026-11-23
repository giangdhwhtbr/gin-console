import type { MilestoneOption } from "./api";
import { milestoneGroups, type MilestoneInEffect, type MilestonesState } from "./milestoneChoice";

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
    <label className="flex min-w-0 max-w-full items-center gap-1 text-13">
      Milestone
      <select
        aria-label="Milestone"
        value={state.status === "error" ? "unavailable" : value}
        disabled={disabled || state.status !== "ok"}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 max-w-full truncate rounded border bg-background px-2 py-1"
      >
        {state.status === "error" ? (
          <option value="unavailable" disabled>
            Milestones unavailable
          </option>
        ) : (
          <>
            <option value="all">All</option>
            <option value="none">No milestone</option>
            {milestoneGroups(milestones).map((g) => (
              <Group key={g.label} label={g.label} items={g.items} />
            ))}
          </>
        )}
      </select>
    </label>
  );
}
