import type { BeadSummary } from "./api";
import type { BeadFilters } from "./filters";
import { hasChildren } from "./graph";

/** REQ-UI-106: the container the Graph and Lanes views draw: the `scope` bead when it has children and is not a milestone, else the milestone in effect, else the project (`null`). */
export function scopeOf(beads: readonly BeadSummary[], filters: BeadFilters, milestone: string): string | null {
  if (filters.scope !== "" && hasChildren(beads, filters.scope) && beads.find((b) => b.id === filters.scope)?.issue_type !== "milestone") {
    return filters.scope;
  }
  return milestone !== "all" && milestone !== "none" ? milestone : null;
}
