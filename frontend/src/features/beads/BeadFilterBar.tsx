import { Button } from "@/components/ui/button";
import { FilterSelect } from "./FilterSelect";
import { LabelsPopover } from "./LabelsPopover";
import { MilestoneFilter } from "./MilestoneFilter";
import { MobileFiltersSheet } from "./MobileFiltersSheet";
import { MultiSelectPopover } from "./MultiSelectPopover";
import type { BeadFilters, BeadOptions } from "./filters";
import type { MilestoneInEffect, MilestonesState } from "./milestoneChoice";

const same = (value: string) => ({ value, label: value });

export function BeadFilterBar({
  filters,
  options,
  milestones,
  milestone,
  onChange,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  milestones: MilestonesState;
  milestone: MilestoneInEffect;
  onChange: (next: BeadFilters) => void;
}) {
  const set = (patch: Partial<BeadFilters>) => onChange({ ...filters, ...patch });

  const clearFilters = () =>
    set({
      q: "",
      status: [],
      priority: [],
      label: [],
      labelMode: "any",
      type: "",
      assignee: [],
      sprint: "",
      milestone: "",
    });

  const sprintOptions =
    options.sprints.length > 0
      ? [{ value: "none", label: "No sprint" }, ...options.sprints.map(same)]
      : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id="bead-search"
        aria-label="Search"
        type="search"
        placeholder="Search id, title, label"
        value={filters.q}
        onChange={(event) => set({ q: event.target.value })}
        className="rounded border bg-background px-2.5 py-1 text-sm h-8"
      />

      {/* Mobile view: single Filters drawer button */}
      <div className="flex md:hidden items-center gap-2">
        <MobileFiltersSheet
          filters={filters}
          options={options}
          milestones={milestones}
          milestone={milestone}
          onChange={set}
          onClear={clearFilters}
        />
      </div>

      {/* Desktop view: individual button popovers */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <MultiSelectPopover
          label="Status"
          values={filters.status}
          options={options.statuses.map(same)}
          onChange={(status) => set({ status })}
        />
        <MultiSelectPopover
          label="Priority"
          values={filters.priority}
          options={options.priorities.map((p) => ({ value: String(p), label: `P${p}` }))}
          onChange={(priority) => set({ priority })}
        />
        <LabelsPopover
          values={filters.label}
          options={options.labels.map(same)}
          mode={filters.labelMode}
          onValuesChange={(label) => set({ label })}
          onModeChange={(labelMode) => set({ labelMode })}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          options={options.types.map(same)}
          onChange={(type) => set({ type })}
        />
        <MultiSelectPopover
          label="Assignee"
          values={filters.assignee}
          options={options.assignees.map((a) => ({
            value: a,
            label: a === "unassigned" ? "Unassigned" : a,
          }))}
          onChange={(assignee) => set({ assignee })}
        />
        {options.sprints.length > 0 && (
          <FilterSelect
            label="Sprint"
            value={filters.sprint}
            options={sprintOptions}
            onChange={(sprint) => set({ sprint })}
          />
        )}
        <MilestoneFilter state={milestones} value={milestone} onChange={(value) => set({ milestone: value })} />
        <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-1 select-none">
          <input
            type="checkbox"
            checked={filters.closed}
            onChange={(event) => set({ closed: event.target.checked })}
            className="rounded border"
          />
          <span>Show closed</span>
        </label>
      </div>

      <Button variant="outline" size="sm" onClick={clearFilters} className="h-8">
        Clear filters
      </Button>
    </div>
  );
}
