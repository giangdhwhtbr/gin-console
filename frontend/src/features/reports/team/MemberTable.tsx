import type { KeyboardEvent } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDays, formatPercent } from "../format";
import { UNASSIGNED, type MemberFigures } from "../teamApi";
import { memberColor, WARN_DAYS } from "./format";

const HEADS = ["Member", "Assigned", "Closed", "In progress", "Open", "Done", "Per week", "Median cycle", "Oldest in progress", "On time", "Rework"];
const share = (n: number, scope: number): string => `${scope === 0 ? 0 : (n / scope) * 100}%`;

/** One row per member; pressing a row selects that member, pressing the selected row selects All members. */
export function MemberTable({ members, selected, onSelect }: { members: MemberFigures[]; selected: string; onSelect: (member: string) => void }) {
  const names = members.map((m) => m.member);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Team KPI</h2>
        <span className="text-sm text-muted-foreground">Click a row to filter by that member</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map((head, i) => (
              <TableHead key={head} className={i === 0 || head === "Done" ? undefined : "text-right"}>
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isSelected = selected === m.member;
            const choose = () => onSelect(isSelected ? "" : m.member);
            const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              choose();
            };
            return (
              <TableRow
                key={m.member}
                tabIndex={0}
                aria-selected={isSelected}
                onClick={choose}
                onKeyDown={onKeyDown}
                className={cn("cursor-pointer focus-visible:outline-2 focus-visible:outline-ring", isSelected && "bg-muted")}
              >
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: memberColor(names, m.member) }} />
                    <span className={cn(m.member === UNASSIGNED && "text-muted-foreground")}>{m.member}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right">{m.scope}</TableCell>
                <TableCell className="text-right">{m.closed}</TableCell>
                <TableCell className="text-right">{m.in_progress}</TableCell>
                <TableCell className="text-right">
                  {m.open}
                  {m.blocked > 0 && <span className="ml-1 text-xs text-state-blocked">{`(${m.blocked} blocked)`}</span>}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="flex h-2 w-24 overflow-hidden rounded bg-muted">
                      <span className="bg-state-ready" style={{ width: share(m.closed, m.scope) }} />
                      <span className="bg-state-progress" style={{ width: share(m.in_progress, m.scope) }} />
                    </span>
                    <span className="text-xs">{formatPercent(m.done)}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right">{m.throughput.toFixed(1)}</TableCell>
                <TableCell className="text-right">{formatDays(m.cycle_median)}</TableCell>
                <TableCell
                  className={cn("text-right", m.oldest_in_progress !== null && m.oldest_in_progress > WARN_DAYS && "text-state-blocked")}
                >
                  {formatDays(m.oldest_in_progress)}
                </TableCell>
                <TableCell className="text-right">{formatPercent(m.on_time)}</TableCell>
                <TableCell className="text-right">{m.member === UNASSIGNED ? "—" : formatPercent(m.rework_rate)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
