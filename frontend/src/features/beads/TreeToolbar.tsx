import { Button } from "@/components/ui/button";
import type { BeadFilters } from "./filters";

export function TreeToolbar({
  filters,
  onChange,
  onExpandAll,
  onCollapseAll,
}: {
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Group</span>
      {(["hierarchy", "blocking"] as const).map((mode) => (
        <Button
          key={mode}
          size="sm"
          variant={filters.tree === mode ? "default" : "outline"}
          aria-pressed={filters.tree === mode}
          onClick={() => onChange({ ...filters, tree: mode })}
        >
          {mode === "hierarchy" ? "Hierarchy" : "Blocking"}
        </Button>
      ))}
      <Button size="sm" variant="outline" onClick={onExpandAll}>
        Expand all
      </Button>
      <Button size="sm" variant="outline" onClick={onCollapseAll}>
        Collapse all
      </Button>
    </div>
  );
}
