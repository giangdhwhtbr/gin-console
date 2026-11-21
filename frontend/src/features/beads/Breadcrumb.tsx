import { Link } from "@/app/Link";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { originFor, useOrigin, type Origin } from "@/app/origin";
import { cn } from "@/lib/utils";

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

/** The milestone id of a remembered milestone path (/milestones/<project>/<id>). */
function milestoneId(path: string): string {
  const raw = path.split("/")[3] ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // damaged text in storage
  }
}

const viewAndFilters = (filters: BeadFilters): string =>
  `${VIEW_NAME[filters.view] ?? "List"}${activeFilters(filters) > 0 ? ` · ${activeFilters(filters)} filter${activeFilters(filters) === 1 ? "" : "s"}` : ""}`;

/** The first link: where the bead was opened from when that fits its project, else the project's Beads page. */
function firstLink(project: string, origin: Origin | null): { to: string; label: string } {
  if (origin === null) return { to: `/beads?project=${enc(project)}`, label: "Beads" };
  switch (origin.kind) {
    case "beads": {
      const filters = parseFilters(origin.search);
      return { to: `/beads${filtersToSearch(filters)}`, label: `Beads › ${viewAndFilters(filters)}` };
    }
    case "milestone": {
      const name = origin.label ?? milestoneId(origin.path);
      const tab = new URLSearchParams(origin.search).get("tab");
      return { to: origin.path + origin.search, label: tab === "beads" ? `${name} › ${viewAndFilters(parseFilters(origin.search))}` : name };
    }
    case "my-tasks":
      return { to: origin.path + origin.search, label: "My Tasks" };
    case "reports":
      return { to: origin.path + origin.search, label: "Reports" };
    case "projects":
      return { to: origin.path + origin.search, label: "Projects" };
  }
}

const later = "hidden items-center gap-2 sm:flex";
const TITLE = "block max-w-[16rem] truncate";

export function Breadcrumb({
  project,
  id,
  title = null,
  parent,
}: {
  project: string;
  id: string;
  title?: string | null;
  parent: { id: string; title: string | null } | null;
}) {
  const origin = originFor(project, useOrigin());
  const first = firstLink(project, origin);
  const named = (name: string | null, beadId: string) => ({ shown: name ?? beadId, hint: name === null ? beadId : `${name} · ${beadId}` });
  const own = named(title, id);
  const above = parent === null ? null : named(parent.title, parent.id);
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <li>
          <Link to={first.to} className="underline underline-offset-2">
            {first.label}
          </Link>
        </li>
        {parent !== null && above !== null && (
          <li className={later}>
            <span aria-hidden>›</span>
            <Link
              to={`/beads/${enc(project)}/${enc(parent.id)}`}
              title={above.hint}
              className={cn(TITLE, "underline underline-offset-2", parent.title === null && "font-mono")}
            >
              {above.shown}
            </Link>
          </li>
        )}
        <li className={later}>
          <span aria-hidden>›</span>
          <span aria-current="page" title={own.hint} className={cn(TITLE, "text-foreground", title === null && "font-mono")}>
            {own.shown}
          </span>
        </li>
      </ol>
    </nav>
  );
}
