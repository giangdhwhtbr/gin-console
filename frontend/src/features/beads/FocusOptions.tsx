import type { BeadFilters } from "./filters";

export function FocusOptions({ filters, onChange }: { filters: BeadFilters; onChange: (next: BeadFilters) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-1">
        Group by
        <select
          value={filters.group}
          onChange={(event) => onChange({ ...filters, group: event.target.value === "assignee" ? "assignee" : "" })}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">None</option>
          <option value="assignee">Assignee</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={filters.finished}
          // closed beads are only loaded while "Show closed" is on
          onChange={(event) =>
            onChange({ ...filters, finished: event.target.checked, closed: event.target.checked || filters.closed })
          }
        />
        Recently finished
      </label>
    </div>
  );
}
