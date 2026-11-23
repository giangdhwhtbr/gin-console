import { Button } from "@/components/ui/button";
import { FilterChip } from "./FilterChip";
import { activeFilters, clearFilters, FILTER_DEFS, type FilterContext, type FilterDef } from "./filterDefs";
import { assigneeLabel, type BeadFilters, type BeadOptions } from "./filters";
import { MilestoneMenu } from "./MilestoneMenu";
import { milestoneValue, type MilestonesState } from "./milestoneChoice";
import { MobileFiltersSheet } from "./MobileFiltersSheet";
import { MoreFilters } from "./MoreFilters";
import { MultiSelectList } from "./MultiSelectList";

const same = (value: string) => ({ value, label: value });

/** REQ-UI-142: the search with its `/` hint, Milestone, Status and Assignee, More filters, Clear filters, then the count and Show closed; below 768px the search and Filters (REQ-UI-084). */
export function BeadFilterBar({
  filters,
  options,
  milestones,
  context,
  count,
  onChange,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  milestones: MilestonesState;
  context: FilterContext;
  /** "N of M" (REQ-UI-024); null on an epic page's tab, which shows no count. */
  count: string | null;
  onChange: (next: BeadFilters) => void;
}) {
  const set = (patch: Partial<BeadFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange(clearFilters(filters));
  const active = activeFilters(filters, context) > 0;

  const chip = (def: FilterDef) => {
    switch (def.key) {
      case "milestone": {
        const value = milestoneValue(context.milestone, milestones);
        return (
          <FilterChip key={def.key} label={def.label} values={value === null ? [] : [value]} loading={milestones.status === "loading"} onRemove={() => set({ milestone: "all" })}>
            <MilestoneMenu state={milestones} value={context.milestone} onChange={(milestone) => set({ milestone })} />
          </FilterChip>
        );
      }
      case "status":
        return (
          <FilterChip key={def.key} label={def.label} values={filters.status} onRemove={() => set(def.clear)}>
            <MultiSelectList values={filters.status} options={options.statuses.map(same)} onChange={(status) => set({ status })} />
          </FilterChip>
        );
      case "assignee":
        return (
          <FilterChip key={def.key} label={def.label} values={filters.assignee.map(assigneeLabel)} onRemove={() => set(def.clear)}>
            <MultiSelectList values={filters.assignee} options={options.assignees.map((a) => ({ value: a, label: assigneeLabel(a) }))} onChange={(assignee) => set({ assignee })} />
          </FilterChip>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 basis-full items-center gap-2 md:basis-auto md:flex-auto md:flex-wrap lg:flex-nowrap">
        <div className="relative min-w-40 flex-1 md:max-w-64">
          <input
            id="bead-search"
            aria-label="Search"
            aria-keyshortcuts="/"
            type="search"
            placeholder="Search id, title, label"
            value={filters.q}
            onChange={(event) => set({ q: event.target.value })}
            className="h-8 w-full rounded border bg-background px-2.5 text-13 md:pr-8"
          />
          <kbd aria-hidden className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-xs text-muted-foreground md:block">
            /
          </kbd>
        </div>
        <div className="md:hidden">
          <MobileFiltersSheet filters={filters} options={options} milestones={milestones} context={context} onChange={set} onClear={clear} />
        </div>
        <div className="hidden min-w-0 items-center gap-2 md:flex md:flex-wrap lg:flex-nowrap">
          {FILTER_DEFS.filter((def) => def.place === "bar" && !(def.key === "milestone" && context.fixedMilestone)).map(chip)}
          <MoreFilters filters={filters} options={options} context={context} onChange={set} />
          {active && (
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={clear}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {count !== null && <span className="text-muted-foreground">{count}</span>}
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-13">
          <input type="checkbox" role="switch" checked={filters.closed} onChange={(event) => set({ closed: event.target.checked })} />
          Show closed
        </label>
      </div>
    </div>
  );
}
