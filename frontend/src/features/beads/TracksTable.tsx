import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortId } from "@/lib/shortId";
import { AssigneeName } from "./AssigneeName";
import { sortTracks, type TrackRow } from "./epicOverview";
import { laneSlots } from "./laneGraph";
import { LaneChip } from "./LaneChip";
import { STATE_LABEL } from "./graph";
import { StateWord } from "./StateMark";
import type { BeadSummary } from "./api";

type Column = Exclude<keyof TrackRow, "blockedBy">;
const COLUMNS: readonly { key: Column; label: string }[] = [
  { key: "id", label: "Id" },
  { key: "title", label: "Title" },
  { key: "state", label: "State" },
  { key: "lane", label: "Lane" },
  { key: "assignee", label: "Assignee" },
  { key: "points", label: "Points" },
];

/** REQ-UI-121: the tracks of the epic, sortable by every column but Blocked by; Id, Title and State stay in view, the rest scrolls sideways. */
export function TracksTable({ project, epicId, beads, rows }: { project: string; epicId: string; beads: readonly BeadSummary[]; rows: readonly TrackRow[] }) {
  const [sort, setSort] = useState<{ column: Column; direction: "ascending" | "descending" } | null>(null);
  const slots = laneSlots(beads, epicId);
  const shown = sort === null ? rows : sortTracks(rows, sort.column, sort.direction);
  const toggle = (column: Column) =>
    setSort((s) => (s?.column === column && s.direction === "ascending" ? { column, direction: "descending" } : { column, direction: "ascending" }));
  return (
    <section aria-labelledby="overview-tracks" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="overview-tracks" className="m-0 text-base font-bold">
          Tracks
        </h2>
        <span className="text-xs text-muted-foreground">{`${rows.length} tracks, merge gates are shown in the lane rows, not here`}</span>
      </div>
      <div className="@container min-w-0 rounded-lg border bg-card">
        {/* Id, Title and State come first; below the width the columns need, the whole table scrolls sideways inside its box */}
        <Table className="min-w-[44rem]">
          <TableHeader>
            <TableRow>
              {COLUMNS.map(({ key, label }) => {
                const active = sort?.column === key ? sort.direction : undefined;
                const Icon = active === "ascending" ? ArrowUp : active === "descending" ? ArrowDown : ArrowUpDown;
                return (
                  <TableHead key={key} aria-sort={active ?? "none"}>
                    <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggle(key)}>
                      {label}
                      <Icon aria-hidden className="size-3" />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead>Blocked by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono">
                  <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(row.id)}`}>
                    <span title={row.id}>{shortId(row.id)}</span>
                  </Link>
                </TableCell>
                <TableCell className="max-w-36 min-w-28 truncate @min-[56rem]:max-w-[18rem]" title={row.title}>
                  {row.title}
                </TableCell>
                <TableCell>
                  <StateWord state={row.state} words={STATE_LABEL[row.state]} />
                </TableCell>
                <TableCell>
                  {row.lane === null ? (
                    <span className="text-muted-foreground">No lane</span>
                  ) : (
                    <span className="inline-flex max-w-28">
                      <LaneChip lane={row.lane} slot={slots.get(row.lane)} />
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <AssigneeName assignee={row.assignee} />
                </TableCell>
                <TableCell>{row.points ?? "–"}</TableCell>
                <TableCell className="max-w-40 min-w-28 whitespace-normal wrap-anywhere text-state-blocked">{row.blockedBy.length === 0 ? <span className="text-muted-foreground">–</span> : row.blockedBy.join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
