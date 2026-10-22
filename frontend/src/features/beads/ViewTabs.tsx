import { Button } from "@/components/ui/button";
import { VIEWS, type BeadFilters } from "./filters";

const TITLES = { list: "List", board: "Board", focus: "Focus", tree: "Tree", graph: "Graph" } as const;

export function ViewTabs({ filters, onChange }: { filters: BeadFilters; onChange: (next: BeadFilters) => void }) {
  return (
    <nav aria-label="View" className="flex gap-2">
      {VIEWS.map((view) => (
        <Button
          key={view}
          size="sm"
          variant={filters.view === view ? "default" : "outline"}
          aria-pressed={filters.view === view}
          onClick={() => onChange({ ...filters, view })}
        >
          {TITLES[view]}
        </Button>
      ))}
    </nav>
  );
}
