import { Link } from "@/app/Link";
import { activeFilters, type FilterContext } from "./filterDefs";
import { filtersToSearch, parseFilters, VIEW_TITLES, type BeadFilters } from "./filters";
import { originFor, useOrigin, type Origin } from "@/app/origin";
import { cn } from "@/lib/utils";

const enc = encodeURIComponent;

/** The milestone id of a remembered milestone path (/milestones/<project>/<id>). */
function milestoneId(path: string): string {
  const raw = path.split("/")[3] ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // damaged text in storage
  }
}

/** A milestone page fixes its milestone; a Beads place counts its milestone as its page saw it, and none when it was not told (REQ-UI-072, REQ-UI-143). */
function contextOf(origin: Origin): FilterContext {
  return origin.kind === "beads" && origin.milestone !== null
    ? { fixedMilestone: false, milestone: origin.milestone.inEffect, byDefault: origin.milestone.byDefault }
    : { fixedMilestone: true, milestone: "all", byDefault: "all" };
}

const viewAndFilters = (filters: BeadFilters, context: FilterContext): string => {
  const count = activeFilters(filters, context);
  return `${VIEW_TITLES[filters.view]}${count > 0 ? `, ${count} filter${count === 1 ? "" : "s"}` : ""}`;
};

/** The first link: where the bead was opened from when that fits its project, else the project's Beads page. */
function firstLink(project: string, origin: Origin | null): { to: string; label: string } {
  if (origin === null) return { to: `/beads?project=${enc(project)}`, label: "Beads" };
  switch (origin.kind) {
    case "overview":
      return { to: origin.path, label: "Overview" };
    case "beads": {
      const filters = parseFilters(origin.search);
      return { to: `/beads${filtersToSearch(filters)}`, label: `Beads › ${viewAndFilters(filters, contextOf(origin))}` };
    }
    case "milestone": {
      const name = origin.label ?? milestoneId(origin.path);
      const tab = new URLSearchParams(origin.search).get("tab");
      return { to: origin.path + origin.search, label: tab === "beads" ? `${name} › ${viewAndFilters(parseFilters(origin.search), contextOf(origin))}` : name };
    }
    case "my-tasks":
      return { to: origin.path + origin.search, label: "My work" };
    case "reports":
      return { to: origin.path + origin.search, label: "Reports" };
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
  const named = (name: string | null, beadId: string) => ({ shown: name ?? beadId, hint: name === null ? beadId : `${name}, ${beadId}` });
  const own = named(title, id);
  const above = parent === null ? null : named(parent.title, parent.id);
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <li>
          <Link to={first.to} className="hover:text-identity">
            {first.label}
          </Link>
        </li>
        {parent !== null && above !== null && (
          <li className={later}>
            <span aria-hidden>›</span>
            <Link
              to={`/beads/${enc(project)}/${enc(parent.id)}`}
              title={above.hint}
              className={cn(TITLE, "hover:text-identity", parent.title === null && "font-mono")}
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
