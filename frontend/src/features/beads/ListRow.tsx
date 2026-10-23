import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CountBadge } from "./CountBadge";
import { StateMark } from "./StateMark";
import type { TreeRow } from "./tree";
import { TypeBadge } from "./TypeBadge";

/**
 * One grid for the headings and the rows. The columns depend on the width of the list itself (a container
 * query), not of the window, because the details panel takes a share of the window: under 42rem a row is two
 * lines; from 42rem the columns title, state, type, priority and indicators; from 56rem also assignee and updated.
 */
export const COLUMNS =
  "@2xl:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.5rem_6rem] @4xl:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.5rem_6rem_7rem_8rem]";

export function ListRow({
  project,
  row,
  selected,
  tabStop,
  onToggle,
  onSelect,
}: {
  project: string;
  row: TreeRow;
  selected: boolean;
  tabStop: boolean;
  onToggle: (id: string, open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const { bead } = row;
  return (
    <li
      role="treeitem"
      aria-level={row.level + 1}
      aria-selected={selected}
      aria-expanded={row.hasKids ? row.open : undefined}
      data-id={bead.id}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onSelect(bead.id)}
      className={cn(
        "grid cursor-pointer items-center gap-x-3 gap-y-1 rounded-md border px-2 py-1.5 text-sm",
        COLUMNS,
        selected ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden" style={{ paddingLeft: `${row.level * 1.25}rem` }}>
        {row.hasKids ? (
          <button
            type="button"
            aria-label={`${row.open ? "Collapse" : "Expand"} ${bead.id}`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(bead.id, !row.open);
            }}
          >
            {row.open ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{bead.id}</span>
        <span className="min-w-0 truncate font-medium" onClick={(event) => event.stopPropagation()}>
          <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>{bead.title}</Link>
        </span>
        {bead.issue_type === "epic" && row.totalKids > 0 && (
          <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground @xl:flex">
            <span className="h-1.5 w-12 overflow-hidden rounded bg-muted">
              <span
                className="block h-full bg-foreground/60"
                style={{ width: `${(row.closedKids / row.totalKids) * 100}%` }}
              />
            </span>
            {`${row.closedKids}/${row.totalKids} closed`}
          </span>
        )}
        <span className="hidden shrink-0 items-center gap-1 @3xl:flex">
          {bead.labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 @2xl:contents @2xl:pl-0">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} className="justify-self-start" />
        <span className="text-xs text-muted-foreground">{`P${bead.priority}`}</span>
        <span className="flex items-center gap-1">
          <CountBadge kind="comments" count={bead.comment_count} />
          <CountBadge kind="dependencies" count={bead.dependency_count} />
        </span>
        <span className="hidden truncate text-muted-foreground @4xl:block">{bead.assignee ?? bead.owner ?? ""}</span>
        <span className="hidden text-xs text-muted-foreground @4xl:block">{new Date(bead.updated_at).toLocaleDateString()}</span>
      </div>
    </li>
  );
}
