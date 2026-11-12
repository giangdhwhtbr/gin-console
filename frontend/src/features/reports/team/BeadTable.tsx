import { useState } from "react";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/Tabs";
import { cn } from "@/lib/utils";
import type { BeadStatus } from "../filters";
import { beadPath, formatDays } from "../format";
import { UNASSIGNED, type TeamBead } from "../teamApi";
import { ageOf, COLUMNS, DEFAULT_SORT, sortBeads, type Column, type Dir } from "./beadSort";
import { formatDate, WARN_DAYS } from "./format";

const PAGE = 15;
const WARN = "text-state-blocked";
const HEAD: Record<Column, string> = {
  bead: "Bead",
  epic: "Epic",
  type: "Type",
  assignee: "Assignee",
  priority: "Priority",
  status: "Status",
  age: "Age",
  progress: "In progress for",
  closed: "Closed",
  cycle: "Cycle",
  on_time: "On time",
  rework: "Rework",
};
const RIGHT: Column[] = ["age", "progress", "closed", "cycle", "rework"];
const STATUS_NAME: Record<BeadStatus, string> = { open: "open", in_progress: "in progress", closed: "closed", all: "" };

const statusChip = (status: string): { text: string; warn: boolean } => {
  if (status === "open") return { text: "Open", warn: false };
  if (status === "blocked") return { text: "Blocked", warn: true };
  if (status === "in_progress") return { text: "In progress", warn: false };
  if (status === "closed") return { text: "Closed", warn: false };
  return { text: status, warn: false };
};

function Chip({ text, warn }: { text: string; warn: boolean }) {
  return (
    <Badge variant="outline" className={cn(warn && WARN)}>
      {text}
    </Badge>
  );
}

function Cell({ column, bead, project, today }: { column: Column; bead: TeamBead; project: string; today: string }) {
  switch (column) {
    case "bead":
      return (
        <TableCell>
          <div className="flex flex-col">
            <Link to={beadPath(project, bead.id)} className="underline">
              {bead.title}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{bead.id}</span>
          </div>
        </TableCell>
      );
    case "epic":
      return (
        <TableCell className="text-sm">
          <Link to={beadPath(project, bead.epic.id)} className="underline">
            {bead.epic.title}
          </Link>
        </TableCell>
      );
    case "type":
      return <TableCell className="text-sm text-muted-foreground">{bead.issue_type}</TableCell>;
    case "assignee":
      return <TableCell className={cn("text-sm", bead.assignee === null && "text-muted-foreground")}>{bead.assignee ?? UNASSIGNED}</TableCell>;
    case "priority":
      return <TableCell className="font-mono text-sm">{bead.priority === null ? "—" : `P${bead.priority}`}</TableCell>;
    case "status":
      return (
        <TableCell>
          <Chip {...statusChip(bead.status)} />
        </TableCell>
      );
    case "age":
      return <TableCell className="text-right">{formatDays(ageOf(bead, today))}</TableCell>;
    case "progress":
      return (
        <TableCell className={cn("text-right", bead.age_days !== null && bead.age_days > WARN_DAYS && WARN)}>{formatDays(bead.age_days)}</TableCell>
      );
    case "closed":
      return <TableCell className="text-right text-sm">{bead.closed_at === null ? "—" : formatDate(bead.closed_at)}</TableCell>;
    case "cycle":
      return <TableCell className="text-right">{formatDays(bead.cycle_days)}</TableCell>;
    case "on_time": {
      const late = bead.late_days !== null && bead.late_days > 0;
      return (
        <TableCell>
          <Chip text={late ? `${bead.late_days} d late` : "On time"} warn={late} />
        </TableCell>
      );
    }
    case "rework":
      return <TableCell className="text-right">{bead.rework === null ? "—" : bead.rework}</TableCell>;
  }
}

type Sort = { status: BeadStatus; column: Column; dir: Dir };

/** The scope beads of the milestone (already limited to the member), by status, sortable, 15 rows at a time. */
export function BeadTable({
  project,
  beads,
  member,
  status,
  onStatus,
  today,
}: {
  project: string;
  beads: TeamBead[];
  member: string;
  status: BeadStatus;
  onStatus: (s: BeadStatus) => void;
  today: string;
}) {
  const [picked, setPicked] = useState<Sort | null>(null);
  const [more, setMore] = useState<{ key: string; shown: number }>({ key: "", shown: PAGE });
  const count = (bucket: TeamBead["bucket"]) => beads.filter((b) => b.bucket === bucket).length;
  const tabs = [
    { value: "open", label: `Open ${count("open")}` },
    { value: "in_progress", label: `In progress ${count("in_progress")}` },
    { value: "closed", label: `Closed ${count("closed")}` },
    { value: "all", label: `All ${beads.length}` },
  ] as const;
  const sort = picked !== null && picked.status === status ? picked : { status, ...DEFAULT_SORT[status] };
  const rows = sortBeads(status === "all" ? beads : beads.filter((b) => b.bucket === status), sort.column, sort.dir, today);
  const key = `${status}|${member}|${sort.column}|${sort.dir}`;
  const shown = more.key === key ? more.shown : PAGE;
  const columns = COLUMNS[status];
  const press = (column: Column) =>
    setPicked({ status, column, dir: sort.column === column ? (sort.dir === 1 ? -1 : 1) : 1 });
  const empty = `No ${status === "all" ? "" : `${STATUS_NAME[status]} `}beads in this milestone${member === "" ? "" : ` for ${member}`}`;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-semibold">{member === "" ? "Beads" : `Beads · ${member}`}</h2>
        <Tabs tabs={tabs} tab={status} onChange={onStatus} label="Bead status" className="border-b-0" />
      </div>
      <div role="tabpanel" id={`panel-${status}`} aria-labelledby={`tab-${status}`} className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      aria-sort={sort.column === column ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                      className={cn(RIGHT.includes(column) && "text-right")}
                    >
                      <button type="button" onClick={() => press(column)} className="font-medium">
                        {HEAD[column]}
                        {sort.column === column && <span aria-hidden>{sort.dir === 1 ? " ↑" : " ↓"}</span>}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, shown).map((bead) => (
                  <TableRow key={bead.id}>
                    {columns.map((column) => (
                      <Cell key={column} column={column} bead={bead} project={project} today={today} />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > shown && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setMore({ key, shown: shown + PAGE })}>
                Show 15 more
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
