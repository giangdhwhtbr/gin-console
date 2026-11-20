import { Button } from "@/components/ui/button";
import { VIEWS, type BeadFilters } from "./filters";

const TITLES = { list: "List", board: "Board", focus: "Focus", graph: "Graph", lanes: "Lanes" } as const;

/** `lanes`: the scope has tracks with lanes, so the Lanes tab is offered (REQ-UI-111). */
export function ViewTabs({ filters, lanes, onChange }: { filters: BeadFilters; lanes: boolean; onChange: (next: BeadFilters) => void }) {
  return (
    <nav aria-label="View" className="flex gap-2">
      {VIEWS.filter((view) => view !== "lanes" || lanes).map((view) => (
        <Button
          key={view}
          size="sm"
          variant={filters.view === view ? "default" : "outline"}
          aria-pressed={filters.view === view}
          onClick={() => onChange({ ...filters, view, select: filters.select === "none" ? "" : filters.select })}
        >
          {TITLES[view]}
        </Button>
      ))}
    </nav>
  );
}
