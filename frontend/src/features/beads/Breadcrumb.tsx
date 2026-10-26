import { Link } from "@/app/Link";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { graphPath } from "./graph";
import { useReturn } from "./returnState";

const VIEW_NAME: Record<string, string> = { list: "List", board: "Board", focus: "Focus" };
const enc = encodeURIComponent;

/** How many of the search, the status, priority, label, type, assignee and sprint filters and "Show closed" are on. */
export function activeFilters(filters: BeadFilters): number {
  const set = [
    filters.q.trim() !== "",
    filters.status.length > 0,
    filters.priority.length > 0,
    filters.label.length > 0,
    filters.type !== "",
    filters.assignee.length > 0,
    filters.sprint !== "",
    filters.closed,
  ];
  return set.filter(Boolean).length;
}

export function Breadcrumb({
  project,
  id,
  parent,
  graph,
}: {
  project: string;
  id: string;
  parent: string | null;
  /** On the Dependencies page: the ancestors of the scope bead from the top; with it, id "" means the project page. */
  graph?: readonly string[];
}) {
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
        {graph === undefined ? (
          <>
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
          </>
        ) : (
          <>
            <li className={later}>
              <span aria-hidden>›</span>
              {id === "" ? (
                <span aria-current="page" className="text-foreground">
                  Dependencies
                </span>
              ) : (
                <Link to={graphPath(project, null)} className="underline underline-offset-2">
                  Dependencies
                </Link>
              )}
            </li>
            {id !== "" &&
              [...graph, id].map((step, i, all) => (
                <li key={step} className={later}>
                  <span aria-hidden>›</span>
                  {i === all.length - 1 ? (
                    <span aria-current="page" className="font-mono text-foreground">
                      {step}
                    </span>
                  ) : (
                    <Link to={graphPath(project, step)} className="font-mono underline underline-offset-2">
                      {step}
                    </Link>
                  )}
                </li>
              ))}
          </>
        )}
      </ol>
    </nav>
  );
}
