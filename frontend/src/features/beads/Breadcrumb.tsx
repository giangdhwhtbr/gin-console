import { Link } from "@/app/Link";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { useReturn } from "./returnState";

const VIEW_NAME: Record<string, string> = { list: "List", board: "Board", focus: "Focus", graph: "Graph" };
const enc = encodeURIComponent;

/** How many of the search, the status, priority, label, type and lane filters and "Show closed" are on. */
export function activeFilters(filters: BeadFilters): number {
  const set = [filters.q.trim(), filters.status, filters.priority, filters.label, filters.type, filters.lane];
  return set.filter((value) => value !== "").length + (filters.closed ? 1 : 0);
}

export function Breadcrumb({ project, id, parent }: { project: string; id: string; parent: string | null }) {
  const saved = useReturn();
  const remembered = saved.search !== "" && new URLSearchParams(saved.search).get("project") === project;
  const filters = parseFilters(remembered ? saved.search : "");
  const count = remembered ? activeFilters(filters) : 0;
  const to = remembered ? `/beads${filtersToSearch(filters)}` : `/beads?project=${enc(project)}`;
  const label = remembered
    ? `Beads › ${VIEW_NAME[filters.view] ?? "List"}${count > 0 ? ` · ${count} filter${count === 1 ? "" : "s"}` : ""}`
    : "Beads";
  const later = "hidden items-center gap-2 sm:flex";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <li>
          <Link to={to} className="underline underline-offset-2">
            {label}
          </Link>
        </li>
        {parent !== null && (
          <li className={later}>
            <span aria-hidden>›</span>
            <Link to={`/beads/${enc(project)}/${enc(parent)}`} className="font-mono underline underline-offset-2">
              {parent}
            </Link>
          </li>
        )}
        <li className={later}>
          <span aria-hidden>›</span>
          <span aria-current="page" className="font-mono text-foreground">
            {id}
          </span>
        </li>
      </ol>
    </nav>
  );
}
