import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { COUNT_PILL } from "./FilterChip";
import { FilterSelect } from "./FilterSelect";
import { FILTER_DEFS, moreCount, type FilterContext, type FilterKey } from "./filterDefs";
import { KIND_OPTIONS, type BeadFilters, type BeadOptions } from "./filters";
import { LabelMode } from "./LabelMode";
import { MultiSelectList } from "./MultiSelectList";

const same = (value: string) => ({ value, label: value });

/** REQ-UI-145: Priority, Labels, Type, Kind, and Capability and Sprint while offered, in one popover with the count of its active filters. */
export function MoreFilters({ filters, options, context, onChange }: { filters: BeadFilters; options: BeadOptions; context: FilterContext; onChange: (patch: Partial<BeadFilters>) => void }) {
  const count = moreCount(filters, context, options);
  const control = (key: FilterKey) => {
    switch (key) {
      case "priority":
        return <MultiSelectList values={filters.priority} options={options.priorities.map((p) => ({ value: String(p), label: `P${p}` }))} onChange={(priority) => onChange({ priority })} />;
      case "label":
        return (
          <>
            <LabelMode mode={filters.labelMode} onChange={(labelMode) => onChange({ labelMode })} />
            <MultiSelectList values={filters.label} options={options.labels.map(same)} onChange={(label) => onChange({ label })} />
          </>
        );
      case "type":
        return <FilterSelect label="Type" value={filters.type} options={options.types.map(same)} onChange={(type) => onChange({ type })} />;
      case "kind":
        return <FilterSelect label="Kind" value={filters.kind} options={KIND_OPTIONS} onChange={(kind) => onChange({ kind: KIND_OPTIONS.find((o) => o.value === kind)?.value ?? "" })} />;
      case "capability":
        return <MultiSelectList values={filters.capability} options={options.capabilities.map(same)} onChange={(capability) => onChange({ capability })} />;
      case "sprint":
        return <FilterSelect label="Sprint" value={filters.sprint} options={[{ value: "none", label: "No sprint" }, ...options.sprints.map(same)]} onChange={(sprint) => onChange({ sprint })} />;
      default:
        return null;
    }
  };
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={count > 0 ? `More filters ${count}` : "More filters"} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2 text-13 font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span>More filters</span>
        {count > 0 && <span className={COUNT_PILL}>{count}</span>}
        <ChevronDown aria-hidden className="size-3.5 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-50">
          <Popover.Popup aria-label="More filters" className="flex max-h-[70dvh] w-72 flex-col gap-3 overflow-y-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none">
            {FILTER_DEFS.filter((def) => def.place === "more" && def.offered(options)).map((def) => (
              <section key={def.key} data-filter={def.key} aria-label={def.label} className="flex flex-col gap-1.5">
                <h3 className="text-13 font-medium text-muted-foreground">{def.label}</h3>
                {control(def.key)}
              </section>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
