import { CountBadge } from "./CountBadge";
import { StateMark } from "./StateMark";
import type { TreeMode, TreeRow as Row } from "./tree";
import { TypeBadge } from "./TypeBadge";

export function TreeRow({
  row,
  mode,
  selected,
  tabStop,
  onToggle,
  onSelect,
}: {
  row: Row;
  mode: TreeMode;
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
      style={{ paddingLeft: `${row.level * 1.25}rem` }}
      className={`flex cursor-pointer flex-wrap items-center gap-2 rounded px-2 py-1 text-sm ${selected ? "border border-primary bg-muted" : "border border-transparent"}`}
    >
      {row.hasKids ? (
        <button
          type="button"
          aria-label={`${row.open ? "Collapse" : "Expand"} ${bead.id}`}
          className="w-4 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(bead.id, !row.open);
          }}
        >
          {row.open ? "▾" : "▸"}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="font-mono text-xs">{bead.id}</span>
      <span className="font-medium">{bead.title}</span>
      <StateMark bead={bead} />
      <span>{`P${bead.priority}`}</span>
      <TypeBadge type={bead.issue_type} />
      <CountBadge kind="comments" count={bead.comment_count} />
      <CountBadge kind="dependencies" count={bead.dependency_count} />
      {mode === "hierarchy" && bead.issue_type === "epic" && row.totalKids > 0 && (
        <span className="text-muted-foreground">{`${row.closedKids}/${row.totalKids} closed`}</span>
      )}
      {mode === "blocking" && row.blockers > 0 && (
        <span className="text-muted-foreground">{`blocked by ${row.blockers}`}</span>
      )}
      {row.repeated && <span className="text-xs text-muted-foreground">also above</span>}
    </li>
  );
}
