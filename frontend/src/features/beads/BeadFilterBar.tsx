import { Button } from "@/components/ui/button";
import { FilterSelect } from "./FilterSelect";
import type { BeadFilters, BeadOptions } from "./filters";

const same = (value: string) => ({ value, label: value });

export function BeadFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  onChange: (next: BeadFilters) => void;
}) {
  const set = (patch: Partial<BeadFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <input
        id="bead-search"
        aria-label="Search"
        type="search"
        placeholder="Search id, title, label"
        value={filters.q}
        onChange={(event) => set({ q: event.target.value })}
        className="rounded border bg-background px-2 py-1 text-sm"
      />
      <FilterSelect label="Status" value={filters.status} options={options.statuses.map(same)} onChange={(status) => set({ status })} />
      <FilterSelect
        label="Priority"
        value={filters.priority}
        options={options.priorities.map((p) => ({ value: String(p), label: `P${p}` }))}
        onChange={(priority) => set({ priority })}
      />
      <FilterSelect label="Label" value={filters.label} options={options.labels.map(same)} onChange={(label) => set({ label })} />
      <FilterSelect label="Type" value={filters.type} options={options.types.map(same)} onChange={(type) => set({ type })} />
      <FilterSelect
        label="Assignee"
        value={filters.assignee}
        options={options.assignees.map((a) => ({ value: a, label: a === "unassigned" ? "Unassigned" : a }))}
        onChange={(assignee) => set({ assignee })}
      />
      <FilterSelect
        label="Sprint"
        value={filters.sprint}
        options={options.sprints.map(same)}
        onChange={(sprint) => set({ sprint })}
      />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={filters.closed} onChange={(event) => set({ closed: event.target.checked })} />
        Show closed
      </label>
      <Button
        variant="outline"
        size="sm"
        onClick={() => set({ q: "", status: "", priority: "", label: "", type: "", assignee: "", sprint: "" })}
      >
        Clear filters
      </Button>
    </div>
  );
}
