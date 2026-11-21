import { Link } from "@/app/Link";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { useReturn } from "./returnState";

const VIEW_NAME: Record<string, string> = { list: "List", board: "Board", focus: "Focus", graph: "Graph" };
const enc = encodeURIComponent;

/** How many of the search, the status, priority, label, type, kind, capability, assignee and sprint filters and "Show closed" are on. */
export function activeFilters(filters: BeadFilters): number {
  const set = [
    filters.q.trim() !== "",
    filters.status.length > 0,
    filters.priority.length > 0,
    filters.label.length > 0,
    filters.type !== "",
    filters.kind !== "",
    filters.capability.length > 0,
    filters.assignee.length > 0,
    filters.sprint !== "",
    filters.closed,
  ];
  return set.filter(Boolean).length;
}

/** [project, milestone] of a remembered milestone path; null for another path or one that does not decode. */
function milestonePlace(path: string): string[] | null {
  if (!path.startsWith("/milestones/")) return null;
  try {
    return path.split("/").slice(2).map(decodeURIComponent);
  } catch {
    return null; // damaged text in storage
  }
}

export function Breadcrumb({
  project,
  id,
  parent,
}: {
  project: string;
  id: string;
  parent: string | null;
}) {
  const saved = useReturn();
  // a milestone's Beads tab is remembered as /milestones/<project>/<milestone>
  const place = milestonePlace(saved.path);
  const remembered =
    saved.search !== "" &&
    (place !== null ? place[0] === project && place.length === 2 : new URLSearchParams(saved.search).get("project") === project);
  const filters = parseFilters(remembered ? saved.search : "");
  const count = remembered ? activeFilters(filters) : 0;
  const to = !remembered
    ? `/beads?project=${enc(project)}`
    : place !== null
      ? saved.path + saved.search
      : `/beads${filtersToSearch(filters)}`;
  const first = place !== null ? (place[1] ?? "") : "Beads";
  const label = remembered
    ? `${first} › ${VIEW_NAME[filters.view] ?? "List"}${count > 0 ? ` · ${count} filter${count === 1 ? "" : "s"}` : ""}`
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
