import { Dialog } from "@base-ui/react/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { COUNT_PILL } from "./FilterChip";
import { activeFilters, FILTER_DEFS, type FilterContext, type FilterDef } from "./filterDefs";
import { assigneeLabel, KIND_OPTIONS, type BeadFilters, type BeadOptions } from "./filters";
import { LabelMode } from "./LabelMode";
import { MilestoneMenu } from "./MilestoneMenu";
import type { MilestonesState } from "./milestoneChoice";

const toggleArrayItem = (list: string[], item: string): string[] =>
  list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

function Pill({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`cursor-pointer rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

/** REQ-UI-084: below 768px every filter of `FILTER_DEFS` in one sheet; the Filters button counts the active ones. */
export function MobileFiltersSheet({
  filters,
  options,
  milestones,
  context,
  onChange,
  onClear,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  milestones: MilestonesState;
  context: FilterContext;
  onChange: (patch: Partial<BeadFilters>) => void;
  onClear: () => void;
}) {
  const activeCount = activeFilters(filters, context);

  const multi = (values: string[], items: readonly { value: string; label: string }[], set: (next: string[]) => void) => (
    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
      {items.map((item) => (
        <Pill key={item.value} selected={values.includes(item.value)} label={item.label} onClick={() => set(toggleArrayItem(values, item.value))} />
      ))}
    </div>
  );

  const single = (value: string, items: readonly { value: string; label: string }[], set: (next: string) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {[{ value: "", label: "All" }, ...items].map((item) => (
        <Pill key={item.value} selected={value === item.value} label={item.label} onClick={() => set(item.value)} />
      ))}
    </div>
  );

  const section = (def: FilterDef) => {
    switch (def.key) {
      case "milestone":
        return <MilestoneMenu state={milestones} value={context.milestone} onChange={(milestone) => onChange({ milestone })} />;
      case "status":
        return multi(filters.status, options.statuses.map((v) => ({ value: v, label: v })), (status) => onChange({ status }));
      case "assignee":
        return multi(filters.assignee, options.assignees.map((v) => ({ value: v, label: assigneeLabel(v) })), (assignee) => onChange({ assignee }));
      case "priority":
        return multi(filters.priority, options.priorities.map((p) => ({ value: String(p), label: `P${p}` })), (priority) => onChange({ priority }));
      case "label":
        return (
          <>
            <LabelMode mode={filters.labelMode} onChange={(labelMode) => onChange({ labelMode })} />
            {multi(filters.label, options.labels.map((v) => ({ value: v, label: v })), (label) => onChange({ label }))}
          </>
        );
      case "type":
        return single(filters.type, options.types.map((v) => ({ value: v, label: v })), (type) => onChange({ type }));
      case "kind":
        return single(filters.kind, KIND_OPTIONS, (kind) => onChange({ kind: KIND_OPTIONS.find((o) => o.value === kind)?.value ?? "" }));
      case "capability":
        return multi(filters.capability, options.capabilities.map((v) => ({ value: v, label: v })), (capability) => onChange({ capability }));
      case "sprint":
        return single(filters.sprint, [{ value: "none", label: "No sprint" }, ...options.sprints.map((v) => ({ value: v, label: v }))], (sprint) => onChange({ sprint }));
      default:
        return null;
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={activeCount > 0 ? `Filters ${activeCount}` : "Filters"}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        <SlidersHorizontal className="h-4 w-4 opacity-70" aria-hidden="true" />
        <span>Filters</span>
        {activeCount > 0 && <span className={COUNT_PILL}>{activeCount}</span>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl border-t bg-background p-4 shadow-xl outline-none">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <Dialog.Title className="text-base font-semibold">Filter Beads</Dialog.Title>
            <Dialog.Close aria-label="Close" className="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 text-sm">
            {FILTER_DEFS.filter((def) => def.offered(options) && !(def.key === "milestone" && context.fixedMilestone)).map((def) => (
              <div key={def.key} data-filter={def.key} role="group" aria-label={def.label}>
                <div className="mb-2 text-13 font-medium text-muted-foreground">{def.label}</div>
                {section(def)}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
            {activeCount > 0 ? (
              <button type="button" onClick={onClear} className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Clear filters
              </button>
            ) : (
              <span />
            )}
            <Dialog.Close className="cursor-pointer rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Done
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
