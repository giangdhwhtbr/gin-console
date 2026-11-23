import { useId } from "react";
import { milestoneGroups, type MilestoneInEffect, type MilestonesState } from "./milestoneChoice";

/** REQ-UI-104: All, No milestone, then the Active, Planned and Closed groups, one choice at a time. */
export function MilestoneMenu({ state, value, onChange }: { state: MilestonesState; value: MilestoneInEffect; onChange: (value: MilestoneInEffect) => void }) {
  const name = useId();
  if (state.status === "error") return <p className="p-2 text-13 text-muted-foreground">Milestones unavailable</p>;
  if (state.status === "loading") return <p className="p-2 text-13 text-muted-foreground">Loading milestones…</p>;
  const choice = (id: string, title: string) => (
    <label key={id} className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-13 hover:bg-muted">
      <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} />
      <span className="truncate" title={title}>{title}</span>
    </label>
  );
  return (
    <div role="radiogroup" aria-label="Milestone" className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
      {choice("all", "All")}
      {choice("none", "No milestone")}
      {milestoneGroups(state.data.milestones).map((group) => (
        <div key={group.label} role="group" aria-label={group.label} className="mt-1 flex flex-col gap-0.5">
          <span aria-hidden className="px-2 text-xs font-medium text-muted-foreground">{group.label}</span>
          {group.items.map((m) => choice(m.id, m.title))}
        </div>
      ))}
    </div>
  );
}
